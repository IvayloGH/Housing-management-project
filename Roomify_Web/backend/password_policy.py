"""Roomify registration and password-change password policy.

Only validate NEW passwords here. Existing passwords are verified against Argon2 hashes.
"""

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 1024


def validate_password(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    if len(password) > MAX_PASSWORD_LENGTH:
        errors.append("Password is too long")
    return errors
