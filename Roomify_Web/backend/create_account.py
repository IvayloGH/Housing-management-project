"""Admin tool: create manager / technician accounts, or set a user's password.

Public sign-up only creates tenants (security rule), so the first manager and every
technician are made here by someone who has the database login in backend/.env.
The password is typed in hidden (never put it on the command line) and follows the
same password policy as sign-up.

Run it from the backend folder:
    python create_account.py manager    --name "Mia de Jong" --email mia@roomify.nl
    python create_account.py technician --name "Theo de Vries" --email theo@roomify.nl --specialty "Plumbing"
    python create_account.py password   --email john@studenthousing.com
"""
import argparse
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import PropertyManager, Technician, User
from password_policy import validate_password
from security import hash_password

ROLES = {"manager": "property_manager", "technician": "technician"}


def create_account(db: Session, kind: str, name: str, email: str, password: str, specialty: str | None = None) -> User:
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise ValueError(f"There is already an account with {email}")
    user = User(name=name, email=email, password_hash=hash_password(password), role=ROLES[kind])
    db.add(user)
    db.flush()  # gives user.user_id
    if kind == "manager":
        db.add(PropertyManager(user_id=user.user_id))
    else:
        db.add(Technician(user_id=user.user_id, specialty=specialty))
    db.commit()  # user + role row together, or nothing
    return user


def set_password(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise ValueError(f"No account with {email}")
    user.password_hash = hash_password(password)  # also logs out this user's old tokens
    db.commit()
    return user


def ask_password() -> str:
    password = getpass.getpass("Password (hidden): ")
    errors = validate_password(password)
    if errors:
        raise ValueError("; ".join(errors))
    if getpass.getpass("Same password again: ") != password:
        raise ValueError("The two passwords are not the same")
    return password


def main() -> int:
    parser = argparse.ArgumentParser(description="Create Roomify manager/technician accounts or set a password.")
    sub = parser.add_subparsers(dest="command", required=True)
    for kind in ROLES:
        p = sub.add_parser(kind, help=f"create a {kind} account")
        p.add_argument("--name", required=True)
        p.add_argument("--email", required=True)
        if kind == "technician":
            p.add_argument("--specialty", help='e.g. "Plumbing, Electrical"')
    sub.add_parser("password", help="set a new password for an existing account").add_argument("--email", required=True)
    args = parser.parse_args()

    from database import SessionLocal  # only now: connects with the settings in .env

    try:
        password = ask_password()
        with SessionLocal() as db:
            if args.command == "password":
                user = set_password(db, args.email.strip(), password)
                print(f"New password saved for {user.email} ({user.role}).")
            else:
                user = create_account(db, args.command, args.name.strip(), args.email.strip(), password,
                                      getattr(args, "specialty", None))
                print(f"Created {user.role} {user.name} <{user.email}> with user_id {user.user_id}.")
    except ValueError as e:
        print("Not saved:", e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
