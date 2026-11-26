"""The rooms of a house (Kitchen, Bathroom 1, ...), typed by the manager.

They live in the house_room table (made by add_house_rooms.sql).
Until that table exists, reading gives an empty list, so the rest of the app keeps working.
"""
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from models import HouseRoom


def clean_rooms(names: list[str]) -> list[str]:
    """Trim spaces, drop empty and double names (not case sensitive), max 50 characters each."""
    rooms = []
    for name in names:
        name = name.strip()[:50]
        if name and name.lower() not in [r.lower() for r in rooms]:
            rooms.append(name)
    return rooms


def rooms_by_house(db: Session, house_ids: list[int]) -> dict[int, list[str]]:
    """{house_id: [room names in the order the manager typed them]}"""
    if not house_ids:
        return {}
    try:
        rows = db.execute(
            select(HouseRoom.house_id, HouseRoom.name)
            .where(HouseRoom.house_id.in_(house_ids))
            .order_by(HouseRoom.room_id)
        ).all()
    except DBAPIError:
        db.rollback()  # the house_room table is not made yet
        return {}
    result: dict[int, list[str]] = {}
    for house_id, name in rows:
        result.setdefault(house_id, []).append(name)
    return result


def house_rooms(db: Session, house_id: int) -> list[str]:
    return rooms_by_house(db, [house_id]).get(house_id, [])


def save_rooms(db: Session, house_id: int, names: list[str]) -> None:
    """Replace the rooms of a house. Commits."""
    try:
        db.execute(delete(HouseRoom).where(HouseRoom.house_id == house_id))
        db.add_all(HouseRoom(house_id=house_id, name=name) for name in clean_rooms(names))
        db.commit()
    except DBAPIError:
        db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "The house is saved, but rooms need a small database update first (add_house_rooms.sql).")
