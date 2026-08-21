"""Métricas de conversión.

La aritmética se prueba sobre la función pura, con datos armados a mano: es la única forma de
fijar los casos que importan (nadie respondió todavía, la respuesta llegó el mismo día, la
postulación volvió atrás) sin construir un historial completo por HTTP.
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.models import Application, Status, StatusChange, utcnow
from app.services.metrics import compute_metrics

POSTULADA_EL = date(2026, 1, 10)


def app_de(id: int, status: Status = Status.applied, applied: date = POSTULADA_EL) -> Application:
    return Application(
        id=id,
        user_id=1,
        company=f"Empresa {id}",
        position="Developer",
        applied_date=applied,
        status=status,
        tags=[],
    )


def cambio(application_id: int, a: Status, dias_despues: int, de: Status = Status.applied):
    return StatusChange(
        application_id=application_id,
        from_status=de,
        to_status=a,
        changed_at=utcnow().replace(
            year=POSTULADA_EL.year, month=POSTULADA_EL.month, day=POSTULADA_EL.day
        )
        + timedelta(days=dias_despues),
    )


class TestTasaDeRespuesta:
    def test_sin_postulaciones_no_divide_por_cero(self):
        assert compute_metrics([], []) == {
            "total": 0,
            "responded": 0,
            "response_rate": 0.0,
            "median_days_to_first_response": None,
            "funnel": [
                {"stage": "applied", "count": 0},
                {"stage": "interview", "count": 0},
                {"stage": "offer", "count": 0},
            ],
        }

    def test_nadie_respondio_todavia(self):
        metricas = compute_metrics([app_de(1), app_de(2)], [])
        assert metricas["responded"] == 0
        assert metricas["response_rate"] == 0.0

    def test_una_de_dos_respondio(self):
        metricas = compute_metrics(
            [app_de(1, Status.interview), app_de(2)], [cambio(1, Status.interview, 5)]
        )
        assert metricas["responded"] == 1
        assert metricas["response_rate"] == 0.5

    def test_un_rechazo_cuenta_como_respuesta(self):
        """Un "no" es una respuesta. Contarlo como silencio inflaría la tasa justo en las
        búsquedas donde peor te trataron."""
        metricas = compute_metrics(
            [app_de(1, Status.rejected)], [cambio(1, Status.rejected, 3)]
        )
        assert metricas["response_rate"] == 1.0

    def test_una_cargada_con_estado_avanzado_y_sin_historial_cuenta_como_respondida(self):
        """Al migrar desde una planilla se cargan postulaciones que ya venían avanzadas.
        No tienen historial, pero su estado dice que alguien contestó."""
        metricas = compute_metrics([app_de(1, Status.interview)], [])
        assert metricas["responded"] == 1

    def test_una_que_volvio_a_aplicado_sigue_contando_como_respondida(self):
        """Si tiene historial, hubo movimiento, aunque hoy esté de nuevo en la primera bahía."""
        metricas = compute_metrics(
            [app_de(1, Status.applied)],
            [cambio(1, Status.interview, 4), cambio(1, Status.applied, 6, de=Status.interview)],
        )
        assert metricas["responded"] == 1


class TestTiempoAPrimeraRespuesta:
    def test_sin_respuestas_es_none_y_no_cero(self):
        """Cero días diría "contestan al toque", que es lo contrario de lo que pasa."""
        assert compute_metrics([app_de(1)], [])["median_days_to_first_response"] is None

    def test_toma_la_primera_respuesta_y_no_la_ultima(self):
        metricas = compute_metrics(
            [app_de(1, Status.interview)],
            [cambio(1, Status.in_process, 3), cambio(1, Status.interview, 20)],
        )
        assert metricas["median_days_to_first_response"] == 3

    def test_la_mediana_no_se_corre_por_un_caso_extremo(self):
        """El punto de usar mediana: una empresa que contesta a los 90 días no puede
        redefinir la métrica. La media de 2, 4, 6 y 90 da 25; la mediana da 5."""
        apps = [app_de(i, Status.in_process) for i in range(1, 5)]
        cambios = [
            cambio(1, Status.in_process, 2),
            cambio(2, Status.in_process, 4),
            cambio(3, Status.in_process, 6),
            cambio(4, Status.in_process, 90),
        ]
        assert compute_metrics(apps, cambios)["median_days_to_first_response"] == 5

    def test_una_respuesta_el_mismo_dia_es_cero(self):
        metricas = compute_metrics(
            [app_de(1, Status.in_process)], [cambio(1, Status.in_process, 0)]
        )
        assert metricas["median_days_to_first_response"] == 0

    def test_una_fecha_de_postulacion_posterior_a_la_respuesta_no_da_negativo(self):
        """Pasa al cargar a mano una postulación vieja. Un "-3 días" no le sirve a nadie."""
        metricas = compute_metrics(
            [app_de(1, Status.in_process, applied=POSTULADA_EL + timedelta(days=10))],
            [cambio(1, Status.in_process, 2)],
        )
        assert metricas["median_days_to_first_response"] == 0


class TestEmbudo:
    def test_todas_cuentan_como_postuladas(self):
        funnel = compute_metrics([app_de(1), app_de(2), app_de(3)], [])["funnel"]
        assert funnel[0] == {"stage": "applied", "count": 3}

    def test_una_rechazada_que_paso_por_entrevista_cuenta_en_entrevista(self):
        """El motivo por el que el embudo se calcula sobre el historial y no sobre el estado
        actual: mirar solo el estado de hoy borraría la mitad del recorrido."""
        funnel = compute_metrics(
            [app_de(1, Status.rejected)],
            [cambio(1, Status.interview, 5), cambio(1, Status.rejected, 12, de=Status.interview)],
        )["funnel"]
        assert funnel[1] == {"stage": "interview", "count": 1}

    def test_un_salto_directo_a_oferta_no_inventa_una_entrevista(self):
        funnel = compute_metrics(
            [app_de(1, Status.offer)], [cambio(1, Status.offer, 8)]
        )["funnel"]
        assert funnel[1]["count"] == 0
        assert funnel[2]["count"] == 1

    def test_el_embudo_es_decreciente_en_un_recorrido_completo(self):
        apps = [app_de(1, Status.offer), app_de(2, Status.interview), app_de(3)]
        cambios = [
            cambio(1, Status.interview, 5),
            cambio(1, Status.offer, 15, de=Status.interview),
            cambio(2, Status.interview, 7),
        ]
        funnel = compute_metrics(apps, cambios)["funnel"]
        assert [etapa["count"] for etapa in funnel] == [3, 2, 1]


class TestEndpoint:
    def test_requiere_sesion(self, client: TestClient):
        assert client.get("/metrics").status_code == 401

    def test_devuelve_las_metricas_de_las_propias(self, client: TestClient, auth_headers):
        for cuerpo in [
            {"company": "A", "position": "Dev", "applied_date": "2026-01-10"},
            {"company": "B", "position": "Dev", "applied_date": "2026-01-10"},
        ]:
            client.post("/applications", json=cuerpo, headers=auth_headers)

        creada = client.get("/applications", headers=auth_headers).json()[0]
        client.patch(
            f"/applications/{creada['id']}", json={"status": "interview"}, headers=auth_headers
        )

        metricas = client.get("/metrics", headers=auth_headers).json()
        assert metricas["total"] == 2
        assert metricas["responded"] == 1
        assert metricas["response_rate"] == 0.5
        assert metricas["funnel"] == [
            {"stage": "applied", "count": 2},
            {"stage": "interview", "count": 1},
            {"stage": "offer", "count": 0},
        ]

    def test_no_mezcla_las_de_otro_usuario(
        self, client: TestClient, auth_headers, other_headers
    ):
        client.post(
            "/applications",
            json={"company": "A", "position": "Dev", "applied_date": "2026-01-10"},
            headers=auth_headers,
        )
        assert client.get("/metrics", headers=other_headers).json()["total"] == 0
