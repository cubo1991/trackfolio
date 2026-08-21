# TrackFolio — Roadmap

Tracker de postulaciones laborales con pipeline Kanban, métricas y asistente IA opcional.

**Regla de avance:** cada etapa se cierra cuando cumple su criterio de "listo". No se arranca la
siguiente con la anterior a medio terminar — el objetivo es que el repo sea presentable en
cualquier commit, no solo al final.

---

## Fase 1 — MVP

### Etapa 0 — Base del repo
- `git init`, `.gitignore`, monorepo `backend/` + `frontend/`.
- `backend/pyproject.toml` con deps mínimas, `.env.example`.
- `compose.yaml` con Postgres (solo la DB; la app corre nativa).

**Listo cuando:** `docker compose up -d` levanta Postgres y el repo tiene su primer commit.

### Etapa 1 — Modelo de datos
- `User` (email, hashed_password, role, created_at).
- `Application` (user_id, company, position, applied_date, status, url, notes, tags, timestamps).
- `StatusChange` (application_id, from_status, to_status, changed_at).
- Creación de tablas al arrancar la app (sin Alembic todavía, ver Decisiones).

**Listo cuando:** las tablas se crean contra Postgres y se puede insertar/leer desde una consola.

### Etapa 2 — Auth
- Registro y login con JWT (`/auth/register`, `/auth/login`).
- Hash de passwords con bcrypt.
- Dependencies `get_current_user` y `require_admin`.

**Listo cuando:** un token válido identifica al usuario y uno inválido/expirado devuelve 401.

### Etapa 3 — CRUD de postulaciones + tests
- `GET/POST/PATCH/DELETE /applications`.
- Ownership: cada usuario ve y toca solo lo suyo; admin ve todo.
- Registro automático de `StatusChange` cuando cambia el estado.
- Tests con pytest sobre SQLite en memoria: auth, ownership, transición de estado.

**Listo cuando:** la suite pasa en verde y cubre los tres casos de arriba.

### Etapa 4 — Frontend: base
- Next.js + TypeScript + Tailwind.
- Cliente `lib/api.ts` con el header de auth, tipos espejo del backend.
- Pantalla de login y guard de rutas.

**Listo cuando:** se puede loguear desde el navegador y la sesión sobrevive un refresh.

### Etapa 5 — Kanban
- Cinco columnas por estado, tarjetas de postulación.
- Store de Zustand con el estado del tablero.
- Drag & drop entre columnas → PATCH al backend, con optimistic update y rollback si falla.

**Listo cuando:** mover una tarjeta persiste el estado, y si la API falla la tarjeta vuelve sola a
su columna original.

### Etapa 6 — Filtros y búsqueda
- Por empresa (texto), estado, tags y rango de fechas.
- Filtrado en el backend vía query params (no filtrar en el cliente: no escala y además el
  endpoint filtrable es lo que se muestra en un README).

**Listo cuando:** combinar varios filtros devuelve el subconjunto correcto.

### Etapa 7 — Tests de frontend
- Jest sobre la lógica del store: mover tarjeta, rollback, aplicar filtros.
- Sin tests de render de componentes por ahora (ver Decisiones).

**Listo cuando:** la suite pasa y cubre el rollback, que es la lógica más fácil de romper.

> **Fin de Fase 1.** Acá el proyecto ya es usable para trackear la búsqueda real.

---

## Fase 2 — Métricas e IA

### Etapa 8 — Alertas de seguimiento
- Postulaciones sin movimiento después de X días (X configurable por usuario).
- Cálculo sobre `StatusChange` / `updated_at`, sin tareas programadas: se evalúa al pedir la lista.

**Listo cuando:** una postulación vieja aparece marcada y el umbral es configurable.

### Etapa 9 — Dashboard de métricas
- Tasa de respuesta, tiempo promedio a primera respuesta, funnel aplicado → entrevista → oferta.
- Gráficos con Recharts.
- Cálculo en el backend (`services/metrics.py`), el frontend solo dibuja.

**Listo cuando:** los números coinciden con los datos reales cargados.

### Etapa 10 — Asistente IA (opcional)
- Pegar el texto de una oferta → sugerencia de tags de stack + resumen de fit contra un perfil.
- API de Anthropic, key por variable de entorno, endpoint aislado del resto.

**Listo cuando:** funciona con key configurada y el resto de la app funciona igual sin ella.

### Etapa 11 — Deploy
- Front en Vercel, back en Railway o Render, Postgres administrado.
- Alembic acá sí: con datos reales en producción, `create_all` deja de alcanzar.

**Listo cuando:** la app corre en las URLs públicas con los datos reales.

### Etapa 12 — README
Documento final que cuenta las decisiones, no solo cómo instalar. Insumo: la sección de abajo.

---

## Decisiones técnicas (insumo para el README)

Se van completando a medida que se toman. Las de arranque:

- **Sin repository/service layer en el CRUD.** Los routers hablan directo con la sesión de
  SQLModel. Un repositorio con una sola implementación es indirección sin beneficio a esta escala.
  `services/` aparece en la Etapa 9, cuando las métricas justifican lógica fuera del router.

- **Tags como JSONB, no tabla many-to-many.** Son etiquetas libres sin metadata propia. Postgres
  filtra con `@>` y un índice GIN si hiciera falta. Si algún día los tags necesitan color o
  conteo global, ahí se migra a tabla.

- **`StatusChange` desde la Etapa 1, aunque las métricas sean Fase 2.** Las métricas se calculan
  sobre transiciones históricas y los datos que no se capturan no se reconstruyen. Como el
  dogfooding arranca en Fase 1, capturar la transición desde el día uno cuesta cinco líneas.

- **Rol como columna, no sistema de permisos.** Dos roles con semántica fija se resuelven con una
  dependency y un filtro por `user_id`.

- **`create_all` en vez de Alembic hasta el deploy.** Mientras el esquema cambia todos los días y
  la DB es descartable, las migraciones son costo puro. Alembic entra en la Etapa 11, donde hay
  datos que no se pueden perder.

- **SQLite en memoria para los tests del backend, con las claves foráneas activadas.** La suite
  corre sin Postgres levantado y en segundos. El riesgo es que SQLite y Postgres no se comportan
  igual: por defecto SQLite ignora las claves foráneas, así que un borrado que dejaba huérfanas
  las filas de historial pasaba los tests y explotaba contra Postgres. Se activa
  `PRAGMA foreign_keys=ON` en los tests para cerrar esa clase de diferencia, y las queries de
  filtrado se prueban además contra Postgres en la Etapa 6 por el tema JSONB.

- **Borrado en cascada declarado en la base (`ON DELETE CASCADE`), no en el router.** Borrar la
  postulación se lleva su historial por constraint. Limpiar a mano desde el endpoint dependía de
  que SQLAlchemy ordenara los DELETE en el orden correcto, cosa que sin una relación declarada no
  hace.

- **bcrypt directo, sin passlib.** Passlib agrega una capa de abstracción sobre esquemas de hash
  que acá no se necesita (hay uno solo) y arrastra un problema conocido de compatibilidad con
  bcrypt 4.x. Hashear y verificar son una línea cada una con la librería `bcrypt`. Se valida el
  límite de 72 bytes en el borde: bcrypt trunca en silencio más allá de eso.

- **Timestamps con zona horaria (`TIMESTAMP WITH TIME ZONE`).** El default de SQLAlchemy es sin
  zona y devuelve datetimes naive; restarlos contra un `now()` aware es un `TypeError`, y eso es
  justo lo que hacen las alertas y las métricas de la Fase 2. Cuesta una función y evita un bug
  garantizado más adelante.

- **Login con el mismo error y el mismo tiempo para email inexistente y password incorrecta.**
  Mensajes distintos permiten enumerar qué emails están registrados; tiempos distintos también,
  así que contra un email inexistente igual se verifica contra un hash descartable.

- **El token va en `localStorage`, no en una cookie httpOnly.** Una cookie httpOnly no es
  legible por JavaScript y por lo tanto un XSS no la puede robar, que es la opción más segura.
  No se usa acá porque el front y la API viven en dominios distintos: haría falta `SameSite=None`
  con `Secure` más protección CSRF propia. Es mucha maquinaria para una app de un solo usuario,
  pero es la primera decisión a revisar si esto alguna vez guarda datos de terceros.

- **El guard de rutas es de cliente y no protege nada.** Solo evita mostrar una pantalla vacía
  mientras se redirige. Lo que protege los datos es que la API rechaza todo request sin token
  válido; el frontend no es una frontera de seguridad y no conviene escribirlo como si lo fuera.

- **Tres estados de sesión (`loading` / `authenticated` / `anonymous`), no un booleano.** Al
  montar la app todavía no se sabe si el token guardado sirve. Tratar esa incertidumbre como "no
  autenticado" hace que la app patee al login por un instante en cada refresh.

- **Los tipos del frontend son un espejo escrito a mano de los esquemas del backend.** Generarlos
  desde el OpenAPI agregaría un paso de build para ahorrar unas treinta líneas que casi no
  cambian. Si el modelo empieza a moverse seguido, ahí conviene generar.

- **CORS con lista explícita de orígenes, no `*`.** Con `allow_credentials` el comodín ni
  siquiera es válido, y en producción va a ser el dominio del front y nada más.

- **Drag & drop con la API nativa del navegador, sin librería.** `draggable` más
  `dragstart`/`dragover`/`drop` alcanza para mover una tarjeta entre columnas, y son unas quince
  líneas. Una librería como dnd-kit se justificaría si hiciera falta reordenar dentro de la
  columna o soportar teclado; hoy no es el caso, y es una dependencia menos que mantener.

- **Optimistic update con rollback explícito.** La tarjeta se mueve apenas la soltás, sin esperar
  al servidor: es lo que hace que el tablero se sienta instantáneo. Si el PATCH falla, la tarjeta
  vuelve sola a su columna y aparece un aviso. Sin el rollback la UI mentiría sobre el estado
  real, que es peor que ser lenta.

- **Agrupar por estado una sola vez.** Filtrar el array completo dentro de cada columna serían
  cinco recorridas por render. Un solo agrupado previo hace lo mismo en una.

- **`<input type="date">` nativo.** Da calendario, validación y localización sin una línea de
  código ni un date picker de terceros.

- **El filtro por tag se resuelve en Python, no en SQL.** En Postgres sería `tags @> '["x"]'` con
  índice GIN, pero ese operador no existe en SQLite y la suite terminaría corriendo contra un
  dialecto distinto al de producción, que es justo la clase de divergencia que ya rompió el
  borrado en cascada. Para un tracker personal (cientos de filas) la diferencia no se nota; el
  reemplazo, cuando se note, es el operador nativo con índice. Los otros cuatro filtros sí van
  en SQL, donde se comportan igual en los dos motores.

- **Búsqueda por empresa con `ilike` y coincidencia parcial.** Buscar "acme" tiene que encontrar
  "ACME S.A.": en Postgres `like` distingue mayúsculas y `ilike` no, y en SQLite dan lo mismo.
  Se usa el que es correcto en producción.

- **Un solo `useEffect` con retraso para la carga inicial y los filtros.** Sin el retraso, escribir
  "globant" en la búsqueda dispara siete requests. Con 250 ms de espera dispara uno, y el mismo
  efecto cubre la carga al abrir el tablero sin necesitar un camino aparte.

- **Las alertas se calculan al leer, no se guardan.** Un `is_stale` guardado quedaría viejo al día
  siguiente sin que nadie toque la postulación, y mantenerlo al día pediría una tarea programada
  para algo que es una resta de fechas. Se calcula en `ApplicationRead.from_application`, que
  recibe el `now` por parámetro para poder fijar el día en los tests sin parchear el reloj.

- **Los estados terminales nunca se marcan.** Avisar que una postulación rechazada hace un año
  "no se mueve" llena el tablero de alertas que no accionan nada. La alerta sirve solo si implica
  hacer algo, y sobre una rechazada no hay nada que hacer.

- **El umbral es por usuario, no una constante.** Quien aplica a cinco puestos por semana no tiene
  el mismo ritmo que quien aplica a cinco por mes. Se valida entre 1 y 365: en 0 marcaría todo y
  en mil días no marcaría nunca.

- **`as_utc()` para toda la aritmética de fechas.** Postgres devuelve los `TIMESTAMPTZ` con zona
  horaria y SQLite los devuelve naive aunque la columna se declare `timezone=True`. Restar uno
  contra otro explota, y explotó: los tests de esta etapa lo destaparon. Se normaliza en un solo
  lugar por donde pasan todos los cálculos, en vez de parchear cada resta.

- **La mediana y no la media para el tiempo a primera respuesta.** Una sola empresa que contesta
  a los noventa días corre la media lo suficiente como para que deje de describir a ninguna
  postulación real: con 2, 4, 6 y 90 días la media da 25 y la mediana da 5. La mediana responde
  la pregunta que el usuario tiene en la cabeza, que es qué pasa en la mitad de los casos.

- **El embudo se calcula sobre el historial, no sobre el estado actual.** Una postulación
  rechazada hoy que pasó por una entrevista tiene que contar en la etapa de entrevista; mirar
  solo dónde está hoy borraría la mitad del recorrido. Esta es la razón por la que `StatusChange`
  se escribe desde la Etapa 1.

- **Un rechazo cuenta como respuesta.** Contarlo como silencio inflaría la tasa justo en las
  búsquedas donde peor te trataron. Y sin respuestas todavía, el tiempo mediano es `null` y no
  cero: un cero diría "contestan al toque", que es lo contrario de lo que pasa.

- **Las métricas ignoran los filtros del tablero.** Una tasa de respuesta calculada sobre un
  subconjunto filtrado se lee como si fuera la global y engaña. Si alguna vez hace falta
  segmentar, va a tener que decir en pantalla sobre qué se calculó.

- **El embudo es una rampa ordinal de un solo tono, no colores categóricos.** Las etapas están
  ordenadas —postularse viene antes que entrevistar— y colores distintos sugerirían que son cosas
  distintas en vez de momentos del mismo recorrido. La rampa se validó con el script de la guía
  de visualización contra el papel, no a ojo.

- **El asistente es opcional de verdad, no opcional en el papel.** Sin `ANTHROPIC_API_KEY` el
  endpoint devuelve 503 con un mensaje que dice qué falta, el frontend consulta
  `/assistant/status` y directamente no dibuja la función. Nada de un botón que promete algo y
  después explota. Hay un test que verifica que el resto de la app —CRUD, filtros, métricas—
  responde 200 con la key ausente.

- **Salida estructurada en vez de parsear texto libre.** Se le pasa un esquema Pydantic y la API
  valida la respuesta contra él. Sin eso habría que parsear prosa y rezar para que el formato se
  respete, que es la clase de fragilidad que aparece recién en producción.

- **Ningún test llama a la API de verdad.** Una suite que sale a internet es lenta, falla por
  motivos ajenos al código y cuesta plata por corrida. Además lo que hay que fijar no es que el
  modelo acierte —eso no es determinista— sino cómo se comporta el endpoint en los tres casos que
  sí controlamos: sin key, con el proveedor caído y con una respuesta válida.

- **Los errores del proveedor se traducen en el borde.** Un timeout de Anthropic es un 502 con
  un mensaje legible, no un 500 con el stack de otra empresa adentro. Hay un test que verifica
  que el detalle del error interno no se filtre al usuario.

- **Las sugerencias del modelo nunca se aplican solas.** Los tags detectados se agregan con un
  click. Son los tags del usuario y el modelo se puede equivocar.

- **Jest solo sobre la lógica del store.** Es lógica pura, sin DOM: alto valor por test y no se
  rompe cuando cambia el markup. Los tests de render con Testing Library se agregan si aparece un
  componente con lógica propia que valga la pena fijar. Por lo mismo el entorno es `node` y no
  `jsdom`: arranca más rápido y no hace falta.

- **Se mockea el módulo de la API completo.** El store no debería saber si del otro lado hay una
  red. Lo que hay que poder provocar a voluntad es el fallo, que contra un servidor que anda bien
  es imposible de reproducir — y el fallo es justo el camino donde vive el rollback.

- **El test del optimistic update deja la promesa pendiente a propósito.** Es la única forma de
  observar el estado intermedio y comprobar que la tarjeta se movió *antes* de que el servidor
  respondiera. Si el store esperara la respuesta, el tablero se sentiría trabado en cada arrastre
  y ningún test que solo mire el resultado final lo notaría.

- **Cada test se escribió rompiendo primero el código.** Un test que pasa igual con la lógica rota
  no prueba nada. El del rollback se verificó sacando la línea que restaura la tarjeta: falla con
  "Expected: applied, Received: offer", que es exactamente el bug que tiene que atajar.
