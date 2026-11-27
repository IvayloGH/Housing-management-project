"""When and where a technician works: days, hours and cities.

They live in 4 columns of the technician table (made by add_technician_availability.sql).
Until those columns exist, reading gives "nothing set" and saving answers 503,
so the rest of the app keeps working.
Stored as text: work_days "Mon,Tue", work_cities "Eindhoven,Veldhoven", work_from/work_until "08:00".
"""
from fastapi import HTTPException, status
from sqlalchemy import inspect
from sqlalchemy.orm import Session, undefer

from models import Technician

AVAILABILITY_FIELDS = ("work_days", "work_from", "work_until", "work_cities")

_columns_ready = False


def availability_ready(db: Session) -> bool:
    """Do the work_* columns exist yet? Once they do, we stop checking."""
    global _columns_ready
    if not _columns_ready:
        columns = {c["name"].lower() for c in inspect(db.connection()).get_columns("technician")}
        _columns_ready = all(name in columns for name in AVAILABILITY_FIELDS)
    return _columns_ready


def undefer_availability(db: Session) -> list:
    """Query options that also load the work_* columns (empty when they don't exist yet)."""
    if not availability_ready(db):
        return []
    return [undefer(getattr(Technician, name)) for name in AVAILABILITY_FIELDS]


def split_list(text: str | None) -> list[str]:
    return [part for part in (text or "").split(",") if part]


def availability_of(technician: Technician, ready: bool) -> dict:
    """The work_* fields for ProfileOut / TechnicianOut."""
    if not ready:
        return {}
    return {
        "work_days": split_list(technician.work_days),
        "work_from": technician.work_from,
        "work_until": technician.work_until,
        "work_cities": split_list(technician.work_cities),
    }


def save_availability(db: Session, technician: Technician, changes: dict) -> None:
    """Copy the work_* fields that were sent onto the technician (no commit)."""
    sent = {name: changes[name] for name in AVAILABILITY_FIELDS if name in changes}
    if not sent:
        return
    if not availability_ready(db):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "Saving your working days, hours and cities needs a small database update first "
                            "(add_technician_availability.sql).")
    for name, value in sent.items():
        if isinstance(value, list):
            value = ",".join(value) or None
        setattr(technician, name, value)
