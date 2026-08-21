from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import CurrentUser, create_access_token, hash_password, verify_password
from app.database import get_session
from app.models import User
from app.schemas import Credentials, Token, UserRead, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

SessionDep = Annotated[Session, Depends(get_session)]

# Hash de un valor cualquiera, solo para gastar el mismo tiempo cuando el email no existe.
DUMMY_HASH = hash_password("no-such-user")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: Credentials, session: SessionDep) -> Token:
    if session.exec(select(User).where(User.email == body.email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese email ya está registrado.")

    user = User(email=body.email, hashed_password=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(body: Credentials, session: SessionDep) -> Token:
    user = session.exec(select(User).where(User.email == body.email)).first()

    # Mismo mensaje para email inexistente y password incorrecta: distinguirlos permitiría
    # enumerar qué emails están registrados. Contra un email inexistente igual se verifica
    # contra un hash descartable, para que el tiempo de respuesta tampoco los distinga.
    hashed = user.hashed_password if user else DUMMY_HASH
    if not verify_password(body.password, hashed) or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email o contraseña incorrectos.")

    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(body: UserUpdate, user: CurrentUser, session: SessionDep) -> User:
    """Solo toca preferencias. El email y el rol no se cambian por acá: el email es la
    identidad de login y el rol es justo lo que un usuario no debería poder subirse solo."""
    user.stale_after_days = body.stale_after_days
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
