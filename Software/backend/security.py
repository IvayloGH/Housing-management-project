"""TEMPORARY security.py - written for the 24/11 deadline so the app can be built.

Eszter owns this file: she reviews it, changes it or replaces it. The routers only
depend on these five names, so she can rewrite the insides freely:
    hash_password, verify_password, create_access_token, get_current_user, require_role

- Passwords: hashed with Argon2 (pwdlib), never stored as plain text.
- Login tokens: signed JWTs (PyJWT). The token only holds the user id and an expiry
  time; the user (and their role) is loaded from the database on every request.
- Settings come from .env: SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Refuse to start with a missing or example secret: anyone who knows it could make tokens
if len(SECRET_KEY) < 32 or SECRET_KEY == "change-me":
    raise RuntimeError(
        "SECRET_KEY in .env is missing or too short. Make one with: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )
if ALGORITHM not in ("HS256", "HS384", "HS512"):
    raise RuntimeError("ALGORITHM in .env must be HS256, HS384 or HS512")

password_hash = PasswordHash.recommended()  # Argon2
bearer = HTTPBearer(auto_error=False)  # reads "Authorization: Bearer <token>"


# ---------- passwords ----------
def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return password_hash.verify(password, hashed)
    except Exception:  # e.g. an old test row whose password_hash isn't a real hash
        return False


# ---------- login tokens ----------
def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _not_logged_in() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not logged in or your session has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: the logged-in user, or 401."""
    if credentials is None:
        raise _not_logged_in()
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        raise _not_logged_in()

    user = db.get(User, user_id)
    if user is None:  # account was deleted after the token was made
        raise _not_logged_in()
    return user


def require_role(*roles: str):
    """Dependency: like get_current_user, but 403 unless the user has one of these roles.
    Use it as: user: User = Depends(require_role("tenant"))"""
    def check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed for your role")
        return user
    return check
