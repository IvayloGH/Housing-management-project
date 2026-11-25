import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import UPLOAD_DIR, get_my_house_id
from models import House, MaintenanceTicket, Photo, Technician, Tenant, TicketNote, User
from schemas import (
    NoteCreate, NoteOut, PhotoOut, TicketAssign, TicketCreate, TicketOut, TicketStatus,
    TicketStatusUpdate, TicketUpdate,
)
from services.notification_service import notify
from security import get_current_user, require_role  # Eszter's

router = APIRouter(prefix="/tickets", tags=["Tickets"])

# Photos: which file types we accept, and the biggest size (5 MB)
PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024


def ticket_out(db: Session, ticket: MaintenanceTicket) -> TicketOut:
    """One ticket + the names, photos and newest note the frontend shows next to it."""
    house = db.get(House, ticket.house_id)
    reporter = db.get(User, ticket.reported_by)
    technician = db.get(User, ticket.technician_id) if ticket.technician_id else None
    photo_urls = db.scalars(
        select(Photo.url).where(Photo.ticket_id == ticket.ticket_id).order_by(Photo.photo_id)
    ).all()
    last_note = db.scalar(
        select(TicketNote.text)
        .where(TicketNote.ticket_id == ticket.ticket_id)
        .order_by(TicketNote.note_id.desc())
        .limit(1)
    )
    return TicketOut(
        ticket_id=ticket.ticket_id,
        house_id=ticket.house_id,
        house_name=house.name,
        reported_by=ticket.reported_by,
        reported_by_name=reporter.name,
        technician_id=ticket.technician_id,
        technician_name=technician.name if technician else None,
        title=ticket.title,
        description=ticket.description,
        location=ticket.location,
        category=ticket.category,
        urgency=ticket.urgency,
        status=ticket.status,
        created_at=ticket.created_at,
        photo_urls=list(photo_urls),
        last_note=last_note,
    )


def get_ticket_i_can_see(db: Session, ticket_id: int, user: User) -> MaintenanceTicket:
    """Tenants see tickets of their house, technicians their own jobs, managers their houses."""
    ticket = db.get(MaintenanceTicket, ticket_id)
    if ticket is not None:
        if user.role == "property_manager" and db.get(House, ticket.house_id).manager_id == user.user_id:
            return ticket
        if user.role == "technician" and ticket.technician_id == user.user_id:
            return ticket
        if user.role == "tenant":
            tenant = db.get(Tenant, user.user_id)
            if tenant is not None and tenant.house_id == ticket.house_id:
                return ticket
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")


# ---------- Tenant ----------

@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def report_problem(data: TicketCreate, db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    ticket = MaintenanceTicket(
        house_id=get_my_house_id(db, user),
        reported_by=user.user_id,
        **data.model_dump(),
    )
    db.add(ticket)
    house = db.get(House, ticket.house_id)
    notify(db, house.manager_id, f"New report: {ticket.title} at {house.name}.")
    db.commit()
    db.refresh(ticket)
    return ticket_out(db, ticket)


@router.get("/house", response_model=list[TicketOut])
def my_house_tickets(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    query = (
        select(MaintenanceTicket)
        .where(MaintenanceTicket.house_id == get_my_house_id(db, user))
        .order_by(MaintenanceTicket.created_at.desc())
    )
    return [ticket_out(db, t) for t in db.scalars(query).all()]


@router.post("/{ticket_id}/photos", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
def upload_photo(
    ticket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("tenant")),
):
    """Add a photo to a ticket of your own house (jpg, png or webp, max 5 MB)."""
    ticket = get_ticket_i_can_see(db, ticket_id, user)

    extension = PHOTO_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only jpg, png or webp photos")
    content = file.file.read(MAX_PHOTO_BYTES + 1)
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "The photo is bigger than 5 MB")

    # A random file name, so nobody can guess other photos or overwrite files
    file_name = uuid.uuid4().hex + extension
    folder = UPLOAD_DIR / "tickets"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / file_name).write_bytes(content)

    photo = Photo(ticket_id=ticket.ticket_id, url=f"/uploads/tickets/{file_name}")
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


# ---------- Notes (tenants of the house, its manager, or the assigned technician) ----------

@router.get("/{ticket_id}/notes", response_model=list[NoteOut])
def list_notes(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = get_ticket_i_can_see(db, ticket_id, user)
    return db.scalars(
        select(TicketNote).where(TicketNote.ticket_id == ticket.ticket_id).order_by(TicketNote.note_id)
    ).all()


@router.post("/{ticket_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(ticket_id: int, data: NoteCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = get_ticket_i_can_see(db, ticket_id, user)
    note = TicketNote(ticket_id=ticket.ticket_id, text=data.text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


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
    tickets = db.scalars(query.order_by(MaintenanceTicket.created_at.desc())).all()
    return [ticket_out(db, t) for t in tickets]


@router.put("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("property_manager")),
):
    """Manager changes the urgency and/or category. Fields you leave out stay the same."""
    ticket = get_ticket_for_manager(db, ticket_id, user)
    if ticket.status == "RESOLVED":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ticket is already resolved")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket_out(db, ticket)


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
    house = db.get(House, ticket.house_id)
    technician = db.get(User, data.technician_id)
    notify(db, technician.user_id, f"New job: {ticket.title} at {house.name}.")
    notify(db, ticket.reported_by, f"{technician.name} will fix: {ticket.title}.")
    db.commit()
    db.refresh(ticket)
    return ticket_out(db, ticket)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def decline_ticket(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("property_manager"))):
    """'Decline report': only for reports nobody is working on yet. Its notes and photos go with it."""
    ticket = get_ticket_for_manager(db, ticket_id, user)
    if ticket.status != "OPEN":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only reports that are not assigned yet can be declined")

    notify(db, ticket.reported_by, f"Your report was declined: {ticket.title}.")
    # Azure SQL also deletes these by itself (ON DELETE CASCADE); doing it here keeps it clear
    for model in (TicketNote, Photo):
        for row in db.scalars(select(model).where(model.ticket_id == ticket.ticket_id)).all():
            db.delete(row)
    db.delete(ticket)
    db.commit()


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
    tickets = db.scalars(query.order_by(MaintenanceTicket.created_at.desc())).all()
    return [ticket_out(db, t) for t in tickets]


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
    word = "fixed" if data.status == "RESOLVED" else "started working on"
    house = db.get(House, ticket.house_id)
    notify(db, ticket.reported_by, f"{user.name} {word}: {ticket.title}.")
    notify(db, house.manager_id, f"{user.name} {word}: {ticket.title}.")
    db.commit()
    db.refresh(ticket)
    return ticket_out(db, ticket)
