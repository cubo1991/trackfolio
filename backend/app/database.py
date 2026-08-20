from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

engine = create_engine(settings.database_url)


def create_db_and_tables() -> None:
    # ponytail: create_all alcanza mientras el esquema cambia a diario y la base es descartable.
    # Alembic entra en la Etapa 11, cuando haya datos de producción que no se puedan perder.
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
