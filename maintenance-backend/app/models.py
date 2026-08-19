import enum

from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    employee = "employee"
    admin = "admin"


class RequestStatus(str, enum.Enum):
    pending = "Pending"
    in_progress = "In Progress"
    resolved = "Resolved"
    escalated = "Escalated"  # kept as a valid state; auto-escalation logic is not implemented here


class RequestCategory(str, enum.Enum):
    it = "IT"
    facilities = "Facilities"
    infrastructure = "Infrastructure"
    other = "Other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.employee, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requests = relationship(
        "MaintenanceRequest",
        back_populates="employee",
        foreign_keys="MaintenanceRequest.employee_id",
    )


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(RequestCategory), default=RequestCategory.other, nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.pending, nullable=False)

    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship(
        "User", foreign_keys=[employee_id], back_populates="requests"
    )
    technician = relationship("User", foreign_keys=[assigned_technician_id])
