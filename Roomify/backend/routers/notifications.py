from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, User
from schemas import NotificationOut
from security import get_current_user  # Eszter's

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def my_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The bell in the top bar: my newest notifications first."""
    return db.scalars(
        select(Notification)
        .where(Notification.user_id == user.user_id)
        .order_by(Notification.notification_id.desc())
        .limit(limit)
    ).all()


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
