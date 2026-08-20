"""Auth. Lo que se prueba acá no es "el login anda", sino los casos en los que tiene que
fallar: son los que rompen sin que nadie se entere."""

from fastapi.testclient import TestClient
from sqlmodel import select

from app.models import User


def test_registro_devuelve_token(client: TestClient):
    response = client.post(
        "/auth/register", json={"email": "nuevo@trackfolio.dev", "password": "unpassword123"}
    )
    assert response.status_code == 201
    assert response.json()["access_token"]


def test_email_duplicado_es_conflicto(client: TestClient):
    body = {"email": "repetido@trackfolio.dev", "password": "unpassword123"}
    client.post("/auth/register", json=body)
    assert client.post("/auth/register", json=body).status_code == 409


def test_password_incorrecta_no_loguea(client: TestClient):
    client.post(
        "/auth/register", json={"email": "david@trackfolio.dev", "password": "unpassword123"}
    )
    response = client.post(
        "/auth/login", json={"email": "david@trackfolio.dev", "password": "otracosa123"}
    )
    assert response.status_code == 401


def test_email_inexistente_da_el_mismo_error_que_password_incorrecta(client: TestClient):
    """Si los mensajes difirieran, se podría enumerar qué emails están registrados."""
    client.post(
        "/auth/register", json={"email": "david@trackfolio.dev", "password": "unpassword123"}
    )
    inexistente = client.post(
        "/auth/login", json={"email": "fantasma@trackfolio.dev", "password": "unpassword123"}
    )
    incorrecta = client.post(
        "/auth/login", json={"email": "david@trackfolio.dev", "password": "otracosa123"}
    )
    assert inexistente.status_code == incorrecta.status_code == 401
    assert inexistente.json() == incorrecta.json()


def test_sin_token_no_hay_acceso(client: TestClient):
    # 401 y no 403: falta la credencial, no es que la credencial no alcance.
    assert client.get("/auth/me").status_code == 401


def test_token_invalido_da_401(client: TestClient):
    response = client.get("/auth/me", headers={"Authorization": "Bearer no-es-un-token"})
    assert response.status_code == 401


def test_token_de_usuario_borrado_da_401(client: TestClient, session, auth_headers):
    """El token sigue siendo criptográficamente válido, pero el usuario ya no está."""
    session.delete(session.exec(select(User)).one())
    session.commit()
    assert client.get("/auth/me", headers=auth_headers).status_code == 401


def test_password_corta_se_rechaza(client: TestClient):
    response = client.post(
        "/auth/register", json={"email": "corta@trackfolio.dev", "password": "1234"}
    )
    assert response.status_code == 422
