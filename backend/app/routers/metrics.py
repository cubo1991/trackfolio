from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth import CurrentUser
from app.database import get_session
from app.models import Application, Role, StatusChange
from app.schemas import Metrics
from app.services.metrics import compute_metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=Metrics)
def read_metrics(user: CurrentUser, session: SessionDep) -> dict:
    """Métricas sobre las postulaciones propias.

    No toma los filtros del tablero a propósito: una tasa de respuesta calculada sobre un
    subconjunto filtrado se lee como si fuera la global y engaña. Si en algún momento hace falta
    segmentar, va a necesitar decir en pantalla sobre qué se calculó.
    """
    query = select(Application)
    if user.role is not Role.admin:
        query = query.where(Application.user_id == user.id)
    applications = list(session.exec(query).all())

    ids = [application.id for application in applications]
    changes = (
        list(session.exec(select(StatusChange).where(StatusChange.application_id.in_(ids))).all())
        if ids
        else []
    )

    return compute_metrics(applications, changes)
