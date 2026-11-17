from pydantic import BaseModel, ConfigDict, EmailStr, Field

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