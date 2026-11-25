from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import House, PropertyManager, Technician, Tenant, User
from schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from security import create_access_token, get_current_user, hash_password, verify_password
from password_policy import validate_password
from login_limit import check_login_limit, register_login_failure, clear_login_failures

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Sign in button: check email + password, return a token."""
    # IP + email throttle; IP is taken from the connection, never a user-supplied header.
    identifier = f"{request.client.host if request.client else 'unknown'}:{data.email.lower()}"
    check_login_limit(identifier)
    user = db.scalar(select(User).where(User.email == data.email))

    if user is None or not verify_password(data.password, user.password_hash):
        register_login_failure(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    clear_login_failures(identifier)
    return TokenResponse(access_token=create_access_token(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Called right after login so the frontend knows the user's role."""
    return current_user


def find_house(db: Session, street: str, city: str) -> House:
    """'Join a house': the house whose address is "<street>, <city>" (not case sensitive)."""
    address = f"{street.strip()}, {city.strip()}".lower()
    house = db.scalar(select(House).where(func.lower(House.address) == address))
    if house is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't find a house at this address. Check it with your property manager.",
        )
    return house


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Create an account and log in straight away. Tenants join their house by its address."""
    # Security: public registration cannot grant privileged roles.
    # Managers and technicians must be provisioned by a trusted administrator.
    if data.role != "tenant":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only tenant self-registration is available")

    password_errors = validate_password(data.password)
    if password_errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, password_errors)

    if db.scalar(select(User).where(User.email == data.email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "There is already an account with this email")

    house = None
    if data.role == "tenant":
        if not data.street or not data.city:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tenants need the street and city of their house")
        house = find_house(db, data.street, data.city)

    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    db.flush()  # now user.user_id exists, but nothing is saved yet

    # Every role also has a row in its own table
    if data.role == "tenant":
        db.add(Tenant(user_id=user.user_id, house_id=house.house_id, room_number=data.room_number))
    elif data.role == "technician":
        db.add(Technician(user_id=user.user_id, specialty=data.specialty))
    else:
        db.add(PropertyManager(user_id=user.user_id))

    db.commit()  # user + role row are saved together, or nothing is
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user))
