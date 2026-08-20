import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.database import get_session
from app.main import app
from app.models import Role, User


@pytest.fixture(name="session")
def session_fixture():
    # SQLite en memoria: la suite corre sin Postgres levantado y tarda segundos. StaticPool
    # mantiene una sola conexión, si no cada checkout del pool vería una base vacía distinta.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    # SQLite ignora las claves foráneas salvo que se le pida explícitamente. Sin esto los tests
    # aprueban cosas que Postgres rechaza — que es exactamente como se coló un borrado roto.
    @event.listens_for(engine, "connect")
    def _activar_claves_foraneas(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    # Sin context manager a propósito: así no corre el lifespan, que se conectaría a Postgres.
    yield TestClient(app)
    app.dependency_overrides.clear()


def _register(client: TestClient, email: str) -> str:
    response = client.post("/auth/register", json={"email": email, "password": "unpassword123"})
    assert response.status_code == 201
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    return {"Authorization": f"Bearer {_register(client, 'david@trackfolio.dev')}"}


@pytest.fixture
def other_headers(client: TestClient) -> dict[str, str]:
    """Segundo usuario, para probar que no puede tocar lo del primero."""
    return {"Authorization": f"Bearer {_register(client, 'otra@persona.dev')}"}


@pytest.fixture
def admin_headers(client: TestClient, session: Session) -> dict[str, str]:
    token = _register(client, "admin@trackfolio.dev")
    admin = session.exec(select(User).where(User.email == "admin@trackfolio.dev")).one()
    admin.role = Role.admin
    session.add(admin)
    session.commit()
    return {"Authorization": f"Bearer {token}"}
