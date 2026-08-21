---
version: 1
slug: "frontend-app-board-page-tsx"
primary_target: "frontend/app/board/page.tsx"
related_targets: ["frontend/components/Strip.tsx","frontend/components/Bay.tsx","frontend/components/FilterBar.tsx"]
---

Alcance: el tablero (`/board`), su riel de filtros, la tira, la bahía y el panel de ficha.
Modo: Operate.

Audiencia y tarea: una persona en búsqueda laboral activa, en sesiones cortas y frecuentes.
Entra a registrar una postulación nueva, mover una que avanzó, o ver qué quedó frenado. No es
una sesión de análisis: es un gesto rápido, varias veces por semana.

Contenido: entre 25 y 80 postulaciones vivas, cinco bahías fijas, tags libres, y el conteo de
días sin movimiento calculado al leer.

Restricciones: densidad por sobre aire; la lectura de una bahía entera de un barrido vertical es
el criterio que gana cualquier discusión de espaciado. El arrastre necesita equivalente por
teclado y por toque.

Dirección elegida: tira de progreso de vuelo del control aéreo. Elegida por el usuario sobre la
asignación del tiro (seed 34595aa2), que había asignado el cuaderno de laboratorio.

Momento memorable: el recuadro de días a la derecha de cada tira, siempre en la misma posición,
que se imprime en rojo de lapicera cuando la postulación se frenó. Es la única cosa del tablero
que pide acción y se lee sin buscarla.

Riesgo asumido y resuelto: la tira de una sola línea peleaba con tags, fecha y alerta. Se resolvió
tratándola como el formulario impreso que es en realidad — geometría de campos fija en tres
renglones — en vez de como una franja de texto.

Sin resolver: el dashboard de métricas de la Fase 2 todavía no tiene composición decidida; hereda
este mundo pero su estructura se decide cuando se construya.
