# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuario primario: una persona en búsqueda laboral activa, con perfil técnico, que trackea sus
propias postulaciones. Trabaja en sesiones cortas y frecuentes — abre el tablero para registrar
una postulación nueva, mover una que avanzó, o chequear qué quedó frenado. No es una sesión de
análisis larga: es un gesto rápido, varias veces por semana.

Audiencia secundaria: reclutadores técnicos que evalúan el proyecto como pieza de portfolio.
No usan el producto; lo inspeccionan. Miran el código y la interfaz como evidencia de criterio.

El producto está diseñado multiusuario desde el modelo de datos (roles admin/usuario, aislamiento
por usuario verificado con tests), aunque hoy lo use una sola persona.

## Product Purpose

Reemplazar la planilla de cálculo con la que la mayoría de la gente trackea su búsqueda laboral.
El éxito es que el usuario sepa, de un vistazo, en qué estado está cada postulación y cuáles
necesitan seguimiento — y que registrar eso cueste menos que abrir una planilla.

## Positioning

La combinación de tres cosas que un tracker genérico no tiene junto: pipeline visual con estados
propios de una búsqueda laboral, alertas de postulaciones frenadas calculadas sobre el historial
real de transiciones, y métricas de conversión sobre los datos propios del usuario.

Como pieza de portfolio, la tesis explícita es: **la calidad de la herramienta es el argumento.**
No hay concesiones decorativas. Lo que tiene que impresionar es el nivel de detalle y pulido de
algo que es, ante todo, denso y rápido.

## Operating Context

- Escala esperada: entre 25 y 80 postulaciones vivas en el tablero a la vez. Las columnas
  necesitan scroll propio y las tarjetas tienen que ser compactas sin volverse ilegibles.
- Uso principal en escritorio, en sesiones cortas. El móvil no es el escenario principal pero la
  interfaz no puede romperse ahí.
- Idioma de la interfaz: español.
- Cinco estados fijos en el pipeline: aplicado, en proceso, entrevista, rechazado, oferta.
  Rechazado y oferta son terminales.
- El usuario arrastra tarjetas entre columnas para cambiar el estado. Ese es el gesto central.

## Capabilities and Constraints

Confirmado y funcionando:

- Auth con JWT, registro y login, roles admin/usuario.
- CRUD de postulaciones con aislamiento por usuario.
- Kanban con drag & drop, actualización optimista y rollback ante error de la API.
- Filtros combinables por empresa, estado, tag y rango de fechas, resueltos en el servidor.
- Alertas de postulaciones sin movimiento, con umbral en días configurable por usuario.
- Historial de transiciones de estado, que alimenta las métricas.

Pendiente (Fase 2): dashboard de métricas con Recharts, asistente de IA opcional para analizar
ofertas pegadas como texto, deploy.

Restricciones técnicas: Next.js (App Router) + TypeScript + Tailwind + Zustand en el frontend;
FastAPI + SQLModel + PostgreSQL en el backend. El token vive en localStorage, decisión documentada
con su compromiso de seguridad.

## Brand Commitments

**El nombre "TrackFolio" no está confirmado.** Es un nombre de trabajo y puede cambiar. Por eso no
se le diseña identidad gráfica propia: sin logo, sin wordmark, sin marca que dependa de él. El
nombre se declara en un solo lugar del código para que cambiarlo sea una edición y no una
refactorización.

No hay activos de marca existentes, ni paleta, ni tipografía heredada que preservar.

## Evidence on Hand

Datos reales de la propia búsqueda del usuario (dogfooding). No hay testimonios, clientes,
métricas de uso, ni casos de éxito: nada de eso debe inventarse en la interfaz ni en copy.

Al momento de escribir esto el tablero tiene tres postulaciones de ejemplo cargadas durante el
desarrollo, no datos reales.

## Product Principles

1. **La densidad es una función, no un descuido.** Con 80 postulaciones vivas, el aire que sobra
   es scroll que falta. Cada píxel de espacio tiene que ganarse su lugar.
2. **El estado se lee, no se calcula.** El usuario tiene que ver en qué anda su búsqueda sin
   contar tarjetas ni abrir nada.
3. **Una alerta sirve solo si implica hacer algo.** Nada de avisos sobre lo que ya terminó.
4. **La interfaz nunca miente sobre el servidor.** Si un cambio no se guardó, la pantalla lo
   refleja: de ahí el rollback en cada operación optimista.
5. **El pulido es el argumento de portfolio.** Ninguna decisión visual se justifica por "queda
   lindo"; se justifica porque hace la herramienta mejor.

## Accessibility & Inclusion

Sin requisito normativo declarado por el usuario. Se adopta WCAG 2.2 AA como piso profesional,
por dos razones: el producto se muestra a evaluadores técnicos que pueden auditarlo, y el gesto
central (arrastrar tarjetas) necesita un equivalente accesible por teclado para no dejar afuera
a quien no usa mouse.
