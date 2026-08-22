from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.auth import CurrentUser
from app.schemas import OfferAnalysisRequest, ProfileDraft
from app.services.offer_analysis import (
    AssistantUnavailable,
    OfferAnalysis,
    analyze_offer,
    has_credentials,
)
from app.services.profile_builder import (
    CvParseError,
    GithubLookupError,
    build_profile_draft,
    extract_cv_text,
    fetch_github_summary,
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


@router.post("/build-profile", response_model=ProfileDraft)
async def build_profile(
    user: CurrentUser,
    linkedin_text: Annotated[str | None, Form()] = None,
    github_username: Annotated[str | None, Form()] = None,
    cv: Annotated[UploadFile | None, File()] = None,
) -> ProfileDraft:
    """Arma un borrador de perfil a partir de las fuentes que el usuario haya dado.

    Devuelve el texto sin guardarlo: se confirma con el PATCH a /auth/me de siempre, así el
    usuario puede corregirlo antes de que quede como el perfil contra el que se comparan ofertas.
    """
    linkedin_text = (linkedin_text or "").strip() or None
    github_username = (github_username or "").strip() or None

    if not linkedin_text and not github_username and cv is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Dame al menos una fuente: LinkedIn, GitHub o CV."
        )

    github_summary = None
    if github_username:
        try:
            github_summary = fetch_github_summary(github_username)
        except GithubLookupError as caught:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(caught)) from caught

    cv_text = None
    if cv is not None:
        try:
            cv_text = extract_cv_text(await cv.read())
        except CvParseError as caught:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(caught)) from caught

    try:
        profile = build_profile_draft(
            cv_text=cv_text, linkedin_text=linkedin_text, github_summary=github_summary
        )
    except AssistantUnavailable as caught:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(caught)) from caught
    except Exception as caught:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "El asistente no pudo responder. Probá de nuevo en un momento.",
        ) from caught

    return ProfileDraft(profile=profile)
