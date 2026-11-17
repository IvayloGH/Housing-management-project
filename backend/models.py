from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))

class PropertyManager(Base):
    __tablename__ = "property_manager"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)


class Technician(Base):
    __tablename__ = "technician"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    specialty: Mapped[str | None] = mapped_column(String(100))


class House(Base):
    __tablename__ = "house"

    house_id: Mapped[int] = mapped_column(primary_key=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("property_manager.user_id"))
    name: Mapped[str] = mapped_column(String(100))
    address: Mapped[str] = mapped_column(String(255))


class Tenant(Base):
    __tablename__ = "tenant"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("house.house_id"))
    room_number: Mapped[str | None] = mapped_column(String(10))