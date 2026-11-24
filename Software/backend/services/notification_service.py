"""Small helper to leave a message in someone's notification list."""
from sqlalchemy.orm import Session

from models import Notification


def notify(db: Session, user_id: int | None, message: str) -> None:
    """Adds a notification. Does NOT commit: the caller commits it together with its own change."""
    if user_id is None:
        return
    db.add(Notification(user_id=user_id, message=message[:255]))
