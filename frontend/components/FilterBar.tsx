"use client";

import { IconSearch } from "@/components/icons";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { useBoardStore } from "@/stores/board";

const FIELD =
  "h-7 rounded-none border border-rail-edge bg-console px-2 font-mono text-xs text-label " +
  "transition-colors hover:border-label-soft focus:border-live focus:outline-none";

export function FilterBar() {
  const filters = useBoardStore((state) => state.filters);
  const setFilter = useBoardStore((state) => state.setFilter);
  const clearFilters = useBoardStore((state) => state.clearFilters);

  const activos = Object.values(filters).filter(Boolean).length;

  return (
    <div className="rail flex flex-wrap items-end gap-x-3 gap-y-2 px-4 py-2">
      <Field label="Empresa">
        <span className="relative flex items-center">
          <IconSearch className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-label-soft" />
          <input
            type="search"
            value={filters.company ?? ""}
            onChange={(event) => setFilter("company", event.target.value)}
            placeholder="buscar"
            className={`${FIELD} w-36 pl-7`}
          />
        </span>
      </Field>

      <Field label="Bahía">
        <select
          value={filters.status ?? ""}
          onChange={(event) => setFilter("status", event.target.value as Status | "")}
          className={`${FIELD} w-32`}
        >
          <option value="">todas</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tag">
        <input
          type="search"
          value={filters.tag ?? ""}
          onChange={(event) => setFilter("tag", event.target.value)}
          placeholder="react"
          className={`${FIELD} w-28`}
        />
      </Field>

      <Field label="Desde">
        <input
          type="date"
          value={filters.date_from ?? ""}
          onChange={(event) => setFilter("date_from", event.target.value)}
          className={`${FIELD} w-32`}
        />
      </Field>

      <Field label="Hasta">
        <input
          type="date"
          value={filters.date_to ?? ""}
          onChange={(event) => setFilter("date_to", event.target.value)}
          className={`${FIELD} w-32`}
        />
      </Field>

      {activos > 0 && (
        <button
          onClick={clearFilters}
          className="h-7 px-1 font-mono text-xs text-live underline decoration-live/40
            hover:decoration-live"
        >
          limpiar ({activos})
        </button>
      )}

      <StaleThreshold />
    </div>
  );
}

/** Umbral de la marca de atención. Vive en el riel, junto a lo que afecta: es la única
 *  preferencia del producto y una pantalla de ajustes propia sería más chrome que ajuste. */
function StaleThreshold() {
  const user = useAuthStore((state) => state.user);
  const setStaleThreshold = useAuthStore((state) => state.setStaleThreshold);
  const load = useBoardStore((state) => state.load);

  if (!user) return null;

  return (
    <Field label="Marcar tras" className="ml-auto">
      <span className="flex items-baseline gap-1.5">
        <input
          type="number"
          min={1}
          max={365}
          defaultValue={user.stale_after_days}
          // onBlur y no onChange: con onChange, escribir "30" pasa por "3" y guardaría un
          // umbral que el usuario nunca pidió.
          onBlur={async (event) => {
            const days = Number(event.target.value);
            if (days === user.stale_after_days || days < 1 || days > 365) return;
            await setStaleThreshold(days);
            await load();
          }}
          className={`${FIELD} w-14 text-right tabular-nums`}
        />
        <span className="font-mono text-[0.6875rem] text-label-soft">días</span>
      </span>
    </Field>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-label-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
