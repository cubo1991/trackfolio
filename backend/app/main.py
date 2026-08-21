from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.routers import applications, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="TrackFolio API", lifespan=lifespan)

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
