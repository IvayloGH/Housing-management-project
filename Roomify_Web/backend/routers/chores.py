from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import get_my_house_id
from models import Chore, ChoreAssignment, House, Tenant, User
from schemas import ChoreAdd, ChorePlanResult, ScheduleEntry
from services.chore_service import plan_month
from security import require_role  # Eszter's

router = APIRouter(prefix="/chores", tags=["Chores"])


def to_entry(assignment: ChoreAssignment, chore: Chore, tenant: User, me: User) -> ScheduleEntry:
    """Combine one assignment + its chore + its tenant into one schedule row."""
    if assignment.is_done:
        entry_status = "DONE"
    elif assignment.due_date < date.today():
        entry_status = "MISSED"
    else:
        entry_status = "PLANNED"

    return ScheduleEntry(
        assignment_id=assignment.assignment_id,
        due_date=assignment.due_date,
        chore_title=chore.title,
        area=chore.area,
        tenant_id=tenant.user_id,
        tenant_name=tenant.name,
        is_done=assignment.is_done,
        completed_at=assignment.completed_at,
        status=entry_status,
        is_mine=(tenant.user_id == me.user_id),
    )


def assignments_with_details():
    """Base query: assignment + chore + tenant, joined together."""
    return (
        select(ChoreAssignment, Chore, User)
        .join(Chore, Chore.chore_id == ChoreAssignment.chore_id)
        .join(User, User.user_id == ChoreAssignment.tenant_id)
    )


@router.get("/schedule", response_model=list[ScheduleEntry])
def month_schedule(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("tenant")),
):
    """Everyone's chores in my house for one month (default: this month)."""
    today = date.today()
    year = year or today.year
    month = month or today.month
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    query = (
        assignments_with_details()
        .where(Chore.house_id == get_my_house_id(db, user))
        .where(ChoreAssignment.due_date.between(first_day, last_day))
        .order_by(ChoreAssignment.due_date, Chore.title)
    )
    return [to_entry(a, c, t, user) for a, c, t in db.execute(query).all()]


@router.get("/mine", response_model=list[ScheduleEntry])
def my_open_chores(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("tenant")),
):
    """My chores that are not done yet, soonest first (the 'Your chores' box on Home)."""
    query = (
        assignments_with_details()
        .where(ChoreAssignment.tenant_id == user.user_id)
        .where(ChoreAssignment.is_done == False)  # noqa: E712
        .order_by(ChoreAssignment.due_date)
        .limit(limit)
    )
    return [to_entry(a, c, t, user) for a, c, t in db.execute(query).all()]


@router.put("/assignments/{assignment_id}/done", response_model=ScheduleEntry)
def mark_done(assignment_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """The 'Mark as done' button. Only works on your own chores."""
    assignment = db.get(ChoreAssignment, assignment_id)
    if assignment is None or assignment.tenant_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chore not found")
    if assignment.is_done:
        raise HTTPException(status.HTTP_409_CONFLICT, "Chore is already done")

    assignment.is_done = True
    assignment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(assignment)
    return to_entry(assignment, db.get(Chore, assignment.chore_id), user, user)

@router.post("/houses/{house_id}/plan", response_model=ChorePlanResult, status_code=status.HTTP_201_CREATED)
def plan_house_month(
    house_id: int,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    """Manager: plan who does which chore in one of my houses for one month.
    Safe to call twice: chores that are already planned are skipped."""
    house = db.get(House, house_id)
    if house is None or house.manager_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "House not found")

    chores = db.execute(select(Chore.chore_id, Chore.frequency).where(Chore.house_id == house_id)).all()
    tenant_ids = db.scalars(select(Tenant.user_id).where(Tenant.house_id == house_id)).all()
    if not chores:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This house has no chores yet")
    if not tenant_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This house has no tenants yet")

    # the rotation rule lives in the service
    plan = plan_month(year, month, [tuple(c) for c in chores], list(tenant_ids))

    # what is already planned this month, so we never add a chore twice
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    existing = set(db.execute(
        select(ChoreAssignment.chore_id, ChoreAssignment.due_date)
        .where(ChoreAssignment.chore_id.in_([c.chore_id for c in chores]))
        .where(ChoreAssignment.due_date.between(first_day, last_day))
    ).all())

    today = date.today()
    new_rows = [
        ChoreAssignment(chore_id=p.chore_id, tenant_id=p.tenant_id, due_date=p.due_date)
        for p in plan
        if (p.chore_id, p.due_date) not in existing and p.due_date >= today
    ]
    db.add_all(new_rows)
    db.commit()

    return ChorePlanResult(
        house_id=house_id,
        year=year,
        month=month,
        created=len(new_rows),
        already_planned=sum(1 for p in plan if (p.chore_id, p.due_date) in existing),
    )


# How a repeat choice on the 'Add a chore' form is saved as the chore's frequency
REPEAT_TO_FREQUENCY = {"ONCE": "MONTHLY", "WEEKLY": "WEEKLY", "BIWEEKLY": "BIWEEKLY"}
REPEAT_STEP_DAYS = {"ONCE": None, "WEEKLY": 7, "BIWEEKLY": 14}


@router.post("/assignments", response_model=list[ScheduleEntry], status_code=status.HTTP_201_CREATED)
def add_chore(data: ChoreAdd, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """'Add a chore': someone in my house does it on a day, and maybe every 1 or 2 weeks
    until the end of that month."""
    house_id = get_my_house_id(db, user)
    tenant = db.get(Tenant, data.tenant_id)
    if tenant is None or tenant.house_id != house_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can only give chores to people in your house")
    if data.first_date < date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick today or a day in the future")

    # Use the house's chore with this name, or make a new one
    title = data.title.strip()
    chore = db.scalar(select(Chore).where(Chore.house_id == house_id, Chore.title == title))
    if chore is None:
        chore = Chore(house_id=house_id, title=title, frequency=REPEAT_TO_FREQUENCY[data.repeat])
        db.add(chore)
        db.flush()

    # Which days: the first day, then every 7 or 14 days in the same month
    days = [data.first_date]
    step = REPEAT_STEP_DAYS[data.repeat]
    while step and (days[-1] + timedelta(days=step)).month == data.first_date.month:
        days.append(days[-1] + timedelta(days=step))

    already = set(db.scalars(
        select(ChoreAssignment.due_date)
        .where(ChoreAssignment.chore_id == chore.chore_id, ChoreAssignment.due_date.in_(days))
    ).all())
    new_rows = [
        ChoreAssignment(chore_id=chore.chore_id, tenant_id=data.tenant_id, due_date=d)
        for d in days if d not in already
    ]
    if not new_rows:
        raise HTTPException(status.HTTP_409_CONFLICT, "This chore is already planned on that day")
    db.add_all(new_rows)
    db.commit()

    doer = db.get(User, data.tenant_id)
    return [to_entry(a, chore, doer, user) for a in new_rows]
