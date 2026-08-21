"use client";

import { useState } from "react";

import { Strip } from "@/components/Strip";
import { STATUS_LABELS, type Application, type Status } from "@/lib/types";

interface Props {
  status: Status;
  applications: Application[];
  onDropStrip: (id: number, status: Status) => void;
  onMove: (id: number, status: Status) => void;
  onEdit: (application: Application) => void;
}

/** Color del rótulo de cada bahía. Solo tres bahías llevan señal: las otras dos son el curso
 *  normal y no necesitan gritar. */
const BAY_SIGNAL: Partial<Record<Status, string>> = {
  interview: "text-live",
  offer: "text-clear",
  rejected: "text-label-soft",
};

const EMPTY_BAY: Record<Status, string> = {
  applied: "Nada enviado todavía.",
  in_process: "Nada en curso.",
  interview: "Ninguna entrevista agendada.",
  rejected: "Ninguna cerrada.",
  offer: "Todavía ninguna.",
};

export function Bay({ status, applications, onDropStrip, onMove, onEdit }: Props) {
  const [isOver, setIsOver] = useState(false);

  return (
    <section
      // Drag & drop nativo del navegador, sin librería: alcanza para mover una tira entre
      // bahías. Los controles de flecha de cada tira cubren el teclado, así que dnd-kit
      // seguiría sin justificarse.
      onDragOver={(event) => {
        event.preventDefault(); // sin esto el navegador no permite soltar
        event.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const id = Number(event.dataTransfer.getData("text/plain"));
        if (id) onDropStrip(id, status);
      }}
      aria-label={`${STATUS_LABELS[status]}, ${applications.length} postulaciones`}
      className="flex min-h-0 flex-col"
    >
      <header className="rail flex items-baseline justify-between px-2.5 py-1.5">
        <h2
          className={`text-[0.6875rem] font-semibold uppercase tracking-[0.14em]
            ${BAY_SIGNAL[status] ?? "text-label"}`}
        >
          {STATUS_LABELS[status]}
        </h2>
        <data
          value={applications.length}
          className={`font-mono text-xs ${BAY_SIGNAL[status] ?? "text-label-soft"}`}
        >
          {applications.length.toString().padStart(2, "0")}
        </data>
      </header>

      <div
        className={`bay-well flex flex-1 flex-col gap-px p-px transition-colors
          ${isOver ? "bg-rail-edge" : ""}`}
      >
        {applications.map((application) => (
          <Strip
            key={application.id}
            application={application}
            onEdit={onEdit}
            onMove={onMove}
          />
        ))}

        {applications.length === 0 && (
          <p className="px-2.5 py-3 font-mono text-xs leading-relaxed text-label-soft">
            {EMPTY_BAY[status]}
          </p>
        )}
      </div>
    </section>
  );
}
