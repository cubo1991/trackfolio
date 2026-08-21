"use client";

import { useEffect, useState } from "react";

import { ApplicationForm } from "@/components/ApplicationForm";
import { AuthGuard } from "@/components/AuthGuard";
import { Bay } from "@/components/Bay";
import { FilterBar } from "@/components/FilterBar";
import { IconClose, IconPlus, IconSignOut } from "@/components/icons";
import { PRODUCT_NAME } from "@/lib/brand";
import { STATUSES, type Application } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { groupByStatus, useBoardStore } from "@/stores/board";

/** null = cerrado, "new" = alta, Application = edición. */
type FormTarget = null | "new" | Application;

function Board() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const { applications, loading, error, filters, load, move, dismissError } = useBoardStore();
  const createApplication = useBoardStore((state) => state.createApplication);
  const updateApplication = useBoardStore((state) => state.updateApplication);
  const removeApplication = useBoardStore((state) => state.removeApplication);

  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  // Un solo efecto para la carga inicial y para los filtros. El retraso evita disparar un
  // request por cada tecla mientras se escribe en la búsqueda.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [filters, load]);

  const grouped = groupByStatus(applications);
  const editing = formTarget !== null && formTarget !== "new" ? formTarget : null;
  const marcadas = applications.filter((application) => application.is_stale).length;

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="rail flex items-center gap-4 px-4 py-2">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-label">
          {PRODUCT_NAME}
        </h1>

        {/* Lo que el usuario vino a saber, antes que cualquier control: cuántas piden acción. */}
        <p className="font-mono text-xs text-label-soft">
          <data value={applications.length} className="text-label">
            {applications.length}
          </data>{" "}
          en tablero
          {marcadas > 0 && (
            <>
              {" · "}
              <data value={marcadas} className="text-pen-lit">
                {marcadas}
              </data>{" "}
              sin movimiento
            </>
          )}
        </p>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setFormTarget("new")}
            className="flex items-center gap-1.5 bg-live px-2.5 py-1 font-mono text-xs
              font-medium uppercase tracking-wider text-ink transition-colors
              hover:bg-live/85"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Cargar
          </button>

          <span className="hidden font-mono text-[0.6875rem] text-label-soft sm:inline">
            {user?.email}
          </span>

          <button
            onClick={logout}
            className="text-label-soft transition-colors hover:text-label"
            aria-label="Cerrar sesión"
          >
            <IconSignOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <FilterBar />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-y border-pen-lit/50
            bg-pen/15 px-4 py-1.5 font-mono text-xs text-stock"
        >
          {error}
          <button
            onClick={dismissError}
            aria-label="Descartar aviso"
            className="text-stock/70 transition-colors hover:text-stock"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading && applications.length === 0 ? (
        <p className="p-4 font-mono text-xs text-label-soft">Leyendo el tablero…</p>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-px overflow-x-auto bg-rail-edge
            grid-cols-[repeat(5,minmax(13rem,1fr))]"
        >
          {STATUSES.map((status) => (
            <div key={status} className="flex min-h-0 flex-col overflow-y-auto">
              <Bay
                status={status}
                applications={grouped[status] ?? []}
                onDropStrip={move}
                onMove={move}
                onEdit={setFormTarget}
              />
            </div>
          ))}
        </div>
      )}

      {formTarget !== null && (
        <ApplicationForm
          application={editing}
          onSubmit={(body) =>
            editing ? updateApplication(editing.id, body) : createApplication(body)
          }
          onDelete={editing ? () => removeApplication(editing.id) : null}
          onClose={() => setFormTarget(null)}
        />
      )}
    </main>
  );
}

export default function BoardPage() {
  return (
    <AuthGuard>
      <Board />
    </AuthGuard>
  );
}
