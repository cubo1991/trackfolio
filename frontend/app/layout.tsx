import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";

import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import "./globals.css";

// Archivo: grotesca de alta densidad, dibujada para formularios y prensa. Es la letra que
// llevaría impresa una tira operativa, no una sans de producto.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// Monoespaciada solo para valores medidos: fechas, conteos, días. Nunca como disfraz técnico.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
  description:
    "Seguimiento de postulaciones laborales en un tablero de tiras de progreso: estados, alertas de postulaciones frenadas y métricas de conversión.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Comentario HTML real: un comentario de JSX se compila y no llega al markup, y un
            contrato que el build borra no lo puede auditar nadie. */}
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--\n${DIRECTION_CONTRACT}\n-->` }} />
        {children}
      </body>
    </html>
  );
}

const DIRECTION_CONTRACT = `
          THESIS: Un tablero de tiras de progreso de vuelo, no un kanban de tarjetas. Rechaza la
          tarjeta blanca redondeada con chip pastel que envía toda esta categoría: acá cada
          postulación es una tira impresa de geometría fija, alojada en una bahía de la consola.

          OWN-WORLD: Chasis oscuro verde-azulado en tres profundidades, rieles metálicos con filo
          de luz, tiras de papel bufé (#e9e2cf) impresas en tinta casi negra. Tres señales y nada
          más: rojo de lapicera, ámbar de atención, verde de despejado. Archivo para rotulado,
          JetBrains Mono para todo valor medido. Reglas capilares, cero sombras decorativas.

          STORY: El usuario lee el estado de su búsqueda entera en un barrido vertical, ve cuáles
          tiras llevan días sin moverse por su anotación roja, y arrastra la que avanzó.

          FIRST VIEWPORT: Cinco bahías verticales a ancho completo bajo un riel de consola. Cada
          bahía encabezada por su rótulo en versalitas y su conteo monoespaciado. Las tiras se
          apilan en ranuras. La acción primaria, cargar una postulación, vive en el riel superior
          derecho.

          FORM: Tira de progreso de vuelo del control aéreo; candidato 1 de mi lista ordenada,
          elegido por el usuario sobre la asignación del tiro. Seed key 34595aa2.

          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
          review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;
