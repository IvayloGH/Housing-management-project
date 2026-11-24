"""Test setup for the API tests.

- The real database is replaced by an in-memory SQLite database, filled with a few test users.
- security.py (Eszter's) is replaced by a tiny fake with the SAME function names,
  so the routers can be tested before her code is ready. The token is simply "test-<user_id>".
  This fake only exists inside the tests.
"""
import sys
import types
from datetime import datetime, timezone

import pytest
from fastapi import Depends, Header, HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
import models as m


# ---------- fake security.py (tests only) ----------

def fake_get_current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer test-"):
        raise HTTPException(401, "Not logged in")
    user = db.get(m.User, int(authorization.removeprefix("Bearer test-")))
    if user is None:
        raise HTTPException(401, "Not logged in")
    return user


def fake_require_role(*roles):
    def check(user: m.User = Depends(fake_get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, "Not allowed for your role")
        return user
    return check


fake_security = types.ModuleType("security")
fake_security.get_current_user = fake_get_current_user
fake_security.require_role = fake_require_role
fake_security.hash_password = lambda password: "hashed:" + password
fake_security.verify_password = lambda password, hashed: hashed == "hashed:" + password
fake_security.create_access_token = lambda user: f"test-{user.user_id}"
sys.modules["security"] = fake_security

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402
import routers.tickets  # noqa: E402


# ---------- test users ----------
MANAGER, TOM, ANA, TECH, OTHER_MANAGER, ZED = 1, 2, 3, 4, 5, 6


def seed(db: Session) -> None:
    people = [
        (MANAGER, "Mia Manager", "property_manager"),
        (TOM, "Tom Tenant", "tenant"),
        (ANA, "Ana Tenant", "tenant"),
        (TECH, "Theo Technician", "technician"),
        (OTHER_MANAGER, "Olga Manager", "property_manager"),
        (ZED, "Zed Tenant", "tenant"),
    ]
    for user_id, name, role in people:
        db.add(m.User(user_id=user_id, name=name, email=f"user{user_id}@test.nl",
                      password_hash="hashed:password123", role=role))
    db.add_all([m.PropertyManager(user_id=MANAGER), m.PropertyManager(user_id=OTHER_MANAGER)])
    db.add(m.Technician(user_id=TECH, specialty="Plumbing"))
    db.add_all([
        m.House(house_id=1, manager_id=MANAGER, name="Kerkstraat 12", address="Kerkstraat 12, Eindhoven"),
        m.House(house_id=2, manager_id=OTHER_MANAGER, name="Domplein 1", address="Domplein 1, Utrecht"),
    ])
    db.add_all([
        m.Tenant(user_id=TOM, house_id=1, room_number="01"),
        m.Tenant(user_id=ANA, house_id=1, room_number="02"),
        m.Tenant(user_id=ZED, house_id=2, room_number="01"),
    ])
    db.commit()


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def add_sql_server_functions(dbapi_connection, _record):
        # SQLite doesn't know SQL Server's SYSUTCDATETIME(), used as a default in models.py
        dbapi_connection.create_function(
            "sysutcdatetime", 0, lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        )

    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False)
    with TestSession() as db:
        seed(db)

    def test_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = test_db
    monkeypatch.setattr(routers.tickets, "UPLOAD_DIR", tmp_path)
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def as_user(user_id: int) -> dict:
    """Headers to call the API as one of the test users."""
    return {"Authorization": f"Bearer test-{user_id}"}
