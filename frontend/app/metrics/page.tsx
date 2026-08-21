"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { AuthGuard } from "@/components/AuthGuard";
import { IconChevronLeft } from "@/components/icons";
import { ApiError, api } from "@/lib/api";
import { STATUS_LABELS, type Metrics } from "@/lib/types";

/**
 * Rampa ordinal de un solo tono, ámbar del mundo de la consola, validada contra el papel
 * (#e9e2cf) con el validador de la guía: monotonía de luminosidad, saltos visibles entre pasos
 * y el extremo claro despegado del fondo a 2.35:1.
 *
 * Es rampa y no paleta categórica porque las etapas del embudo están ordenadas: postularse viene
 * antes que entrevistar, que viene antes que la oferta. Colores categóricos ahí sugerirían que
 * son cosas distintas y no momentos del mismo recorrido.
 */
const FUNNEL_RAMP = ["#c08a25", "#8f5c10", "#4f3106"];

function Metrics_() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .metrics()
      .then(setMetrics)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "No se pudieron leer las métricas."),
      );
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="rail flex items-center gap-3 px-4 py-2">
        <Link
          href="/board"
          className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.16em]
            text-label-soft transition-colors hover:text-label"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Tablero
        </Link>
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-label">
          Reporte de conversión
        </h1>
      </header>

      <div className="flex flex-1 justify-center p-4 sm:p-8">
        {/* La hoja de reporte: el mismo papel de las tiras, apoyada sobre la consola. */}
        <section className="stock w-full max-w-3xl p-6 text-ink shadow-[0_12px_40px_rgb(0_0_0/0.5)] sm:p-8">
          {error && (
            <p role="alert" className="border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen">
              {error}
            </p>
          )}

          {!error && !metrics && (
            <p className="font-mono text-xs text-ink-soft">Calculando…</p>
          )}

          {metrics && (metrics.total === 0 ? <Vacio /> : <Reporte metrics={metrics} />)}
        </section>
      </div>
    </main>
  );
}

function Vacio() {
  return (
    <div className="py-8">
      <h2 className="text-lg font-semibold">Todavía no hay nada que medir.</h2>
      <p className="mt-1 max-w-md text-sm text-ink-soft">
        Las métricas salen de tus postulaciones y de cómo se van moviendo entre bahías. Cargá la
        primera y este reporte empieza a llenarse solo.
      </p>
      <Link
        href="/board"
        className="mt-4 inline-block bg-ink px-4 py-1.5 font-mono text-xs font-medium uppercase
          tracking-wider text-stock transition-opacity hover:opacity-85"
      >
        Ir al tablero
      </Link>
    </div>
  );
}

function Reporte({ metrics }: { metrics: Metrics }) {
  const { total, responded, response_rate, median_days_to_first_response: mediana } = metrics;
  const sinRespuesta = total - responded;

  const datos = metrics.funnel.map((etapa, i) => ({
    etapa: STATUS_LABELS[etapa.stage],
    count: etapa.count,
    // Conversión respecto de la etapa anterior: es la pregunta real ("de las que llegaron a
    // entrevista, ¿cuántas terminaron en oferta?"), no la proporción sobre el total.
    desdeAnterior:
      i === 0 || metrics.funnel[i - 1].count === 0
        ? null
        : etapa.count / metrics.funnel[i - 1].count,
  }));

  return (
    <>
      {/* La cifra que encabeza el reporte. Figuras proporcionales y no tabulares: a este
          tamaño, tabulares dejan el número suelto. */}
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-soft">
        Tasa de respuesta
      </p>
      <p className="mt-1 text-6xl font-semibold leading-none tracking-[-0.03em] [font-variant-numeric:proportional-nums]">
        {Math.round(response_rate * 100)}
        <span className="text-3xl text-ink-soft">%</span>
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        {responded} de {total} postulaciones tuvieron alguna respuesta.{" "}
        {sinRespuesta > 0 && `${sinRespuesta} siguen sin contestar.`}
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
        <Dato etiqueta="Postulaciones" valor={total} />
        <Dato etiqueta="Con respuesta" valor={responded} />
        <Dato
          etiqueta="Mediana a 1ª respuesta"
          valor={mediana === null ? "—" : mediana}
          unidad={mediana === null ? "sin datos aún" : mediana === 1 ? "día" : "días"}
        />
      </dl>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Embudo de conversión</h2>
        <p className="mt-0.5 text-[0.8125rem] text-ink-soft">
          Cuántas postulaciones alcanzaron cada instancia, contando también las que después se
          cerraron.
        </p>

        <div className="mt-4" style={{ height: datos.length * 56 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ left: 0, right: 56, top: 0, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, Math.max(total, 1)]} />
              <YAxis
                type="category"
                dataKey="etapa"
                width={92}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#54564f", fontSize: 12, fontFamily: "var(--font-archivo)" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false}>
                {datos.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_RAMP[i]} />
                ))}
                {/* Etiqueta directa en cada barra: con tres barras, una leyenda sería un
                    intermediario de más entre el dato y su nombre. */}
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={10}
                  style={{ fill: "#14181a", fontSize: 13, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vista de tabla: el gráfico no puede ser la única forma de leer el dato. */}
        <table className="mt-4 w-full border-collapse text-left">
          <caption className="sr-only">Embudo de conversión en números</caption>
          <thead>
            <tr className="border-b border-ink/20">
              {["Instancia", "Postulaciones", "Desde la anterior"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="py-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-soft"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((fila) => (
              <tr key={fila.etapa} className="border-b border-ink/10">
                <th scope="row" className="py-1.5 text-[0.8125rem] font-medium">
                  {fila.etapa}
                </th>
                <td className="py-1.5 font-mono text-[0.8125rem] tabular-nums">{fila.count}</td>
                <td className="py-1.5 font-mono text-[0.8125rem] tabular-nums text-ink-soft">
                  {fila.desdeAnterior === null ? "—" : `${Math.round(fila.desdeAnterior * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Dato({
  etiqueta,
  valor,
  unidad,
}: {
  etiqueta: string;
  valor: number | string;
  unidad?: string;
}) {
  return (
    <div className="stock px-3 py-3">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-soft">
        {etiqueta}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold leading-none [font-variant-numeric:proportional-nums]">
          {valor}
        </span>
        {unidad && <span className="text-[0.8125rem] text-ink-soft">{unidad}</span>}
      </dd>
    </div>
  );
}

export default function MetricsPage() {
  return (
    <AuthGuard>
      <Metrics_ />
    </AuthGuard>
  );
}
