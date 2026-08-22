"""Arma el perfil del usuario a partir de fuentes crudas: CV, LinkedIn pegado a mano y GitHub.

Como en offer_analysis.py, todo lo externo vive acá. El resultado es texto libre en el mismo
formato que el usuario podría haber tipeado a mano en el campo `profile` — no se guarda solo:
el router devuelve el borrador y el usuario lo confirma con el PATCH que ya existía.
"""

import io

import anthropic
import httpx
import truststore
from pypdf import PdfReader

from app.config import settings
from app.services.offer_analysis import AssistantUnavailable, has_credentials

# En Windows con antivirus que hace inspección SSL (AVG, Kaspersky, etc.), el certificado
# presentado por sitios externos está firmado por una CA local instalada en el almacén del
# sistema pero ausente del bundle de certifi que usa httpx por default. truststore hace que
# ssl valide contra el almacén nativo del SO en vez de certifi, igual que hace curl.
truststore.inject_into_ssl()

MAX_CV_BYTES = 5 * 1024 * 1024
MAX_SOURCE_CHARS = 20_000
GITHUB_API = "https://api.github.com"
MAX_REPOS_IN_SUMMARY = 15


class GithubLookupError(RuntimeError):
    """El username no existe o GitHub no contestó. Se traduce a un 400 en el router."""


class CvParseError(RuntimeError):
    """El archivo no es un PDF legible. Se traduce a un 400 en el router."""


def fetch_github_summary(username: str) -> str:
    try:
        response = httpx.get(
            f"{GITHUB_API}/users/{username}/repos",
            params={"sort": "updated", "per_page": 100, "type": "owner"},
            headers={"Accept": "application/vnd.github+json"},
            timeout=10,
        )
    except httpx.HTTPError as caught:
        raise GithubLookupError("No se pudo contactar a GitHub. Probá de nuevo.") from caught

    if response.status_code == 404:
        raise GithubLookupError(f"No existe el usuario de GitHub '{username}'.")
    if response.status_code == 403:
        raise GithubLookupError("GitHub limitó las consultas por ahora. Probá en un rato.")
    if response.is_error:
        raise GithubLookupError("GitHub no pudo responder. Probá de nuevo.")

    # Los forks no dicen nada del propio trabajo, y ordenar por estrellas prioriza lo que
    # otros ya validaron por sobre lo último tocado.
    repos = [repo for repo in response.json() if not repo["fork"]]
    repos.sort(key=lambda repo: repo["stargazers_count"], reverse=True)

    if not repos:
        return f"El usuario de GitHub '{username}' no tiene repositorios públicos."

    lineas = [
        "- "
        + repo["name"]
        + (f" ({repo['language']})" if repo["language"] else "")
        + (f": {repo['description']}" if repo["description"] else "")
        for repo in repos[:MAX_REPOS_IN_SUMMARY]
    ]
    return f"Repositorios públicos de {username} en GitHub:\n" + "\n".join(lineas)


def extract_cv_text(data: bytes) -> str:
    if len(data) > MAX_CV_BYTES:
        raise CvParseError("El CV pesa demasiado (máximo 5 MB).")

    try:
        reader = PdfReader(io.BytesIO(data))
        texto = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as caught:  # noqa: BLE001 — pypdf no documenta un tipo de error propio
        raise CvParseError("No se pudo leer el PDF. ¿Es un PDF válido?") from caught

    if not texto.strip():
        raise CvParseError("El PDF no tiene texto para leer (¿es una imagen escaneada?).")

    return texto[:MAX_SOURCE_CHARS]


SYSTEM = """Armás un perfil profesional corto a partir de fuentes crudas —CV, LinkedIn,
repositorios de GitHub— que te da alguien que está buscando trabajo. Ese perfil se guarda y
después se usa para compararlo contra ofertas laborales.

Reglas:
- Primera persona ("trabajé", "hice"), tono directo, español rioplatense.
- Entre 3 y 6 oraciones. Nombrás tecnologías concretas que aparecen en las fuentes; no inventás
  ninguna que no esté.
- Priorizás lo más reciente y lo más relevante para conseguir trabajo —stack, años de
  experiencia, seniority— por sobre relleno genérico tipo "persona proactiva y comprometida".
- Si las fuentes se contradicen entre sí (por ejemplo, un GitHub que no tiene nada que ver con
  el resto), te quedás en silencio con lo más específico y consistente entre CV y LinkedIn, y
  simplemente dejás de lado lo que no encaja. Nunca lo señalás en la respuesta.
- No inventás empresas, años ni logros que no estén en ninguna fuente.
- Si las fuentes son muy poca cosa (un solo repo, nada de texto), el perfil sale corto en vez de
  relleno inventado.
- Tu respuesta ENTERA es el perfil, palabra por palabra tal cual va a quedar guardado. Nunca
  metacomentario: nada de títulos tipo "Perfil", notas sobre qué fuente usaste o descartaste,
  preguntas de vuelta, ni opciones para que la persona elija. Si de verdad no hay nada
  aprovechable en ninguna fuente, devolvés una sola oración neutra ("Todavía no hay suficiente
  información en las fuentes para armar un perfil.") y nada más."""


def build_profile_draft(
    *, cv_text: str | None, linkedin_text: str | None, github_summary: str | None
) -> str:
    if not has_credentials():
        raise AssistantUnavailable(
            "El asistente no está configurado. Poné ANTHROPIC_API_KEY en el backend, "
            "o corré `ant auth login`."
        )

    fuentes = []
    if cv_text:
        fuentes.append(f"<cv>\n{cv_text}\n</cv>")
    if linkedin_text:
        fuentes.append(f"<linkedin>\n{linkedin_text[:MAX_SOURCE_CHARS]}\n</linkedin>")
    if github_summary:
        fuentes.append(f"<github>\n{github_summary}\n</github>")

    client = (
        anthropic.Anthropic(api_key=settings.anthropic_api_key)
        if settings.anthropic_api_key
        else anthropic.Anthropic()
    )

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1000,
        system=SYSTEM,
        messages=[{"role": "user", "content": "\n\n".join(fuentes)}],
    )

    if response.stop_reason == "refusal":
        raise AssistantUnavailable(
            "El modelo no pudo procesar estas fuentes. Probá con otro CV o menos texto."
        )

    return "".join(block.text for block in response.content if block.type == "text").strip()
