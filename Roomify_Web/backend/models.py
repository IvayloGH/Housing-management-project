from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import ForeignKey, LargeBinary, Numeric, String, Text, func
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
    # None = removed from their house by the manager. Needs Razvan's change in Azure SQL
    # (the index and foreign key have to be dropped and made again around the change):
    #   DROP INDEX [IX_tenant_house_id] ON [tenant];
    #   ALTER TABLE [tenant] DROP CONSTRAINT [FK_tenant_house];
    #   ALTER TABLE [tenant] ALTER COLUMN [house_id] int NULL;
    #   ALTER TABLE [tenant] ADD CONSTRAINT [FK_tenant_house] FOREIGN KEY ([house_id]) REFERENCES [house]([house_id]);
    #   CREATE INDEX [IX_tenant_house_id] ON [tenant]([house_id]);
    house_id: Mapped[int | None] = mapped_column(ForeignKey("house.house_id"))
    room_number: Mapped[str | None] = mapped_column(String(10))

class MaintenanceTicket(Base):
    __tablename__ = "maintenance_ticket"

    ticket_id: Mapped[int] = mapped_column(primary_key=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("house.house_id"))
    reported_by: Mapped[int] = mapped_column(ForeignKey("tenant.user_id"))
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("technician.user_id"))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(50))
    urgency: Mapped[str] = mapped_column(String(10), server_default="MEDIUM")
    status: Mapped[str] = mapped_column(String(12), server_default="OPEN")
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())


class TicketNote(Base):
    __tablename__ = "ticket_note"

    note_id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("maintenance_ticket.ticket_id"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())


class Photo(Base):
    __tablename__ = "photo"

    photo_id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("maintenance_ticket.ticket_id"))
    url: Mapped[str] = mapped_column(String(255))


class Chore(Base):
    __tablename__ = "chore"

    chore_id: Mapped[int] = mapped_column(primary_key=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("house.house_id"))
    title: Mapped[str] = mapped_column(String(100))
    area: Mapped[str | None] = mapped_column(String(50))
    frequency: Mapped[str] = mapped_column(String(10))


class ChoreAssignment(Base):
    __tablename__ = "chore_assignment"

    assignment_id: Mapped[int] = mapped_column(primary_key=True)
    chore_id: Mapped[int] = mapped_column(ForeignKey("chore.chore_id"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant.user_id"))
    due_date: Mapped[date]
    is_done: Mapped[bool] = mapped_column(server_default="0")
    completed_at: Mapped[datetime | None]


class GroceryItem(Base):
    __tablename__ = "grocery_item"

    item_id: Mapped[int] = mapped_column(primary_key=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("house.house_id"))
    name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(server_default="1")
    is_bought: Mapped[bool] = mapped_column(server_default="0")



class Expense(Base):
    __tablename__ = "expense"

    expense_id: Mapped[int] = mapped_column(primary_key=True)
    paid_by: Mapped[int] = mapped_column(ForeignKey("tenant.user_id"))
    description: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    spent_on: Mapped[date] = mapped_column("date")


class ExpenseShare(Base):
    __tablename__ = "expense_share"

    expense_id: Mapped[int] = mapped_column(ForeignKey("expense.expense_id"), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant.user_id"), primary_key=True)
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    is_settled: Mapped[bool] = mapped_column(server_default="0")


class Notification(Base):
    __tablename__ = "notification"

    notification_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))
    message: Mapped[str] = mapped_column(String(255))
    is_read: Mapped[bool] = mapped_column(server_default="0")
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())


# NEW TABLE - Razvan still has to add it to the database:
#   CREATE TABLE [face_login] (
#       [user_id]    INT            NOT NULL PRIMARY KEY REFERENCES [users]([user_id]),
#       [template]   VARBINARY(MAX) NOT NULL,  -- encrypted face template, never a photo
#       [created_at] DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
#   );
class FaceLogin(Base):
    __tablename__ = "face_login"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    template: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
