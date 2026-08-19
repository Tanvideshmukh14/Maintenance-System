"""Domain value objects for this project (SmartEnum-style).

Why not plain `enum.Enum` (what this project used before): a bare
`class StatusEnum(str, enum.Enum)` makes SQLAlchemy persist the Python
*member name* by default, not its `.value`. That's invisible as long as
name == value (`employee = "employee"`), but this project has one enum
where they differ (`InProgress = "In Progress"`), which would silently
write "InProgress" to MySQL instead of the human-readable "In Progress"
the rest of the system (schema.sql, the frontend) expects.

`SmartEnum` below is a small shared base (still built on stdlib `Enum`
underneath -- there's no installed or previously-used third-party
SmartEnum package in this repo, so introducing one would be an
unverified dependency for a problem four classmethods already solve)
that adds:

  - `values()` / `from_value()` helpers so routes/tests/seed scripts
    don't need to reach into `enum` machinery directly.
  - `smart_enum_column()`, a SQLAlchemy column-type factory that pins
    `values_callable` so the column always persists `.value`, never
    `.name`. This is the part that makes it safe to map to MySQL.

Inheriting from `str` keeps FastAPI/Pydantic serialization exactly as
before: a member round-trips as its plain string value in JSON, and
`member == "Pending"` works without unwrapping `.value` first.
"""
from enum import Enum
from typing import Type

from sqlalchemy import Enum as SAEnum


class SmartEnum(str, Enum):
    @classmethod
    def values(cls) -> list[str]:
        return [member.value for member in cls]

    @classmethod
    def from_value(cls, value: str) -> "SmartEnum":
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value!r} is not a valid {cls.__name__}")

    def __str__(self) -> str:
        return self.value


class RoleEnum(SmartEnum):
    employee = "employee"
    admin = "admin"


class CategoryEnum(SmartEnum):
    IT = "IT"
    Facilities = "Facilities"
    Infrastructure = "Infrastructure"
    Other = "Other"


class PriorityEnum(SmartEnum):
    Low = "Low"
    Medium = "Medium"
    High = "High"


class StatusEnum(SmartEnum):
    Pending = "Pending"
    InProgress = "In Progress"
    Resolved = "Resolved"
    Escalated = "Escalated"


def smart_enum_column(enum_cls: Type[SmartEnum], **kwargs) -> SAEnum:
    """MySQL ENUM column type that stores `.value`, never `.name`."""
    return SAEnum(
        enum_cls,
        values_callable=lambda obj: [member.value for member in obj],
        native_enum=True,
        **kwargs,
    )
