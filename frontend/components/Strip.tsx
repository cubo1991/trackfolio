"use client";

import { IconChevronLeft, IconChevronRight, IconExternal, IconFlagged } from "@/components/icons";
import { STATUSES, STATUS_LABELS, type Application, type Status } from "@/lib/types";

interface Props {
  application: Application;
  onEdit: (application: Application) => void;
  onMove: (id: number, status: Status) => void;
}

/** "2026-01-15" → "15·01·26". Sin pasar por Date, que correría el día por zona horaria. */
function stripDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}·${month}·${year.slice(2)}`;
}

/**
 * Una tira de progreso. Su virtud es la geometría fija: todas imprimen los mismos campos en las
 * mismas posiciones, así barrer una bahía entera es mirar siempre al mismo lugar. El recuadro de
 * días sin movimiento es el equivalente del recuadro de nivel autorizado en una tira real.
 */
export function Strip({ application, onEdit, onMove }: Props) {
  const pulled = application.status === "rejected";
  const index = STATUSES.indexOf(application.status);

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(application.id));
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`stock group grid cursor-grab grid-cols-[1fr_auto_auto] items-stretch
        text-ink shadow-[0_1px_0_rgb(0_0_0/0.5)] transition-[transform,box-shadow] duration-150
        ease-out hover:-translate-y-px hover:shadow-[0_3px_8px_rgb(0_0_0/0.45)]
        active:cursor-grabbing
        ${pulled ? "bg-stock-pulled" : ""}`}
    >
      {/* La tira entera abre la ficha. Es un botón real y no una capa invisible por encima:
          una capa así se lleva por delante los controles que tiene debajo. */}
      <button
        onClick={() => onEdit(application)}
        className="min-w-0 cursor-[inherit] px-2.5 py-2 text-left"
        aria-label={`Abrir ${application.position} en ${application.company}${
          application.is_stale ? `, sin movimiento hace ${application.days_inactive} días` : ""
        }`}
      >
        <span
          className={`block truncate text-[0.9375rem] font-semibold leading-tight
            tracking-[-0.01em] ${pulled ? "line-through decoration-ink/40" : ""}`}
        >
          {application.company}
        </span>

        <span className="block truncate text-[0.8125rem] leading-snug text-ink-soft">
          {application.position}
        </span>

        <span className="mt-1 flex items-center gap-2 font-mono text-[0.6875rem] leading-none text-ink-soft">
          <time dateTime={application.applied_date}>{stripDate(application.applied_date)}</time>
          {application.tags.length > 0 && (
            <span className="truncate" title={application.tags.join(" ")}>
              {application.tags.join("  ")}
            </span>
          )}
          {application.url && <IconExternal className="ml-auto h-3 w-3 shrink-0" />}
        </span>
      </button>

      {/* Campo de días sin movimiento. Siempre en la misma posición y monoespaciado: es la
          columna que se lee de un barrido vertical. */}
      <div
        className={`flex w-11 shrink-0 flex-col items-center justify-center border-l text-center
          ${application.is_stale ? "border-pen/40 text-pen" : "border-ink/15 text-ink-soft"}`}
      >
        {application.is_stale && <IconFlagged className="mb-0.5 h-3 w-3" />}
        <data
          value={application.days_inactive}
          className="font-mono text-base font-medium leading-none"
        >
          {application.days_inactive}
        </data>
        <span className="mt-0.5 font-mono text-[0.5625rem] uppercase leading-none">
          días
        </span>
      </div>

      {/* Controles de bahía: la alternativa por teclado y por toque al arrastre. Se ocultan con
          visibility y no con opacity, así cuando no se ven tampoco reciben clicks ni foco. En
          pantallas táctiles no hay hover, así que ahí quedan siempre visibles. */}
      <div
        className="invisible flex w-5 shrink-0 flex-col border-l border-ink/15
          group-hover:visible group-focus-within:visible [@media(pointer:coarse)]:visible"
      >
        <BayButton
          direction="previous"
          target={STATUSES[index - 1]}
          onMove={(status) => onMove(application.id, status)}
        />
        <BayButton
          direction="next"
          target={STATUSES[index + 1]}
          onMove={(status) => onMove(application.id, status)}
        />
      </div>
    </article>
  );
}

function BayButton({
  direction,
  target,
  onMove,
}: {
  direction: "previous" | "next";
  target: Status | undefined;
  onMove: (status: Status) => void;
}) {
  // Sin bahía a la que ir, no hay control: un botón deshabilitado acá solo sumaría ruido.
  if (!target) return <span className="flex-1" aria-hidden="true" />;

  const Chevron = direction === "previous" ? IconChevronLeft : IconChevronRight;

  return (
    <button
      onClick={() => onMove(target)}
      className="flex flex-1 items-center justify-center text-ink-soft transition-colors
        hover:bg-ink/10 hover:text-ink"
      aria-label={`Mover a ${STATUS_LABELS[target]}`}
    >
      <Chevron className="h-3 w-3" />
    </button>
  );
}
