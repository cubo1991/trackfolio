"""Análisis de una oferta laboral con la API de Anthropic.

Todo lo de Anthropic vive acá y nada más lo importa: el resto de la app no sabe que existe. Esa
es la condición de la etapa — sin key configurada, TrackFolio funciona igual y solo esta función
deja de estar disponible.
"""

import os
from pathlib import Path

import anthropic
from pydantic import BaseModel, Field

from app.config import settings

#: Tope de texto de oferta que se acepta. Una oferta larga son ~1500 palabras; más que esto es
#: alguien pegando una página entera, y recortarlo en el borde es más barato que pagarlo.
MAX_OFFER_CHARS = 20_000


class OfferAnalysis(BaseModel):
    """Forma exacta que se le pide al modelo. Con salida estructurada no hay que parsear texto
    libre ni rezar para que respete un formato: la API valida contra este esquema."""

    tags: list[str] = Field(
        description="Tecnologías concretas detectadas en la oferta, en minúsculas y como se "
        "usarían de tag: python, react, kubernetes. Sin categorías vagas como 'backend'."
    )
    fit_summary: str = Field(
        description="Dos o tres oraciones sobre qué tan bien encaja el perfil con la oferta, "
        "dirigidas a la persona que se va a postular, en segunda persona y en español rioplatense."
    )
    strengths: list[str] = Field(
        description="Puntos concretos donde el perfil cubre lo que pide la oferta."
    )
    gaps: list[str] = Field(
        description="Lo que la oferta pide y el perfil no muestra. Vacío si no falta nada."
    )
    seniority: str | None = Field(
        default=None, description="Nivel que pide la oferta si lo dice: junior, semi senior, senior."
    )


class AssistantUnavailable(RuntimeError):
    """La función no está configurada. Se traduce a un 503 en el router."""


SYSTEM = """Analizás ofertas laborales para alguien que está buscando trabajo y las trackea.

Reglas:
- Los tags son tecnologías nombradas en la oferta, no inferidas. Si dice "Django" ponés django;
  si no nombra ninguna base de datos, no inventás postgresql.
- El resumen de fit es honesto. Si el perfil no encaja, lo decís derecho: alguien que se postula
  a ciegas pierde su tiempo. No consuelas ni exagerás.
- Los gaps son lo que la oferta pide explícitamente y el perfil no muestra. No listes como gap
  algo que la oferta no pidió.
- Si el perfil está vacío, dejás strengths y gaps vacíos y el resumen se limita a describir qué
  busca la oferta.
- Escribís en español rioplatense, sin tratar de usted."""


def has_credentials() -> bool:
    """Si hay alguna credencial con la que intentar.

    Es optimista a propósito. El SDK resuelve credenciales en cadena —variable de entorno, y si
    no, el perfil que deja `ant auth login` en el disco— y el perfil recién se usa al hacer el
    request: construir el cliente no falla ni revela nada. Detectar el perfil con certeza
    costaría una llamada paga por cada vez que se abre una ficha, así que acá se mira si el
    archivo de credenciales existe y se deja que el error real, si lo hay, aparezca al analizar.
    """
    if settings.anthropic_api_key:
        return True

    config_dir = os.environ.get("ANTHROPIC_CONFIG_DIR")
    base = (
        Path(config_dir)
        if config_dir
        else Path(os.environ["APPDATA"]) / "Anthropic"
        if os.name == "nt" and "APPDATA" in os.environ
        else Path.home() / ".config" / "anthropic"
    )
    return (base / "credentials").is_dir() and any((base / "credentials").glob("*.json"))


def analyze_offer(offer_text: str, profile: str | None) -> OfferAnalysis:
    if not has_credentials():
        raise AssistantUnavailable(
            "El asistente no está configurado. Poné ANTHROPIC_API_KEY en el backend, "
            "o corré `ant auth login`."
        )

    # Sin `api_key` explícita el SDK recorre su cadena y encuentra el perfil del CLI. Pasarle
    # `None` a mano sería equivalente, pero dejarlo omitido es lo que documenta el SDK.
    client = (
        anthropic.Anthropic(api_key=settings.anthropic_api_key)
        if settings.anthropic_api_key
        else anthropic.Anthropic()
    )

    response = client.beta.messages.parse(
        model=settings.anthropic_model,
        max_tokens=8000,
        # Pensamiento adaptativo: juzgar encaje es criterio, no extracción mecánica.
        thinking={"type": "adaptive"},
        # Si un clasificador de seguridad rechaza el pedido, la API reintenta sola en otro
        # modelo dentro de la misma llamada en vez de devolver la nada.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"<perfil>\n{profile or '(sin perfil configurado)'}\n</perfil>\n\n"
                    f"<oferta>\n{offer_text[:MAX_OFFER_CHARS]}\n</oferta>"
                ),
            }
        ],
        output_format=OfferAnalysis,
    )

    # Se chequea antes de leer el contenido: en un rechazo, `content` no trae el análisis.
    if response.stop_reason == "refusal":
        raise AssistantUnavailable(
            "El modelo no pudo analizar este texto. Probá con la descripción de la oferta sola."
        )

    return response.parsed_output
