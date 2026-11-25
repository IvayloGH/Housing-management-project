"""Authentication and authorization for the original Roomify FastAPI backend.

JWT Bearer (not cookie sessions). The token's password-version fingerprint
invalidates old tokens when a password changes, without adding a DB table.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Callable

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from database import get_db
from models import User

_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)
_ISSUER = "roomify-api"
_AUDIENCE = "roomify-web"


def _secret() -> str:
    secret = os.getenv("SECRET_KEY", "")
    if len(secret) < 32 or secret in {"change-me", "IDE_KERUL_A_SAJAT_TITKOS_KULCSOD"}:
        raise RuntimeError("Set SECRET_KEY to a random string of at least 32 characters in backend/.env")
    return secret


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return bool(_hasher.verify(stored_hash, password))
    except (VerificationError, InvalidHashError, TypeError, ValueError):
        return False


def _password_version(stored_hash: str) -> str:
    # HMAC prevents exposing information about the hash in the token.
    return hmac.new(_secret().encode(), stored_hash.encode(), hashlib.sha256).hexdigest()


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    if not 1 <= minutes <= 1440:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be 1..1440")
    payload = {
        "sub": str(user.user_id),
        "iss": _ISSUER,
        "aud": _AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=minutes),
        "pv": _password_version(user.password_hash),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    try:
        claims = jwt.decode(
            credentials.credentials,
            _secret(),
            algorithms=["HS256"],
            audience=_AUDIENCE,
            issuer=_ISSUER,
            options={"require": ["exp", "iat", "nbf", "sub", "pv", "iss", "aud"]},
            leeway=10,
        )
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject.isascii() or not subject.isdecimal():
            raise _unauthorized()
        user = db.get(User, int(subject))
        if user is None or not isinstance(claims.get("pv"), str):
            raise _unauthorized()
        if not hmac.compare_digest(claims["pv"], _password_version(user.password_hash)):
            raise _unauthorized()
        return user
    except (InvalidTokenError, ValueError, OverflowError, TypeError):
        raise _unauthorized() from None


def require_role(*allowed_roles: str) -> Callable:
    """FastAPI dependency: Depends(require_role('tenant')) etc."""
    def check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed for your role")
        return user
    return check
