from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Tenant, User


def get_my_house_id(db: Session, user: User) -> int:
    """Find which house the logged-in tenant lives in."""
    tenant = db.get(Tenant, user.user_id)
    if tenant is None or tenant.house_id is None:  # None: the manager removed them from their house
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "You don't live in a house in Roomify right now. Ask your property manager.")
    return tenant.house_id


# Folder where uploaded ticket photos are saved (served by main.py at /uploads)
UPLOAD_DIR = Path(__file__).parent / "uploads"
