from fastapi import APIRouter, HTTPException, status

from app.auth import CurrentUser
from app.schemas import OfferAnalysisRequest
from app.services.offer_analysis import (
    AssistantUnavailable,
    OfferAnalysis,
    analyze_offer,
    has_credentials,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/status")
def assistant_status() -> dict[str, bool]:
    """Le dice al frontend si mostrar la función. Sin esto, el único modo de enterarse de que
    el asistente no está configurado sería pegar una oferta y comerse un error."""
    return {"available": has_credentials()}


@router.post("/analyze-offer", response_model=OfferAnalysis)
def analyze(body: OfferAnalysisRequest, user: CurrentUser) -> OfferAnalysis:
    """Analiza el texto de una oferta contra el perfil del usuario.

    Aislado del resto a propósito: es la única ruta que depende de un servicio externo, y si esa
    dependencia no está o falla, nada más de la app se entera.
    """
    try:
        return analyze_offer(body.offer_text, user.profile)
    except AssistantUnavailable as caught:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(caught)) from caught
    except Exception as caught:  # noqa: BLE001
        # Cualquier problema del proveedor —caída, límite de uso, timeout— se traduce a un 502
        # con un mensaje legible en vez de un 500 con el stack de otra empresa adentro.
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "El asistente no pudo responder. Probá de nuevo en un momento.",
        ) from caught
