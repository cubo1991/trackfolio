from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

# JSONB en Postgres (indexable con GIN, operador @> para filtrar tags), JSON plano en SQLite
# para que los tests corran sin levantar la base.
TagsColumn = JSON().with_variant(JSONB(), "postgresql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """Normaliza a UTC con zona horaria.

    Postgres devuelve los TIMESTAMPTZ con zona; SQLite los devuelve naive aunque la columna se
    declare `timezone=True`, porque no tiene tipo de fecha propio. Restar uno naive contra un
    `utcnow()` aware explota, así que todo lo que haga aritmética de fechas pasa por acá.
    """
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def utc_column() -> Column:
    """Columna de fecha con zona horaria. Por defecto SQLAlchemy usa TIMESTAMP WITHOUT TIME ZONE
    y devuelve datetimes naive: restarlos contra un `utcnow()` aware explota, y eso es
    exactamente lo que hacen las métricas y las alertas de la Fase 2."""
    return Column(DateTime(timezone=True), nullable=False)


class Role(str, Enum):
    user = "user"
    admin = "admin"


class Status(str, Enum):
    applied = "applied"
    in_process = "in_process"
    interview = "interview"
    rejected = "rejected"
    offer = "offer"


# Una postulación rechazada o con oferta ya terminó su recorrido: no tiene sentido avisar que
# "hace 40 días que no se mueve". Las alertas solo miran las que siguen vivas.
TERMINAL_STATUSES = {Status.rejected, Status.offer}


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: Role = Field(default=Role.user)
    # Días sin movimiento a partir de los cuales una postulación se marca como estancada.
    # Por usuario: quien aplica a 5 puestos por semana no tiene el mismo ritmo que quien
    # aplica a 5 por mes.
    stale_after_days: int = Field(default=14)
    # Perfil en texto libre contra el que el asistente compara una oferta. Texto y no campos
    # estructurados: una busqueda laboral no entra en un formulario, y el modelo lee prosa.
    profile: str | None = None
    created_at: datetime = Field(default_factory=utcnow, sa_column=utc_column())


class Application(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    company: str = Field(index=True)
    position: str
    applied_date: date
    status: Status = Field(default=Status.applied, index=True)
    url: str | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(TagsColumn))
    created_at: datetime = Field(default_factory=utcnow, sa_column=utc_column())
    updated_at: datetime = Field(default_factory=utcnow, sa_column=utc_column())


class StatusChange(SQLModel, table=True):
    """Historial de transiciones. Se escribe desde la Etapa 1 aunque las métricas sean Fase 2:
    lo que no se captura ahora no se puede reconstruir después."""

    id: int | None = Field(default=None, primary_key=True)
    # ON DELETE CASCADE: borrar la postulación se lleva su historial, y lo garantiza la base
    # en vez de depender de que el router se acuerde de limpiarlo.
    application_id: int = Field(foreign_key="application.id", ondelete="CASCADE", index=True)
    from_status: Status
    to_status: Status
    changed_at: datetime = Field(default_factory=utcnow, sa_column=utc_column())
