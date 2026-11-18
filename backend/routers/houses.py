from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import House, MaintenanceTicket, Technician, Tenant, User
from schemas import HouseOut, ManagerOverview, TechnicianOut, TenantOut
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

    return [
        HouseOut(
            house_id=h.house_id,
            name=h.name,
            address=h.address,
            tenant_count=tenant_counts.get(h.house_id, 0),
            open_ticket_count=open_ticket_counts.get(h.house_id, 0),
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