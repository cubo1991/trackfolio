from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.auth import MAX_PASSWORD_BYTES
from app.models import TERMINAL_STATUSES, Application, Role, Status, as_utc, utcnow


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
    stale_after_days: int
    profile: str | None
    created_at: datetime


class UserUpdate(BaseModel):
    """Preferencias del usuario. El tope de un año no es capricho: más allá de eso el umbral
    deja de ser una alerta y esconde un valor sin sentido (o negativo, que marcaría todo)."""

    stale_after_days: int | None = Field(default=None, ge=1, le=365)
    profile: str | None = Field(default=None, max_length=4000)


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

    # Campos derivados: no están en la tabla, se calculan al leer. No se guardan porque
    # dependen del día de hoy, y un valor guardado quedaría viejo al día siguiente sin que
    # nadie toque la postulación.
    days_inactive: int
    is_stale: bool

    @classmethod
    def from_application(
        cls, application: Application, stale_after_days: int, now: datetime | None = None
    ) -> "ApplicationRead":
        """`now` es un parámetro y no `utcnow()` adentro para poder fijar el día en los tests
        sin tener que parchear el reloj."""
        now = now or utcnow()
        days_inactive = (now - as_utc(application.updated_at)).days
        return cls(
            **application.model_dump(),
            days_inactive=days_inactive,
            is_stale=(
                application.status not in TERMINAL_STATUSES
                and days_inactive >= stale_after_days
            ),
        )


class FunnelStage(BaseModel):
    stage: Status
    count: int


class Metrics(BaseModel):
    total: int
    responded: int
    response_rate: float
    #: None mientras no haya ninguna respuesta con fecha; un cero ahí sería mentira.
    median_days_to_first_response: int | None
    funnel: list[FunnelStage]


class OfferAnalysisRequest(BaseModel):
    offer_text: str = Field(min_length=40, max_length=20_000)


class ProfileDraft(BaseModel):
    """Borrador de perfil armado por IA. No se guarda solo: el usuario lo revisa y confirma
    con el PATCH a /auth/me que ya existía para el perfil escrito a mano."""

    profile: str
