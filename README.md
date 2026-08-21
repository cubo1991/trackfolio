# TrackFolio

Tracker de postulaciones laborales con pipeline visual tipo Kanban, métricas de conversión y un
asistente con IA opcional para analizar ofertas.

> **Estado:** en desarrollo. La Fase 1 (MVP) está cerrada y la Fase 2 en curso: el pipeline es
> usable de punta a punta y ya avisa de las postulaciones frenadas. Faltan el dashboard de
> métricas, el asistente de IA y el deploy. El plan completo y el razonamiento detrás de cada
> decisión técnica están en [ROADMAP.md](ROADMAP.md).

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
- Filtros combinables por empresa, estado, tag y rango de fechas, resueltos en el servidor.
- 15 tests de Jest sobre la lógica del tablero, con el módulo de la API mockeado para poder
  forzar los fallos: el optimistic update, el rollback y el borrado que se revierte.
- Alertas de seguimiento: las postulaciones sin movimiento aparecen marcadas, con el umbral de
  días configurable por usuario.
- Reporte de conversión: tasa de respuesta, mediana de días a la primera respuesta y embudo
  aplicado → entrevista → oferta, calculado sobre el historial real de transiciones.
- Asistente de ofertas (opcional): se pega el texto de una oferta y sugiere los tags de stack
  detectados y qué tan bien encaja contra un perfil configurado. Requiere `ANTHROPIC_API_KEY`;
  sin ella, la app funciona igual y la función simplemente no aparece.

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

Los tests del frontend tampoco necesitan servidor:

```bash
npm test
```

## Configuración

Copiar `backend/.env.example` a `backend/.env` y ajustar. Los valores por defecto apuntan al
Postgres del `compose.yaml`, en el puerto 5435 para no chocar con instalaciones locales.
`SECRET_KEY` tiene un valor de desarrollo que **hay que cambiar** antes de cualquier deploy.

`ANTHROPIC_API_KEY` es opcional y solo habilita el asistente de ofertas. El resto de TrackFolio
no depende de ella.
