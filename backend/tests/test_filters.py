"""Filtros del listado. Lo que se prueba no es que cada filtro funcione aislado, sino que
recorten de verdad y que combinados sigan respetando el aislamiento entre usuarios."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def datos(client: TestClient, auth_headers):
    """Tres postulaciones que se diferencian en empresa, estado, fecha y tags."""
    for cuerpo in [
        {
            "company": "ACME S.A.",
            "position": "Backend Developer",
            "applied_date": "2026-01-15",
            "status": "applied",
            "tags": ["python", "fastapi"],
        },
        {
            "company": "Globant",
            "position": "Frontend Developer",
            "applied_date": "2026-06-01",
            "status": "interview",
            "tags": ["react", "typescript"],
        },
        {
            "company": "Mercado Libre",
            "position": "Full Stack Developer",
            "applied_date": "2026-08-20",
            "status": "interview",
            "tags": ["react", "python"],
        },
    ]:
        assert client.post("/applications", json=cuerpo, headers=auth_headers).status_code == 201


def empresas(client: TestClient, headers, **filtros) -> list[str]:
    response = client.get("/applications", params=filtros, headers=headers)
    assert response.status_code == 200, response.text
    return [item["company"] for item in response.json()]


def test_sin_filtros_devuelve_todo_ordenado_por_fecha_descendente(client, auth_headers, datos):
    assert empresas(client, auth_headers) == ["Mercado Libre", "Globant", "ACME S.A."]


def test_filtro_por_empresa_es_parcial_y_no_distingue_mayusculas(client, auth_headers, datos):
    assert empresas(client, auth_headers, company="acme") == ["ACME S.A."]


def test_filtro_por_empresa_sin_coincidencias_devuelve_vacio(client, auth_headers, datos):
    assert empresas(client, auth_headers, company="Nubank") == []


def test_filtro_por_estado(client, auth_headers, datos):
    assert empresas(client, auth_headers, status="interview") == ["Mercado Libre", "Globant"]


def test_estado_invalido_se_rechaza(client, auth_headers, datos):
    assert client.get(
        "/applications", params={"status": "contratado"}, headers=auth_headers
    ).status_code == 422


def test_filtro_por_tag(client, auth_headers, datos):
    assert empresas(client, auth_headers, tag="react") == ["Mercado Libre", "Globant"]
    assert empresas(client, auth_headers, tag="fastapi") == ["ACME S.A."]


def test_filtro_por_tag_es_exacto_y_no_por_substring(client, auth_headers, datos):
    """"type" no debe traer las que tienen "typescript"."""
    assert empresas(client, auth_headers, tag="type") == []


def test_filtro_por_rango_de_fechas(client, auth_headers, datos):
    assert empresas(client, auth_headers, date_from="2026-06-01") == [
        "Mercado Libre",
        "Globant",
    ]
    assert empresas(client, auth_headers, date_to="2026-06-01") == ["Globant", "ACME S.A."]
    assert empresas(
        client, auth_headers, date_from="2026-05-01", date_to="2026-07-01"
    ) == ["Globant"]


def test_los_limites_del_rango_son_inclusivos(client, auth_headers, datos):
    assert empresas(
        client, auth_headers, date_from="2026-06-01", date_to="2026-06-01"
    ) == ["Globant"]


def test_los_filtros_se_combinan_con_and(client, auth_headers, datos):
    assert empresas(client, auth_headers, status="interview", tag="python") == [
        "Mercado Libre"
    ]
    assert empresas(client, auth_headers, status="interview", tag="fastapi") == []


def test_los_filtros_no_saltean_el_aislamiento_entre_usuarios(
    client, auth_headers, other_headers, datos
):
    """El riesgo real de agregar filtros: que alguno arme la query desde cero y se coma el
    WHERE por usuario."""
    assert empresas(client, other_headers, company="acme") == []
    assert empresas(client, other_headers, tag="python") == []
    assert empresas(client, other_headers, status="interview") == []
