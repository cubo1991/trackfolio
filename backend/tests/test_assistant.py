"""Asistente de ofertas.

Ningún test de acá llama a la API de Anthropic. Una suite que sale a internet es lenta, falla
por motivos ajenos al código y cuesta plata por corrida; además el punto a fijar no es que el
modelo acierte —eso no es determinista— sino que el endpoint se comporte bien en los tres casos
que sí controlamos: sin key configurada, con el proveedor caído, y con una respuesta válida.

El parcheo va sobre `app.routers.assistant.analyze_offer` y no sobre el módulo donde la función
está definida: el router hizo `from ... import analyze_offer`, así que ese nombre quedó ligado al
importar. Parchear el original no lo alcanza — y el síntoma es peligroso, porque el test "pasa"
saliendo a internet de verdad en vez de fallar.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.routers import assistant
from app.services.offer_analysis import AssistantUnavailable, OfferAnalysis

OFERTA = (
    "Buscamos Backend Developer con experiencia en Python y FastAPI para sumarse al equipo "
    "de plataforma. Trabajamos con PostgreSQL y Docker. Modalidad remota desde Argentina."
)


@pytest.fixture
def sin_credenciales(monkeypatch, tmp_path):
    """Ni variable de entorno ni perfil del CLI.

    El directorio de config se apunta a uno vacio a proposito: si no, el resultado dependeria de
    si quien corre la suite hizo `ant auth login` en su maquina, y un test que cambia de
    respuesta segun la maquina no fija nada.
    """
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setenv("ANTHROPIC_CONFIG_DIR", str(tmp_path / "vacio"))


@pytest.fixture
def con_key(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-de-mentira")
    monkeypatch.setenv("ANTHROPIC_CONFIG_DIR", str(tmp_path / "vacio"))


@pytest.fixture
def con_perfil_del_cli(monkeypatch, tmp_path):
    """Sin variable de entorno, pero con el perfil que deja `ant auth login`."""
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    credenciales = tmp_path / "config" / "credentials"
    credenciales.mkdir(parents=True)
    (credenciales / "default.json").write_text("{}", encoding="utf-8")
    monkeypatch.setenv("ANTHROPIC_CONFIG_DIR", str(tmp_path / "config"))


class TestSinConfigurar:
    def test_el_estado_dice_que_no_esta_disponible(self, client: TestClient, sin_credenciales):
        assert client.get("/assistant/status").json() == {"available": False}

    def test_analizar_devuelve_503_y_no_500(self, client: TestClient, auth_headers, sin_credenciales):
        """503 y no 500: no es un bug del servidor, es una función que no está configurada,
        y el mensaje tiene que decir eso."""
        response = client.post(
            "/assistant/analyze-offer", json={"offer_text": OFERTA}, headers=auth_headers
        )
        assert response.status_code == 503
        assert "ANTHROPIC_API_KEY" in response.json()["detail"]
        assert "ant auth login" in response.json()["detail"]

    def test_el_resto_de_la_app_funciona_igual(self, client: TestClient, auth_headers, sin_credenciales):
        """El criterio de la etapa: sin key, TrackFolio entero anda como si nada."""
        creada = client.post(
            "/applications",
            json={"company": "ACME", "position": "Dev", "applied_date": "2026-01-15"},
            headers=auth_headers,
        )
        assert creada.status_code == 201
        assert client.get("/applications", headers=auth_headers).status_code == 200
        assert client.get("/metrics", headers=auth_headers).status_code == 200


class TestConKey:
    def test_el_estado_dice_que_esta_disponible(self, client: TestClient, con_key):
        assert client.get("/assistant/status").json() == {"available": True}

    def test_devuelve_el_analisis(self, client: TestClient, auth_headers, con_key, monkeypatch):
        analisis = OfferAnalysis(
            tags=["python", "fastapi", "postgresql", "docker"],
            fit_summary="Encaja bien con tu experiencia en backend.",
            strengths=["Ya trabajaste con FastAPI"],
            gaps=["No mostrás experiencia con Docker"],
            seniority=None,
        )
        monkeypatch.setattr(assistant, "analyze_offer", lambda *_: analisis)

        response = client.post(
            "/assistant/analyze-offer", json={"offer_text": OFERTA}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["tags"] == ["python", "fastapi", "postgresql", "docker"]
        assert response.json()["gaps"] == ["No mostrás experiencia con Docker"]

    def test_una_caida_del_proveedor_es_502_y_no_filtra_el_error_interno(
        self, client: TestClient, auth_headers, con_key, monkeypatch
    ):
        """Un timeout de Anthropic no es un bug de TrackFolio, y su stack trace no tiene por qué
        llegarle al usuario."""

        def explota(*_):
            raise RuntimeError("Connection reset by peer en api.anthropic.com")

        monkeypatch.setattr(assistant, "analyze_offer", explota)

        response = client.post(
            "/assistant/analyze-offer", json={"offer_text": OFERTA}, headers=auth_headers
        )
        assert response.status_code == 502
        assert "anthropic.com" not in response.json()["detail"]

    def test_un_rechazo_del_modelo_se_informa_sin_romper(
        self, client: TestClient, auth_headers, con_key, monkeypatch
    ):
        def rechaza(*_):
            raise AssistantUnavailable("El modelo no pudo analizar este texto.")

        monkeypatch.setattr(assistant, "analyze_offer", rechaza)

        response = client.post(
            "/assistant/analyze-offer", json={"offer_text": OFERTA}, headers=auth_headers
        )
        assert response.status_code == 503


class TestPerfilDelCLI:
    def test_un_perfil_en_disco_alcanza_para_habilitar_el_asistente(
        self, client: TestClient, con_perfil_del_cli
    ):
        """`ant auth login` no deja ninguna variable de entorno: si el chequeo mirara solo
        ANTHROPIC_API_KEY, el asistente quedaria apagado con credenciales validas."""
        assert client.get("/assistant/status").json() == {"available": True}

    def test_sin_perfil_ni_key_sigue_apagado(self, client: TestClient, sin_credenciales):
        assert client.get("/assistant/status").json() == {"available": False}


class TestValidacionYAcceso:
    def test_requiere_sesion(self, client: TestClient, con_key):
        assert client.post("/assistant/analyze-offer", json={"offer_text": OFERTA}).status_code == 401

    def test_rechaza_un_texto_demasiado_corto(self, client: TestClient, auth_headers, con_key):
        """Sin un mínimo, un "hola" gasta una llamada paga para no decir nada."""
        assert (
            client.post(
                "/assistant/analyze-offer", json={"offer_text": "hola"}, headers=auth_headers
            ).status_code
            == 422
        )

    def test_rechaza_un_texto_gigante(self, client: TestClient, auth_headers, con_key):
        assert (
            client.post(
                "/assistant/analyze-offer",
                json={"offer_text": "x" * 20_001},
                headers=auth_headers,
            ).status_code
            == 422
        )


class TestPerfil:
    def test_el_perfil_arranca_vacio(self, client: TestClient, auth_headers):
        assert client.get("/auth/me", headers=auth_headers).json()["profile"] is None

    def test_se_puede_guardar(self, client: TestClient, auth_headers):
        response = client.patch(
            "/auth/me", json={"profile": "Dev backend, 3 años con Python."}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["profile"] == "Dev backend, 3 años con Python."

    def test_guardar_el_perfil_no_pisa_el_umbral(self, client: TestClient, auth_headers):
        """El PATCH aplica solo lo que viene: sin `exclude_unset`, guardar el perfil
        reseteaba el umbral de alertas a su default."""
        client.patch("/auth/me", json={"stale_after_days": 45}, headers=auth_headers)
        client.patch("/auth/me", json={"profile": "Dev backend."}, headers=auth_headers)

        usuario = client.get("/auth/me", headers=auth_headers).json()
        assert usuario["stale_after_days"] == 45
        assert usuario["profile"] == "Dev backend."

    def test_guardar_el_umbral_no_borra_el_perfil(self, client: TestClient, auth_headers):
        client.patch("/auth/me", json={"profile": "Dev backend."}, headers=auth_headers)
        client.patch("/auth/me", json={"stale_after_days": 20}, headers=auth_headers)

        assert client.get("/auth/me", headers=auth_headers).json()["profile"] == "Dev backend."

    def test_el_perfil_de_cada_usuario_es_suyo(
        self, client: TestClient, auth_headers, other_headers
    ):
        client.patch("/auth/me", json={"profile": "Dev backend."}, headers=auth_headers)
        assert client.get("/auth/me", headers=other_headers).json()["profile"] is None
