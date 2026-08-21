"""Alertas de postulaciones sin movimiento.

La lógica pura (`from_application`) se prueba directo, sin HTTP: recibe el `now` por parámetro
justamente para poder fijar el día sin parchear el reloj. Los tests de endpoint quedan para lo
que solo se ve de punta a punta: que el umbral guardado sea el que se aplica al listar.
"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.models import Application, Status, utcnow
from app.schemas import ApplicationRead


def postulacion(dias_sin_tocar: int, status: Status = Status.applied) -> Application:
    ahora = utcnow()
    return Application(
        id=1,
        user_id=1,
        company="ACME",
        position="Backend Developer",
        applied_date=ahora.date(),
        status=status,
        tags=[],
        created_at=ahora - timedelta(days=dias_sin_tocar),
        updated_at=ahora - timedelta(days=dias_sin_tocar),
    )


def leer(application: Application, umbral: int = 14) -> ApplicationRead:
    return ApplicationRead.from_application(application, umbral)


@pytest.fixture
def envejecer(session):
    """Retrasa updated_at directo en la base. Esperar días reales no es opción, y adelantar el
    reloj del proceso tampoco alcanza: la fecha la escribe el endpoint al guardar."""

    def _envejecer(application_id: int, dias: int) -> None:
        application = session.get(Application, application_id)
        application.updated_at = utcnow() - timedelta(days=dias)
        session.add(application)
        session.commit()

    return _envejecer


class TestLogicaDeEstancamiento:
    def test_una_postulacion_reciente_no_esta_estancada(self):
        assert leer(postulacion(dias_sin_tocar=3)).is_stale is False

    def test_una_postulacion_vieja_esta_estancada(self):
        assert leer(postulacion(dias_sin_tocar=30)).is_stale is True

    def test_el_umbral_es_inclusivo(self):
        """Con umbral de 14, a los 14 días ya avisa. El límite se fija para que no quede
        librado a si alguien escribió > o >=."""
        assert leer(postulacion(dias_sin_tocar=13), umbral=14).is_stale is False
        assert leer(postulacion(dias_sin_tocar=14), umbral=14).is_stale is True

    def test_los_dias_inactivos_se_informan(self):
        assert leer(postulacion(dias_sin_tocar=20)).days_inactive == 20

    @pytest.mark.parametrize("status", [Status.rejected, Status.offer])
    def test_los_estados_terminales_nunca_se_marcan(self, status):
        """Una postulación rechazada hace un año no es un pendiente: ya terminó. Si se
        marcara, el tablero se llenaría de alertas que no accionan nada."""
        assert leer(postulacion(dias_sin_tocar=365, status=status)).is_stale is False

    @pytest.mark.parametrize(
        "status", [Status.applied, Status.in_process, Status.interview]
    )
    def test_los_estados_activos_si_se_marcan(self, status):
        assert leer(postulacion(dias_sin_tocar=365, status=status)).is_stale is True

    def test_un_umbral_mas_alto_deja_de_marcarla(self):
        vieja = postulacion(dias_sin_tocar=20)
        assert leer(vieja, umbral=14).is_stale is True
        assert leer(vieja, umbral=30).is_stale is False


class TestUmbralConfigurable:
    def test_el_umbral_por_defecto_es_de_dos_semanas(self, client: TestClient, auth_headers):
        assert client.get("/auth/me", headers=auth_headers).json()["stale_after_days"] == 14

    def test_se_puede_cambiar(self, client: TestClient, auth_headers):
        response = client.patch(
            "/auth/me", json={"stale_after_days": 30}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["stale_after_days"] == 30
        assert client.get("/auth/me", headers=auth_headers).json()["stale_after_days"] == 30

    @pytest.mark.parametrize("valor", [0, -5, 366])
    def test_se_rechazan_los_valores_sin_sentido(self, client: TestClient, auth_headers, valor):
        """Un umbral de 0 o negativo marcaría todo; uno de mil días no marcaría nada nunca."""
        assert (
            client.patch(
                "/auth/me", json={"stale_after_days": valor}, headers=auth_headers
            ).status_code
            == 422
        )

    def test_el_umbral_no_se_puede_cambiar_sin_sesion(self, client: TestClient):
        assert client.patch("/auth/me", json={"stale_after_days": 30}).status_code == 401

    def test_cambiar_el_umbral_no_deja_tocar_el_rol(self, client: TestClient, auth_headers):
        """El endpoint solo acepta preferencias: mandar `role` no debe escalar privilegios."""
        client.patch(
            "/auth/me",
            json={"stale_after_days": 20, "role": "admin"},
            headers=auth_headers,
        )
        assert client.get("/auth/me", headers=auth_headers).json()["role"] == "user"

    def test_el_umbral_de_cada_usuario_es_independiente(
        self, client: TestClient, auth_headers, other_headers
    ):
        client.patch("/auth/me", json={"stale_after_days": 60}, headers=auth_headers)
        assert client.get("/auth/me", headers=other_headers).json()["stale_after_days"] == 14


class TestListadoConAlertas:
    def test_el_listado_usa_el_umbral_guardado(self, client: TestClient, auth_headers, envejecer):
        """El de punta a punta: se crea una postulación, se la envejece en la base y se
        comprueba que al bajar el umbral aparece marcada."""
        creada = client.post(
            "/applications",
            json={
                "company": "ACME",
                "position": "Backend Developer",
                "applied_date": "2026-01-15",
            },
            headers=auth_headers,
        ).json()
        assert creada["is_stale"] is False
        assert creada["days_inactive"] == 0

        envejecer(creada["id"], dias=20)

        client.patch("/auth/me", json={"stale_after_days": 30}, headers=auth_headers)
        assert client.get("/applications", headers=auth_headers).json()[0]["is_stale"] is False

        client.patch("/auth/me", json={"stale_after_days": 14}, headers=auth_headers)
        listada = client.get("/applications", headers=auth_headers).json()[0]
        assert listada["is_stale"] is True
        assert listada["days_inactive"] == 20

    def test_mover_una_postulacion_le_saca_la_alerta(self, client: TestClient, auth_headers, envejecer):
        """El movimiento actualiza updated_at, así que la cuenta vuelve a cero. Es lo que hace
        que la alerta sea accionable en vez de permanente."""
        creada = client.post(
            "/applications",
            json={
                "company": "ACME",
                "position": "Backend Developer",
                "applied_date": "2026-01-15",
            },
            headers=auth_headers,
        ).json()
        envejecer(creada["id"], dias=40)
        assert client.get("/applications", headers=auth_headers).json()[0]["is_stale"] is True

        movida = client.patch(
            f"/applications/{creada['id']}",
            json={"status": "interview"},
            headers=auth_headers,
        ).json()
        assert movida["is_stale"] is False
        assert movida["days_inactive"] == 0


