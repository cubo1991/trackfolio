from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models import Role, User

ALGORITHM = "HS256"

# bcrypt trunca silenciosamente después de 72 bytes: dos passwords que difieren recién en el
# byte 73 serían equivalentes. Se corta en el borde de entrada (schemas.py) y se valida acá.
MAX_PASSWORD_BYTES = 72

bearer = HTTPBearer(description="Token JWT devuelto por /auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(_encode(password), hashed.encode())


def _encode(password: str) -> bytes:
    raw = password.encode()
    if len(raw) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"La contraseña no puede superar los {MAX_PASSWORD_BYTES} bytes.",
        )
    return raw


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.secret_key, ALGORITHM)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    invalid = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, [ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise invalid

    user = session.exec(select(User).where(User.id == user_id)).first()
    if user is None:
        # El token es válido pero el usuario ya no existe (cuenta borrada).
        raise invalid
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role is not Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requiere rol de administrador.")
    return user
