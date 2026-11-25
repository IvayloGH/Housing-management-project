"""Face login: set it up on your profile, then log in with only your face.

- The face AI is Manuel's, in ai/face_recognition.py. This file uses two of his functions:
    get_embedding(image_bytes) -> list[float] | None   (None = no clear face in the photo)
    is_same_person(a, b) -> bool                        (compares two saved embeddings)
- The encryption of the saved face template is Eszter's: face_crypto.py.
While one of them can't run (not installed / not written yet), every face endpoint answers
503 "Face login is not available yet". Password login always keeps working.

Face only (no email): the camera photo is compared with the saved face of every user who
turned face login on. It only logs you in when exactly one person matches.
"""
from contextlib import contextmanager
from typing import Callable, TypeVar

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

import face_crypto  # Eszter's
from database import get_db
from login_limit import check_login_limit, clear_login_failures, register_login_failure  # Eszter's
from models import FaceLogin, User
from schemas import FaceStatus, TokenResponse
from security import create_access_token, get_current_user  # Eszter's

router = APIRouter(prefix="/auth/face", tags=["Face login"])

PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024

T = TypeVar("T")


def not_available() -> HTTPException:
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                         "Face login is not available yet. Please log in with your password.")


def ready(step: Callable[..., T], *args) -> T:
    """Run a step from Eszter's file; 503 while it isn't written yet."""
    try:
        return step(*args)
    except NotImplementedError:
        raise not_available()


@contextmanager
def face_table(db: Session):
    """The face_login table is new. Until Razvan creates it in Azure SQL, answer 503 instead of crashing."""
    try:
        yield
    except DBAPIError:
        db.rollback()
        raise not_available()


def read_photo(file: UploadFile) -> bytes:
    if file.content_type not in PHOTO_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The photo must be a JPG, PNG or WebP image")
    photo = file.file.read(MAX_PHOTO_BYTES + 1)
    if not photo or len(photo) > MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The photo must be smaller than 5 MB")
    return photo


def manuels_ai():
    """Manuel's functions. Loaded only when needed, so the rest of the app runs without torch."""
    try:
        from ai.face_recognition import get_embedding, is_same_person
    except ImportError:  # not installed, or the function isn't there yet
        raise not_available()
    return get_embedding, is_same_person


def face_from_photo(photo: bytes) -> list[float]:
    """The numbers that describe the face in the photo (Manuel's AI)."""
    get_embedding, _ = manuels_ai()
    try:
        template = get_embedding(photo)
    except (OSError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "We couldn't read this photo")
    if template is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "We couldn't see a clear face. Look straight at the camera in good light.")
    return template


def matching_users(db: Session, template: list[float], skip_user_id: int | None = None) -> list[int]:
    """user_ids whose saved face is the same person as this template (Manuel's AI decides)."""
    _, is_same_person = manuels_ai()
    matches = []
    for row in db.scalars(select(FaceLogin)).all():
        if row.user_id == skip_user_id:
            continue
        saved = ready(face_crypto.decrypt_template, row.template)
        if is_same_person(template, saved):
            matches.append(row.user_id)
    return matches


@router.get("", response_model=FaceStatus)
def face_status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Profile page: is face login on for me?"""
    with face_table(db):
        return FaceStatus(is_set_up=db.get(FaceLogin, user.user_id) is not None)


@router.post("/setup", status_code=status.HTTP_204_NO_CONTENT)
def set_up_face(
    file: UploadFile = File(...),
    consent: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """'Save my face': store an encrypted template of my face (never the photo itself).
    Doing it again replaces the old one."""
    if not consent:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please agree to storing your face template first")
    template = face_from_photo(read_photo(file))

    with face_table(db):
        # Face-only login must always point to one person
        if matching_users(db, template, skip_user_id=user.user_id):
            raise HTTPException(status.HTTP_409_CONFLICT, "This face is already used for face login on another account")

        encrypted = ready(face_crypto.encrypt_template, template)
        row = db.get(FaceLogin, user.user_id)
        if row is None:
            db.add(FaceLogin(user_id=user.user_id, template=encrypted))
        else:
            row.template = encrypted
        db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def turn_off_face(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Turn face login off: my face template is deleted."""
    with face_table(db):
        row = db.get(FaceLogin, user.user_id)
        if row is not None:
            db.delete(row)
            db.commit()


@router.post("/login", response_model=TokenResponse)
def face_login(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Log in with only a camera photo. Same token as a password login."""
    # Same throttle as password login (Eszter's): 5 wrong tries per 15 minutes per address
    identifier = f"face:{request.client.host if request.client else 'unknown'}"
    check_login_limit(identifier)

    template = face_from_photo(read_photo(file))
    with face_table(db):
        matches = matching_users(db, template)
    if len(matches) != 1:  # nobody, or more than one person: never guess
        register_login_failure(identifier)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "We didn't recognise your face. Try again or use your password.")

    clear_login_failures(identifier)
    return TokenResponse(access_token=create_access_token(db.get(User, matches[0])))
