from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.auth import MAX_PASSWORD_BYTES
from app.models import Role, Status


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=MAX_PASSWORD_BYTES)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    """Nunca expone hashed_password: por eso el modelo de salida es distinto de la tabla."""

    id: int
    email: EmailStr
    role: Role
    created_at: datetime


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=200)
    applied_date: date
    status: Status = Status.applied
    url: str | None = None
    notes: str | None = None
    tags: list[str] = []


class ApplicationUpdate(BaseModel):
    """Todos opcionales: es un PATCH, se aplica solo lo que viene."""

    company: str | None = Field(default=None, min_length=1, max_length=200)
    position: str | None = Field(default=None, min_length=1, max_length=200)
    applied_date: date | None = None
    status: Status | None = None
    url: str | None = None
    notes: str | None = None
    tags: list[str] | None = None


class ApplicationRead(BaseModel):
    id: int
    user_id: int
    company: str
    position: str
    applied_date: date
    status: Status
    url: str | None
    notes: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
