from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Tenant, User


def get_my_house_id(db: Session, user: User) -> int:
    """Find which house the logged-in tenant lives in."""
    tenant = db.get(Tenant, user.user_id)
    if tenant is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a tenant of any house")
    return tenant.house_id