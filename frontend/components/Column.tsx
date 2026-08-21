"use client";

import { useState } from "react";

import { ApplicationCard } from "@/components/ApplicationCard";
import { STATUS_LABELS, type Application, type Status } from "@/lib/types";

interface Props {
  status: Status;
  applications: Application[];
  onDropCard: (id: number, status: Status) => void;
  onEdit: (application: Application) => void;
}

export function Column({ status, applications, onDropCard, onEdit }: Props) {
  const [isOver, setIsOver] = useState(false);

  return (
    <section
      // Drag & drop nativo del navegador, sin librería: alcanza para mover una tarjeta entre
      // columnas. Una librería como dnd-kit se justificaría si hiciera falta reordenar dentro
      // de la columna o soportar teclado, que hoy no es el caso.
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
        if (id) onDropCard(id, status);
      }}
      className={`flex min-h-40 flex-col rounded-lg p-3 transition-colors ${
        isOver ? "bg-slate-200 ring-2 ring-slate-400" : "bg-slate-100"
      }`}
    >
      <h2 className="mb-3 flex items-center justify-between text-sm font-medium text-slate-700">
        {STATUS_LABELS[status]}
        <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">
          {applications.length}
        </span>
      </h2>

      <div className="flex flex-col gap-2">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} onEdit={onEdit} />
        ))}
        {applications.length === 0 && (
          <p className="text-sm text-slate-400">Sin postulaciones.</p>
        )}
      </div>
    </section>
  );
}
