"use client";

import { STATUSES, STATUS_LABELS, type Status } from "@/lib/types";
import { useBoardStore } from "@/stores/board";

export function FilterBar() {
  const filters = useBoardStore((state) => state.filters);
  const setFilter = useBoardStore((state) => state.setFilter);
  const clearFilters = useBoardStore((state) => state.clearFilters);

  const hayFiltros = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <Field label="Empresa">
        <input
          type="search"
          value={filters.company ?? ""}
          onChange={(event) => setFilter("company", event.target.value)}
          placeholder="Buscar…"
          className={inputClass}
        />
      </Field>

      <Field label="Estado">
        <select
          value={filters.status ?? ""}
          onChange={(event) => setFilter("status", event.target.value as Status | "")}
          className={inputClass}
        >
          <option value="">Todos</option>
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
          placeholder="react, python…"
          className={inputClass}
        />
      </Field>

      <Field label="Desde">
        <input
          type="date"
          value={filters.date_from ?? ""}
          onChange={(event) => setFilter("date_from", event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Hasta">
        <input
          type="date"
          value={filters.date_to ?? ""}
          onChange={(event) => setFilter("date_to", event.target.value)}
          className={inputClass}
        />
      </Field>

      {hayFiltros && (
        <button
          onClick={clearFilters}
          className="pb-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}

const inputClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
