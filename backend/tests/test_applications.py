"""CRUD de postulaciones. Los tres casos que importan: que el CRUD funcione, que un usuario no
pueda ver ni tocar lo de otro, y que el cambio de estado quede registrado en el historial."""

from fastapi.testclient import TestClient
from sqlmodel import select

from app.models import StatusChange, Status

NUEVA = {
    "company": "Acme",
    "position": "Backend Developer",
    "applied_date": "2026-08-01",
    "tags": ["python", "fastapi"],
}


def crear(client: TestClient, headers: dict[str, str], **extra) -> dict:
    response = client.post("/applications", json={**NUEVA, **extra}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def test_crear_y_listar(client: TestClient, auth_headers):
    creada = crear(client, auth_headers)
    assert creada["status"] == "applied"
    assert creada["tags"] == ["python", "fastapi"]

    listado = client.get("/applications", headers=auth_headers).json()
    assert [a["id"] for a in listado] == [creada["id"]]


def test_actualizar_solo_toca_los_campos_enviados(client: TestClient, auth_headers):
    creada = crear(client, auth_headers)
    response = client.patch(
        f"/applications/{creada['id']}", json={"notes": "Entrevista el martes"}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["notes"] == "Entrevista el martes"
    assert response.json()["company"] == "Acme"  # no se pisó con None


def test_borrar(client: TestClient, auth_headers):
    creada = crear(client, auth_headers)
    assert client.delete(f"/applications/{creada['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"/applications/{creada['id']}", headers=auth_headers).status_code == 404


def test_borrar_se_lleva_el_historial(client: TestClient, auth_headers, session):
    """Sin ON DELETE CASCADE esto falla en Postgres por violación de clave foránea, pero
    pasaba en SQLite hasta que la suite empezó a exigir las claves foráneas."""
    creada = crear(client, auth_headers)
    client.patch(
        f"/applications/{creada['id']}", json={"status": "interview"}, headers=auth_headers
    )
    assert client.delete(f"/applications/{creada['id']}", headers=auth_headers).status_code == 204
    assert session.exec(select(StatusChange)).all() == []


# --- Ownership ---------------------------------------------------------------


def test_no_se_ve_lo_de_otro_usuario(client: TestClient, auth_headers, other_headers):
    crear(client, auth_headers)
    assert client.get("/applications", headers=other_headers).json() == []


def test_tocar_lo_de_otro_da_404_y_no_403(client: TestClient, auth_headers, other_headers):
    """404 a propósito: un 403 confirmaría que ese id existe y es de otra persona."""
    ajena = crear(client, auth_headers)
    assert client.get(f"/applications/{ajena['id']}", headers=other_headers).status_code == 404
    assert (
        client.patch(
            f"/applications/{ajena['id']}", json={"company": "Hackeada"}, headers=other_headers
        ).status_code
        == 404
    )
    assert client.delete(f"/applications/{ajena['id']}", headers=other_headers).status_code == 404


def test_el_admin_ve_todo(client: TestClient, auth_headers, admin_headers):
    crear(client, auth_headers)
    assert len(client.get("/applications", headers=admin_headers).json()) == 1


# --- Historial de estados ----------------------------------------------------


def test_cambiar_estado_registra_la_transicion(client: TestClient, auth_headers, session):
    creada = crear(client, auth_headers)
    client.patch(
        f"/applications/{creada['id']}", json={"status": "interview"}, headers=auth_headers
    )

    cambios = session.exec(select(StatusChange)).all()
    assert len(cambios) == 1
    assert cambios[0].from_status is Status.applied
    assert cambios[0].to_status is Status.interview


def test_actualizar_sin_cambiar_estado_no_registra_nada(client: TestClient, auth_headers, session):
    creada = crear(client, auth_headers)
    client.patch(f"/applications/{creada['id']}", json={"company": "Acme SA"}, headers=auth_headers)
    assert session.exec(select(StatusChange)).all() == []


def test_mandar_el_mismo_estado_no_registra_nada(client: TestClient, auth_headers, session):
    """Un drag & drop que suelta la tarjeta en la misma columna no es una transición."""
    creada = crear(client, auth_headers)
    client.patch(f"/applications/{creada['id']}", json={"status": "applied"}, headers=auth_headers)
    assert session.exec(select(StatusChange)).all() == []


def test_estado_invalido_se_rechaza(client: TestClient, auth_headers):
    creada = crear(client, auth_headers)
    response = client.patch(
        f"/applications/{creada['id']}", json={"status": "contratado"}, headers=auth_headers
    )
    assert response.status_code == 422
