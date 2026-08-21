"use client";

import type { Application } from "@/lib/types";

interface Props {
  application: Application;
  onEdit: (application: Application) => void;
}

/** Fecha ISO ("2026-08-21") a formato local, sin pasar por Date para no correrla de día
 *  por zona horaria. */
function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function ApplicationCard({ application, onEdit }: Props) {
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(application.id));
        event.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{application.company}</h3>
        <button
          onClick={() => onEdit(application)}
          aria-label={`Editar ${application.position} en ${application.company}`}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-900"
        >
          Editar
        </button>
      </div>

      <p className="text-sm text-slate-600">{application.position}</p>
      <p className="mt-1 text-xs text-slate-400">{formatDate(application.applied_date)}</p>

      {application.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {application.tags.map((tag) => (
            <li
              key={tag}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {application.url && (
        <a
          href={application.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
        >
          Ver oferta
        </a>
      )}
    </article>
  );
}
