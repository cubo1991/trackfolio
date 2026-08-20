from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.auth import CurrentUser
from app.database import get_session
from app.models import Application, Role, StatusChange, utcnow
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
def list_applications(user: CurrentUser, session: SessionDep) -> list[Application]:
    query = select(Application)
    if user.role is not Role.admin:
        query = query.where(Application.user_id == user.id)
    return list(session.exec(query.order_by(Application.applied_date.desc())).all())


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate, user: CurrentUser, session: SessionDep
) -> Application:
    application = Application(**body.model_dump(), user_id=user.id)
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int, user: CurrentUser, session: SessionDep) -> Application:
    return _get_owned(application_id, user, session)


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int, body: ApplicationUpdate, user: CurrentUser, session: SessionDep
) -> Application:
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
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, user: CurrentUser, session: SessionDep) -> Response:
    application = _get_owned(application_id, user, session)
    session.delete(application)  # el historial se va por ON DELETE CASCADE
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
