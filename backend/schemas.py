from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import Literal

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: EmailStr
    role: str

class GroceryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(default=1, ge=1)

class GroceryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_id: int
    name: str
    quantity: int
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
    model_config = ConfigDict(from_attributes=True)

    ticket_id: int
    house_id: int
    reported_by: int
    technician_id: int | None
    title: str
    description: str | None
    location: str | None
    category: str | None
    urgency: str
    status: str
    created_at: datetime


class TicketAssign(BaseModel):
    technician_id: int


class TicketStatusUpdate(BaseModel):
    status: Literal["IN_PROGRESS", "RESOLVED"]