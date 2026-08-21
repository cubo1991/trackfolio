# TrackFolio

Tracker de postulaciones laborales con pipeline visual tipo Kanban, métricas de conversión y un
asistente con IA opcional para analizar ofertas.

> **Estado:** en desarrollo. El pipeline Kanban ya es usable de punta a punta: crear, editar y
> mover postulaciones entre columnas. Faltan los filtros y los tests de frontend para cerrar el
> MVP. El plan completo y el razonamiento detrás de cada decisión técnica están en
> [ROADMAP.md](ROADMAP.md).

## Stack

| Capa | Tecnologías |
|---|---|
| Backend | FastAPI, SQLModel, PostgreSQL, JWT |
| Frontend | Next.js, TypeScript, Zustand, Tailwind CSS |
| Testing | pytest (backend), Jest (frontend) |

## Qué hay hecho

- Modelo de datos multiusuario: `User` con roles, `Application` con tags, y `StatusChange` para
  el historial de transiciones.
- Autenticación con JWT: registro, login y control de acceso por rol.
- CRUD de postulaciones con aislamiento por usuario.
- 19 tests sobre los casos que importan: los de auth que tienen que fallar, el aislamiento entre
  usuarios y el registro del historial de estados.
- Frontend con login y registro, sesión persistente y guard de rutas.
- Pipeline Kanban con drag & drop entre columnas, usando la API nativa del navegador. El cambio
  de estado se refleja al instante y se revierte solo si el servidor lo rechaza.
- Alta, edición y borrado de postulaciones desde el tablero.

## Cómo correrlo

Necesitás Docker y Python 3.11+.

Levantar Postgres, desde la raíz del proyecto:

```bash
docker compose up -d
```

Preparar el entorno e instalar dependencias, desde `backend/`:

```bash
python -m venv .venv && .venv/Scripts/python.exe -m pip install -e ".[dev]"
```

Levantar la API:

```bash
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

La documentación interactiva queda en http://127.0.0.1:8000/docs, y desde ahí se puede probar la
API entera sin frontend: registrarse, copiar el token al botón **Authorize** y operar sobre las
postulaciones.

Los tests no necesitan Docker ni el servidor prendido:

```bash
.venv/Scripts/python.exe -m pytest -v
```

Y el frontend, desde `frontend/`:

```bash
npm install && npm run dev
```

Queda en http://localhost:3000. Necesita la API levantada; apunta a `http://127.0.0.1:8000` salvo
que definas `NEXT_PUBLIC_API_URL`.

## Configuración

Copiar `backend/.env.example` a `backend/.env` y ajustar. Los valores por defecto apuntan al
Postgres del `compose.yaml`, en el puerto 5435 para no chocar con instalaciones locales.
`SECRET_KEY` tiene un valor de desarrollo que **hay que cambiar** antes de cualquier deploy.
