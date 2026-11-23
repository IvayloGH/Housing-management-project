from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import get_my_house_id
from models import House, MaintenanceTicket, Technician, User
from schemas import TicketAssign, TicketCreate, TicketOut, TicketStatus, TicketStatusUpdate
from security import require_role  # Eszter's

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# ---------- Tenant ----------

@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def report_problem(data: TicketCreate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    ticket = MaintenanceTicket(
        house_id=get_my_house_id(db, user),
        reported_by=user.user_id,
        **data.model_dump(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/house", response_model=list[TicketOut])
def my_house_tickets(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    query = (
        select(MaintenanceTicket)
        .where(MaintenanceTicket.house_id == get_my_house_id(db, user))
        .order_by(MaintenanceTicket.created_at.desc())
    )
    return db.scalars(query).all()


# ---------- Property manager ----------

def get_ticket_for_manager(db: Session, ticket_id: int, manager: User) -> MaintenanceTicket:
    """A manager may only touch tickets from houses they manage."""
    ticket = db.get(MaintenanceTicket, ticket_id)
    if ticket is None or db.get(House, ticket.house_id).manager_id != manager.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


@router.get("/manager", response_model=list[TicketOut])
def tickets_for_manager(
    ticket_status: TicketStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    query = (
        select(MaintenanceTicket)
        .join(House, House.house_id == MaintenanceTicket.house_id)
        .where(House.manager_id == user.user_id)
    )
    if ticket_status:
        query = query.where(MaintenanceTicket.status == ticket_status)
    return db.scalars(query.order_by(MaintenanceTicket.created_at.desc())).all()


@router.put("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: int,
    data: TicketAssign,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    ticket = get_ticket_for_manager(db, ticket_id, user)
    if ticket.status == "RESOLVED":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ticket is already resolved")
    if db.get(Technician, data.technician_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technician not found")

    ticket.technician_id = data.technician_id
    ticket.status = "ASSIGNED"
    db.commit()
    db.refresh(ticket)
    return ticket


# ---------- Technician ----------

@router.get("/assigned", response_model=list[TicketOut])
def my_jobs(
    ticket_status: TicketStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("technician")),
):
    query = select(MaintenanceTicket).where(MaintenanceTicket.technician_id == user.user_id)
    if ticket_status:
        query = query.where(MaintenanceTicket.status == ticket_status)
    return db.scalars(query.order_by(MaintenanceTicket.created_at.desc())).all()


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_status(
    ticket_id: int,
    data: TicketStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("technician")),
):
    ticket = db.get(MaintenanceTicket, ticket_id)
    if ticket is None or ticket.technician_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    if ticket.status == "RESOLVED":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ticket is already resolved")

    ticket.status = data.status
    db.commit()
    db.refresh(ticket)
    return ticket