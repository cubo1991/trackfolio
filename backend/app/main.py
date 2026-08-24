from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import applications, assistant, auth, metrics

# El esquema lo crea/actualiza Alembic (`alembic upgrade head`), no la app al arrancar: con
# datos de producción que no se pueden perder, create_all ya no alcanza.
app = FastAPI(title="TrackFolio API")

# Lista explícita de orígenes, no "*": con allow_credentials el comodín ni siquiera es válido,
# y en producción va a ser el dominio del front y nada más.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(metrics.router)
app.include_router(assistant.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
