from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import ChoreAssignment, Expense, ExpenseShare, House, MaintenanceTicket, Technician, Tenant, User
from services.house_rooms import house_rooms, rooms_by_house, save_rooms
from services.notification_service import notify
from schemas import HouseOut, HouseSave, ManagerOverview, TechnicianOut, TenantOut
from security import require_role  # Eszter's

router = APIRouter(prefix="/houses", tags=["Houses"])

ACTIVE_STATUSES = ("ASSIGNED", "IN_PROGRESS")


def my_houses_with_counts(db: Session, manager: User) -> list[HouseOut]:
    """All houses I manage, each with its number of tenants and open tickets."""
    houses = db.scalars(
        select(House).where(House.manager_id == manager.user_id).order_by(House.name)
    ).all()
    house_ids = [h.house_id for h in houses]

    # One query per count, grouped by house: {house_id: count}
    tenant_counts = dict(db.execute(
        select(Tenant.house_id, func.count())
        .where(Tenant.house_id.in_(house_ids))
        .group_by(Tenant.house_id)
    ).all())
    open_ticket_counts = dict(db.execute(
        select(MaintenanceTicket.house_id, func.count())
        .where(MaintenanceTicket.house_id.in_(house_ids))
        .where(MaintenanceTicket.status != "RESOLVED")
        .group_by(MaintenanceTicket.house_id)
    ).all())
    rooms = rooms_by_house(db, house_ids)

    return [
        HouseOut(
            house_id=h.house_id,
            name=h.name,
            address=h.address,
            tenant_count=tenant_counts.get(h.house_id, 0),
            open_ticket_count=open_ticket_counts.get(h.house_id, 0),
            rooms=rooms.get(h.house_id, []),
        )
        for h in houses
    ]


@router.get("", response_model=list[HouseOut])
def list_my_houses(db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    return my_houses_with_counts(db, user)


@router.get("/overview", response_model=ManagerOverview)
def overview(db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    """The number cards at the top of Manager · Overview."""
    houses = my_houses_with_counts(db, user)
    house_ids = [h.house_id for h in houses]

    def count_tickets(*statuses: str) -> int:
        return db.scalar(
            select(func.count())
            .select_from(MaintenanceTicket)
            .where(MaintenanceTicket.house_id.in_(house_ids))
            .where(MaintenanceTicket.status.in_(statuses))
        )

    return ManagerOverview(
        houses=len(houses),
        tenants=sum(h.tenant_count for h in houses),
        tickets_waiting=count_tickets("OPEN"),
        tickets_in_progress=count_tickets(*ACTIVE_STATUSES),
    )


@router.get("/team", response_model=list[TechnicianOut])
def team(db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    """All technicians (the Team list, and the dropdown when assigning a ticket)."""
    rows = db.execute(
        select(User, Technician)
        .join(Technician, Technician.user_id == User.user_id)
        .order_by(User.name)
    ).all()
    return [
        TechnicianOut(user_id=u.user_id, name=u.name, email=u.email, specialty=t.specialty)
        for u, t in rows
    ]


@router.get("/{house_id}/tenants", response_model=list[TenantOut])
def house_tenants(house_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    """Who lives in one of my houses."""
    house = db.get(House, house_id)
    if house is None or house.manager_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "House not found")

    rows = db.execute(
        select(User, Tenant)
        .join(Tenant, Tenant.user_id == User.user_id)
        .where(Tenant.house_id == house_id)
        .order_by(Tenant.room_number)
    ).all()
    return [
        TenantOut(user_id=u.user_id, name=u.name, email=u.email, room_number=t.room_number)
        for u, t in rows
    ]


@router.delete("/{house_id}/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tenant(
    house_id: int,
    tenant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    """Manager: remove a tenant from one of my houses (the red cross on 'Edit house').

    The account stays, and so do their old reports and payments (house history).
    They just no longer live in this house: no chores, groceries or repairs here any more."""
    house = db.get(House, house_id)
    if house is None or house.manager_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "House not found")
    tenant = db.get(Tenant, tenant_id)
    if tenant is None or tenant.house_id != house_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This person doesn't live in this house")

    # Balances are worked out per house: open payments would disappear for the housemates
    open_payments = db.scalar(
        select(func.count())
        .select_from(ExpenseShare)
        .join(Expense, Expense.expense_id == ExpenseShare.expense_id)
        .where(ExpenseShare.is_settled == False)  # noqa: E712
        .where(or_(ExpenseShare.tenant_id == tenant_id, Expense.paid_by == tenant_id))
    )
    name = db.get(User, tenant_id).name
    if open_payments:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"{name} still has open payments with housemates. They need to settle them first.")

    # Their chores from today on go away; the rotation carries on with the others
    db.execute(
        delete(ChoreAssignment)
        .where(ChoreAssignment.tenant_id == tenant_id)
        .where(ChoreAssignment.is_done == False)  # noqa: E712
        .where(ChoreAssignment.due_date >= date.today())
    )
    tenant.house_id = None
    tenant.room_number = None
    notify(db, tenant_id, f"You were removed from {house.name} by your property manager.")
    try:
        db.commit()
    except IntegrityError:
        # The database still says every tenant must have a house (Razvan's one-line change is missing)
        db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "Removing tenants needs a small database update first. Ask Razvan.")


def house_out(db: Session, house: House) -> HouseOut:
    tenants = db.scalar(select(func.count()).select_from(Tenant).where(Tenant.house_id == house.house_id))
    open_tickets = db.scalar(
        select(func.count())
        .select_from(MaintenanceTicket)
        .where(MaintenanceTicket.house_id == house.house_id, MaintenanceTicket.status != "RESOLVED")
    )
    return HouseOut(
        house_id=house.house_id, name=house.name, address=house.address,
        tenant_count=tenants, open_ticket_count=open_tickets,
        rooms=house_rooms(db, house.house_id),
    )


@router.post("", response_model=HouseOut, status_code=status.HTTP_201_CREATED)
def add_house(data: HouseSave, db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    street, city = data.street.strip(), data.city.strip()
    house = House(manager_id=user.user_id, name=street, address=f"{street}, {city}")
    db.add(house)
    db.commit()
    db.refresh(house)
    if data.rooms is not None:
        save_rooms(db, house.house_id, data.rooms)
    return house_out(db, house)


@router.put("/{house_id}", response_model=HouseOut)
def edit_house(
    house_id: int,
    data: HouseSave,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    house = db.get(House, house_id)
    if house is None or house.manager_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "House not found")
    street, city = data.street.strip(), data.city.strip()
    house.name = street
    house.address = f"{street}, {city}"
    db.commit()
    db.refresh(house)
    if data.rooms is not None:
        save_rooms(db, house.house_id, data.rooms)
    return house_out(db, house)
