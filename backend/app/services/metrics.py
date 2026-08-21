"""Cálculo de las métricas de conversión.

Vive en un servicio y no en el router porque acá sí hay lógica de dominio con decisiones
discutibles — qué cuenta como respuesta, qué promedio usar, qué significa "llegó a entrevista" —
y esas decisiones necesitan poder testearse sin levantar HTTP ni base.

Todo se calcula sobre el historial de transiciones (`StatusChange`), no sobre el estado actual.
Una postulación rechazada hoy que pasó por una entrevista tiene que contar en el embudo: mirar
solo el estado actual borraría la mitad del recorrido.
"""

from collections import defaultdict
from statistics import median

from app.models import Application, Status, StatusChange, as_utc

#: El embudo que le importa al usuario. `in_process` queda afuera a propósito: es una parada del
#: camino, no un hito, y meterla haría el embudo más largo sin decir nada nuevo.
FUNNEL_STAGES = (Status.applied, Status.interview, Status.offer)


def compute_metrics(
    applications: list[Application], changes: list[StatusChange]
) -> dict:
    """Recibe los datos ya cargados en vez de una sesión: así el test arma tres postulaciones
    en memoria y verifica la aritmética sin tocar la base."""
    history: dict[int, list[StatusChange]] = defaultdict(list)
    for change in changes:
        history[change.application_id].append(change)

    total = len(applications)

    # Respondida = alguna vez se movió de "aplicado". Incluye el rechazo: un "no" es una
    # respuesta, y contarlo como silencio inflaría la tasa de las búsquedas peor tratadas.
    responded = sum(
        1
        for application in applications
        if application.status is not Status.applied or history[application.id]
    )

    return {
        "total": total,
        "responded": responded,
        "response_rate": responded / total if total else 0.0,
        "median_days_to_first_response": _median_days_to_first_response(applications, history),
        "funnel": [
            {
                "stage": stage.value,
                "count": sum(
                    1 for application in applications if _reached(application, stage, history)
                ),
            }
            for stage in FUNNEL_STAGES
        ],
    }


def _median_days_to_first_response(
    applications: list[Application], history: dict[int, list[StatusChange]]
) -> int | None:
    """Mediana y no media.

    Una sola empresa que contesta a los noventa días corre la media lo suficiente como para que
    deje de describir a ninguna postulación real. La mediana dice lo que efectivamente pasa en
    la mitad de los casos, que es la pregunta que el usuario tiene en la cabeza.

    Devuelve None si todavía no hay ninguna respuesta con fecha: un cero ahí sería mentira.
    """
    days = []
    for application in applications:
        first = min(
            history[application.id], key=lambda change: as_utc(change.changed_at), default=None
        )
        if first is None:
            continue
        # Se recorta en cero: una fecha de postulación cargada a mano puede quedar después de
        # la primera respuesta, y un "-3 días" no le sirve a nadie.
        days.append(max(0, (as_utc(first.changed_at).date() - application.applied_date).days))

    return round(median(days)) if days else None


def _reached(
    application: Application, stage: Status, history: dict[int, list[StatusChange]]
) -> bool:
    """Si alguna vez estuvo en ese estado, aunque hoy esté en otro.

    Postularse ya es haber alcanzado "aplicado", tenga historial o no.
    """
    if stage is Status.applied:
        return True
    return application.status is stage or any(
        change.to_status is stage for change in history[application.id]
    )
