from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict

from app.enums import RoleEnum, CategoryEnum, PriorityEnum, StatusEnum


# ---------- Auth / Users ----------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    department: Optional[str] = None
    role: RoleEnum = RoleEnum.employee


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    department: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Maintenance requests ----------

class RequestCreate(BaseModel):
    title: str
    description: str
    category: CategoryEnum = CategoryEnum.Other
    priority: PriorityEnum = PriorityEnum.Medium


class RequestUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    assigned_to: Optional[int] = None
    priority: Optional[PriorityEnum] = None


class EscalationCreate(BaseModel):
    reason: str
    escalated_to: Optional[str] = None


class EscalationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reason: str
    escalated_from: Optional[str] = None
    escalated_to: Optional[str] = None
    escalated_at: datetime


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: CategoryEnum
    priority: PriorityEnum
    status: StatusEnum
    employee_id: int
    assigned_to: Optional[int] = None
    escalation_level: int
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    assignee_name: Optional[str] = None
    logs: List[EscalationLogOut] = []
