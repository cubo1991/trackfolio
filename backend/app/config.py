from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://trackfolio:trackfolio@localhost:5435/trackfolio"

    # 32 bytes es el mínimo que recomienda RFC 7518 §3.2 para HMAC-SHA256. Con menos, PyJWT
    # firma igual pero avisa; se valida acá para que no llegue a producción una clave corta.
    secret_key: str = Field(
        default="dev-only-cambiar-en-produccion-32b", min_length=32
    )

    access_token_expire_minutes: int = 60 * 24

    # Orígenes autorizados a llamar la API desde el navegador. En producción se sobreescribe
    # por entorno con el dominio del frontend.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
