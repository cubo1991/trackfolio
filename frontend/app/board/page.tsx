"use client";

import { useEffect, useState } from "react";

import { ApplicationForm } from "@/components/ApplicationForm";
import { AuthGuard } from "@/components/AuthGuard";
import { Column } from "@/components/Column";
import { STATUSES, type Application } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { groupByStatus, useBoardStore } from "@/stores/board";

/** null = cerrado, "new" = alta, Application = edición. */
type FormTarget = null | "new" | Application;

function Board() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const { applications, loading, error, load, move, dismissError } = useBoardStore();
  const createApplication = useBoardStore((state) => state.createApplication);
  const updateApplication = useBoardStore((state) => state.updateApplication);
  const removeApplication = useBoardStore((state) => state.removeApplication);

  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = groupByStatus(applications);
  const editing = formTarget !== null && formTarget !== "new" ? formTarget : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TrackFolio</h1>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setFormTarget("new")}
            className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
          >
            Nueva postulación
          </button>
          <span className="text-slate-500">{user?.email}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-900">
            Salir
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between bg-red-50 px-6 py-2 text-sm text-red-700"
        >
          {error}
          <button onClick={dismissError} aria-label="Cerrar aviso" className="font-medium">
            ✕
          </button>
        </div>
      )}

      {loading && applications.length === 0 ? (
        <p className="p-6 text-slate-500">Cargando postulaciones…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              applications={grouped[status] ?? []}
              onDropCard={move}
              onEdit={setFormTarget}
            />
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
