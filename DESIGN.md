# Design

Mundo visual de TrackFolio, documentado desde el build. Las decisiones de producto viven en
[PRODUCT.md](PRODUCT.md); acá va solo lo visual y duradero.

## La tesis

Un **tablero de tiras de progreso de vuelo**, no un kanban de tarjetas.

El control aéreo resolvió este problema hace sesenta años: muchos ítems, pocos estados,
decisiones rápidas, una tira de papel por vuelo que se mueve de bahía en bahía a medida que
progresa. Es el kanban original y está probado en operación real.

Lo que este mundo rechaza explícitamente es la tarjeta blanca redondeada con chip pastel y sombra
suave que envía toda la categoría. No por gusto: con 25 a 80 postulaciones vivas, el aire de esa
plantilla es scroll que falta.

## Escena física

Se usa de noche, después del trabajo, en una habitación donde la única luz es la pantalla. De ahí
el chasis oscuro. Las tiras son de papel bufé iluminado, como en una posición de control: **el
papel es lo único que brilla**. El modo oscuro no se eligió por categoría sino por esta escena.

## Paleta

Tintas contables. Tres profundidades de chasis, dos papeles, dos tintas de impresión, dos de
rotulado y tres señales. Nada más entra sin sacar algo.

| Token | Valor | Rol |
|---|---|---|
| `--color-console` | `#101416` | Fondo de la consola, con viñeta radial fija |
| `--color-bay` | `#171c1f` | Pozo de la bahía, hundido con sombra interior |
| `--color-rail` | `#232a2e` | Riel metálico de cabeceras, con filo de luz superior |
| `--color-rail-edge` | `#333d42` | Filo de luz, separaciones capilares, pulgar del scrollbar |
| `--color-stock` | `#e9e2cf` | Papel de la tira |
| `--color-stock-pulled` | `#d8d2c4` | Papel de la tira retirada de servicio (rechazada) |
| `--color-ink` | `#14181a` | Impresión sobre el papel |
| `--color-ink-soft` | `#54564f` | Impresión secundaria sobre el papel |
| `--color-label` | `#c7d0d4` | Rotulado sobre el chasis |
| `--color-label-soft` | `#8d9aa0` | Rotulado secundario sobre el chasis |
| `--color-pen` | `#a32d20` | Lapicera del controlador, **sobre papel** |
| `--color-pen-lit` | `#e8705f` | Lapicera, **sobre chasis** |
| `--color-live` | `#e0a02b` | Ámbar de atención: acción primaria, foco, entrevista |
| `--color-clear` | `#59a06a` | Verde de despejado: oferta |

Los grises están tintados hacia el verde-azul del equipo pintado. **Ninguno es gris neutro**, y
el texto secundario sobre una superficie de color se tinta desde ese color, nunca a gris.

**El rojo necesita dos tonos.** Un solo valor no llega a 4.5:1 sobre el papel y sobre el chasis a
la vez: `--color-pen` mide 5.50:1 sobre papel y `--color-pen-lit` 4.79:1 sobre el riel. Elegir uno
solo habría dejado un contraste roto en alguno de los dos fondos.

## Tipografía

- **Archivo** para rotulado y nombres. Es una grotesca dibujada para formularios y prensa de alta
  densidad: la letra que llevaría impresa una tira operativa, no una sans de producto.
- **JetBrains Mono** para **todo valor medido**, y solo para eso: fechas, conteos, días, tags,
  identificadores. La monoespaciada acá no es disfraz técnico — es lo que alinea las cifras en
  columna para que una bahía entera se lea de un barrido vertical.

Toda cifra lleva `font-variant-numeric: tabular-nums`, aplicado por selector a `time`, `data`,
`output` y `.tabular` para que ninguna se escape.

La jerarquía sale del **contraste de escala**: el nombre de la empresa a 15px semibold contra
etiquetas monoespaciadas de 9 a 11px. No hay cajas dentro de cajas ni capas de sombra.

## Componentes

### La tira

El objeto central. Su virtud es la **geometría de campos fija**: todas las tiras imprimen los
mismos campos en las mismas posiciones, así barrer una bahía es mirar siempre al mismo lugar.

```
┌──────────────────────────────┬──────┬─┐
│ EMPRESA                      │  25  │◀│
│ puesto                       │ DÍAS │▶│
│ 15·01·26  python fastapi     │      │ │
└──────────────────────────────┴──────┴─┘
```

El recuadro de días es el equivalente del recuadro de nivel autorizado en una tira real: ancho
fijo, monoespaciado, siempre a la derecha. Cuando supera el umbral se imprime en rojo de lapicera
con su marca circular.

Una tira rechazada se imprime en papel retirado de servicio, más apagado y con el nombre tachado.
**Nunca se marca como estancada**, aunque lleve un año quieta: ya terminó su recorrido.

Altura: 68px con tres campos. Densidad medida, no aproximada.

### La bahía

Riel metálico de cabecera con el rótulo en versalitas espaciadas y el conteo monoespaciado a dos
dígitos, sobre un pozo hundido donde se apilan las tiras separadas por ranuras de 1px. Solo tres
bahías llevan señal de color — entrevista en ámbar, oferta en verde, rechazado apagado — porque
aplicado y en proceso son el curso normal y no necesitan gritar.

Cada bahía vacía dice qué falta con su propia frase, no con un "sin resultados" genérico.

### Superficies del navegador

Selección en ámbar sobre tinta, cursor de texto ámbar, scrollbar con pulgar en el filo del riel,
anillo de foco ámbar de 2px con separación, y el subrayado de los enlaces separado del texto.
Nada queda con el default del navegador.

## Movimiento

**Un solo momento con autoría**: la tira se levanta del papel al pasar el puntero (1px de
traslación y sombra que se abre), y el panel lateral entra deslizándose 1.5rem con salida
exponencial. Nada más se mueve.

`prefers-reduced-motion` corta toda animación y transición a 0.01ms.

## Interacción

Arrastrar una tira entre bahías es el gesto central, con drag & drop nativo del navegador.

**La alternativa por teclado y por toque no es opcional**: cada tira lleva dos chevrones que la
mueven a la bahía anterior o siguiente. Se ocultan con `visibility`, **nunca con `opacity`** —
un control invisible con opacity sigue recibiendo clicks y foco, y en un tablero donde cada
control cambia el estado de una postulación eso significa cambios silenciosos que el usuario
nunca pidió. En pantallas táctiles, donde no hay hover, quedan siempre visibles.

## Accesibilidad

WCAG 2.2 AA como piso, verificado por medición y no por estimación. Todo el texto del build
supera 4.5:1:

| Elemento | Ratio |
|---|---|
| Empresa sobre papel | 13.8:1 |
| Puesto sobre papel | 5.76:1 |
| Puesto sobre papel retirado | 4.94:1 |
| Campo de días marcado | 5.50:1 |
| Conteo de marcadas en cabecera | 4.79:1 |
| Rótulo de bahía | 9.29:1 |
| Etiqueta de filtro | 5.04:1 |

## Adaptación

El tablero es de cinco bahías con un mínimo de 13rem cada una. Por debajo de ~65rem el tablero
scrollea horizontalmente **dentro de su propio contenedor**: la página nunca scrollea en
horizontal. Es la decisión correcta para un tablero denso — apilar las bahías en una columna
destruiría la lectura que justifica el formato.

## Nombre

No hay logo ni wordmark. El nombre del producto no está confirmado y vive en
[`lib/brand.ts`](frontend/lib/brand.ts), declarado una sola vez, para que cambiarlo sea una
edición y no una refactorización.
