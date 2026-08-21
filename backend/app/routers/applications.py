from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select

from app.auth import CurrentUser
from app.database import get_session
from app.models import Application, Role, Status, StatusChange, utcnow
from app.schemas import ApplicationCreate, ApplicationRead, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])

SessionDep = Annotated[Session, Depends(get_session)]


def _get_owned(application_id: int, user: CurrentUser, session: Session) -> Application:
    """Devuelve la postulación si el usuario puede verla, o 404 si no.

    404 y no 403 a propósito: un 403 le confirmaría a cualquiera que ese id existe y es de
    otra persona. Para quien no es dueño, la postulación simplemente no existe.
    """
    application = session.get(Application, application_id)
    if application is None or (application.user_id != user.id and user.role is not Role.admin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Postulación no encontrada.")
    return application


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    user: CurrentUser,
    session: SessionDep,
    company: Annotated[str | None, Query(description="Coincidencia parcial, sin distinguir mayúsculas")] = None,
    status_filter: Annotated[Status | None, Query(alias="status")] = None,
    tag: Annotated[str | None, Query(description="Devuelve las que tengan este tag")] = None,
    date_from: Annotated[date | None, Query(description="Postuladas desde esta fecha")] = None,
    date_to: Annotated[date | None, Query(description="Postuladas hasta esta fecha")] = None,
) -> list[ApplicationRead]:
    """Todos los filtros son opcionales y se combinan con AND."""
    query = select(Application)

    if user.role is not Role.admin:
        query = query.where(Application.user_id == user.id)

    if company:
        # ilike y no like: buscar "acme" tiene que encontrar "ACME S.A.".
        query = query.where(Application.company.ilike(f"%{company}%"))
    if status_filter is not None:
        query = query.where(Application.status == status_filter)
    if date_from is not None:
        query = query.where(Application.applied_date >= date_from)
    if date_to is not None:
        query = query.where(Application.applied_date <= date_to)

    results = list(session.exec(query.order_by(Application.applied_date.desc())).all())

    # ponytail: el filtro por tag se hace en Python, no en SQL. En Postgres seria `tags @> '["x"]'`
    # con indice GIN, pero ese operador no existe en SQLite y la suite correria contra un dialecto
    # distinto del de produccion. Para un tracker personal (cientos de filas) la diferencia no se
    # nota; cuando se note, el reemplazo es el operador nativo con indice.
    if tag:
        results = [item for item in results if tag in item.tags]

    # El umbral es el de quien pide la lista. Para un admin mirando postulaciones ajenas eso
    # es una aproximación, pero un admin mirando el tablero de otro es un caso de soporte,
    # no el uso normal.
    now = utcnow()
    return [
        ApplicationRead.from_application(item, user.stale_after_days, now) for item in results
    ]


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate, user: CurrentUser, session: SessionDep
) -> ApplicationRead:
    application = Application(**body.model_dump(), user_id=user.id)
    session.add(application)
    session.commit()
    session.refresh(application)
    return ApplicationRead.from_application(application, user.stale_after_days)


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: int, user: CurrentUser, session: SessionDep
) -> ApplicationRead:
    application = _get_owned(application_id, user, session)
    return ApplicationRead.from_application(application, user.stale_after_days)


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int, body: ApplicationUpdate, user: CurrentUser, session: SessionDep
) -> ApplicationRead:
    application = _get_owned(application_id, user, session)
    changes = body.model_dump(exclude_unset=True)

    # El historial se escribe acá, en el único lugar por donde pasa un cambio de estado.
    if "status" in changes and changes["status"] != application.status:
        session.add(
            StatusChange(
                application_id=application.id,
                from_status=application.status,
                to_status=changes["status"],
            )
        )

    for field, value in changes.items():
        setattr(application, field, value)
    application.updated_at = utcnow()

    session.add(application)
    session.commit()
    session.refresh(application)
    return ApplicationRead.from_application(application, user.stale_after_days)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, user: CurrentUser, session: SessionDep) -> Response:
    application = _get_owned(application_id, user, session)
    session.delete(application)  # el historial se va por ON DELETE CASCADE
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
