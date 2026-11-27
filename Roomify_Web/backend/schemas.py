from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from datetime import date, datetime
from typing import Literal
from decimal import Decimal

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

RegisterRole = Literal["tenant", "technician", "property_manager"]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: RegisterRole = "tenant"
    # Tenants only: the address of the house they live in (= "join a house")
    street: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    room_number: str | None = Field(default=None, max_length=10)
    # Technicians only
    specialty: str | None = Field(default=None, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class FaceStatus(BaseModel):
    is_set_up: bool


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: EmailStr
    role: str

# "low" = running low, "out" = none left
GroceryStatus = Literal["low", "out"]

class GroceryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(default=1, ge=1)
    status: GroceryStatus = "low"

class GroceryStatusUpdate(BaseModel):
    status: GroceryStatus

class GroceryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_id: int
    name: str
    quantity: int
    status: GroceryStatus
    is_bought: bool

# ---------- Tickets ----------

Urgency = Literal["LOW", "MEDIUM", "HIGH"]
TicketStatus = Literal["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None
    location: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    urgency: Urgency = "MEDIUM"


class TicketOut(BaseModel):
    ticket_id: int
    house_id: int
    house_name: str
    reported_by: int
    reported_by_name: str
    technician_id: int | None
    technician_name: str | None
    title: str
    description: str | None
    location: str | None
    category: str | None
    urgency: str
    status: str
    created_at: datetime
    photo_urls: list[str] = []
    last_note: str | None = None   # newest note, e.g. what the technician did


class TicketUpdate(BaseModel):
    """Manager changes how urgent a ticket is and what kind of problem it is."""
    urgency: Urgency | None = None
    category: str | None = Field(default=None, max_length=50)


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    note_id: int
    ticket_id: int
    text: str
    created_at: datetime


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    photo_id: int
    ticket_id: int
    url: str


class TicketAssign(BaseModel):
    technician_id: int


class TicketStatusUpdate(BaseModel):
    status: Literal["IN_PROGRESS", "RESOLVED"]


class ScheduleEntry(BaseModel):
    assignment_id: int
    due_date: date
    chore_title: str
    area: str | None
    tenant_id: int
    tenant_name: str
    is_done: bool
    completed_at: datetime | None
    status: Literal["DONE", "MISSED", "PLANNED"]
    is_mine: bool

class ChoreAdd(BaseModel):
    """Tenant adds a chore for someone in the house, once or repeating until the end of that month."""
    title: str = Field(min_length=1, max_length=100)
    tenant_id: int
    first_date: date
    repeat: Literal["ONCE", "WEEKLY", "MONTHLY"] = "ONCE"


class ChorePlanResult(BaseModel):
    house_id: int
    year: int
    month: int
    created: int
    already_planned: int

    # ---------- Houses (manager) ----------

class HouseOut(BaseModel):
    house_id: int
    name: str
    address: str
    tenant_count: int
    open_ticket_count: int
    rooms: list[str] = []


class HouseSave(BaseModel):
    """Add or edit a house. Stored as name = street, address = "street, city"."""
    street: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    # The rooms of the house, e.g. ["Kitchen", "Bathroom 1"]. Left out: the rooms stay as they are.
    rooms: list[str] | None = Field(default=None, max_length=30)


class ManagerOverview(BaseModel):
    houses: int
    tenants: int
    tickets_waiting: int      # OPEN: waiting for the manager to assign
    tickets_in_progress: int  # ASSIGNED or IN_PROGRESS


class TenantOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    room_number: str | None


WeekDay = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class TechnicianOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    specialty: str | None
    # When and where they work (empty until add_technician_availability.sql is run):
    work_days: list[str] = []      # ["Mon", "Tue"]
    work_from: str | None = None   # "08:00"
    work_until: str | None = None  # "17:00"
    work_cities: list[str] = []    # ["Eindhoven", "Veldhoven"]

# ---------- Profiles ----------

class ProfileOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    role: str
    # Only filled for tenants:
    house_id: int | None = None
    house_name: str | None = None
    room_number: str | None = None
    house_rooms: list[str] = []   # the rooms the manager typed for the house
    # Only filled for technicians:
    specialty: str | None = None
    # When and where they work (empty until add_technician_availability.sql is run):
    work_days: list[str] = []      # ["Mon", "Tue"]
    work_from: str | None = None   # "08:00"
    work_until: str | None = None  # "17:00"
    work_cities: list[str] = []    # ["Eindhoven", "Veldhoven"]


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    specialty: str | None = Field(default=None, max_length=100)
    # Technicians only: when and where they work
    work_days: list[WeekDay] | None = None
    work_from: str | None = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    work_until: str | None = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    work_cities: list[str] | None = None

    @field_validator("work_days")
    @classmethod
    def days_in_week_order(cls, days):
        if days is None:
            return None
        order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return sorted(set(days), key=order.index)

    @field_validator("work_cities")
    @classmethod
    def clean_cities(cls, cities):
        if cities is None:
            return None
        result = []
        for city in cities:
            city = city.strip()
            if "," in city:
                raise ValueError("A city can't have a comma in it")
            if city and city.lower() not in [c.lower() for c in result]:
                result.append(city)
        if len(",".join(result)) > 255:
            raise ValueError("Too many cities to save")
        return result

    @model_validator(mode="after")
    def from_before_until(self):
        if self.work_from and self.work_until and self.work_from >= self.work_until:
            raise ValueError("'From' must be earlier than 'Until'")
        return self


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

# ---------- Expenses ----------

class ExpenseCreate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    spent_on: date | None = None             # default: today
    split_between: list[int] | None = None   # tenant ids; default: everyone in the house


class ShareOut(BaseModel):
    tenant_id: int
    tenant_name: str
    amount_owed: Decimal
    is_settled: bool


class ExpenseOut(BaseModel):
    expense_id: int
    description: str | None
    amount: Decimal
    spent_on: date
    paid_by: int
    paid_by_name: str
    shares: list[ShareOut]


class BalanceOut(BaseModel):
    tenant_id: int
    tenant_name: str
    is_me: bool
    balance: Decimal  # positive = others owe them, negative = they owe others


# ---------- Housemates ----------

class HousemateOut(BaseModel):
    user_id: int
    name: str
    room_number: str | None
    is_me: bool


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: int
    message: str
    is_read: bool
    created_at: datetime
