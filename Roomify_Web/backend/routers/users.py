from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import House, Technician, Tenant, User
from deps import get_my_house_id
from services.house_rooms import house_rooms
from schemas import HousemateOut, PasswordChange, ProfileOut, ProfileUpdate
from security import get_current_user, hash_password, require_role, verify_password
from password_policy import validate_password

router = APIRouter(prefix="/users", tags=["Users"])


def build_profile(db: Session, user: User) -> ProfileOut:
    """Basic user info + the extra fields that belong to their role."""
    profile = ProfileOut(user_id=user.user_id, name=user.name, email=user.email, role=user.role)

    if user.role == "tenant":
        tenant = db.get(Tenant, user.user_id)
        if tenant is not None and tenant.house_id is not None:  # None: removed from their house
            house = db.get(House, tenant.house_id)
            profile.house_id = house.house_id
            profile.house_name = house.name
            profile.room_number = tenant.room_number
            profile.house_rooms = house_rooms(db, house.house_id)

    elif user.role == "technician":
        technician = db.get(Technician, user.user_id)
        if technician is not None:
            profile.specialty = technician.specialty

    return profile


@router.get("/me", response_model=ProfileOut)
def my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_profile(db, user)


@router.put("/me", response_model=ProfileOut)
def update_my_profile(data: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changes = data.model_dump(exclude_unset=True)

    if changes.get("name") is not None:
        user.name = changes["name"]

    if changes.get("email") is not None and changes["email"] != user.email:
        taken = db.scalar(select(User).where(User.email == changes["email"], User.user_id != user.user_id))
        if taken is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "This email is already in use")
        user.email = changes["email"]

    if "specialty" in changes:
        if user.role != "technician":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only technicians have a specialty")
        db.get(Technician, user.user_id).specialty = changes["specialty"]

    db.commit()
    db.refresh(user)
    return build_profile(db, user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(data: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    if data.current_password == data.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a different new password")
    problems = validate_password(data.new_password)
    if problems:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problems)

    user.password_hash = hash_password(data.new_password)
    db.commit()


@router.get("/housemates", response_model=list[HousemateOut])
def my_housemates(db: Session = Depends(get_db), user: User = Depends(require_role("tenant"))):
    """Everyone in my house (for 'Who does it?' when adding a chore)."""
    rows = db.execute(
        select(User, Tenant)
        .join(Tenant, Tenant.user_id == User.user_id)
        .where(Tenant.house_id == get_my_house_id(db, user))
        .order_by(User.name)
    ).all()
    return [
        HousemateOut(user_id=u.user_id, name=u.name, room_number=t.room_number, is_me=(u.user_id == user.user_id))
        for u, t in rows
    ]
