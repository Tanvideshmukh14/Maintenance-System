from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole, RequestStatus, RequestCategory


# ---------- User / Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Optional[UserRole] = UserRole.employee


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Maintenance Requests ----------
class RequestCreate(BaseModel):
    title: str
    description: str
    category: RequestCategory = RequestCategory.other


class RequestStatusUpdate(BaseModel):
    status: RequestStatus


class RequestAssign(BaseModel):
    technician_id: int


class RequestOut(BaseModel):
    id: int
    title: str
    description: str
    category: RequestCategory
    status: RequestStatus
    employee_id: int
    assigned_technician_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
