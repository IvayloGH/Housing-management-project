from calendar import monthrange
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import get_my_house_id
from models import Chore, ChoreAssignment, User
from schemas import ScheduleEntry
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