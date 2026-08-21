"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

function Board() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TrackFolio</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user?.email}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-900">
            Salir
          </button>
        </div>
      </header>

      {/* Las columnas ya están, las tarjetas y el drag & drop son la Etapa 5. */}
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
        {STATUSES.map((status) => (
          <section key={status} className="rounded-lg bg-slate-100 p-3">
            <h2 className="mb-3 text-sm font-medium text-slate-700">
              {STATUS_LABELS[status]}
            </h2>
            <p className="text-sm text-slate-400">Sin postulaciones.</p>
          </section>
        ))}
      </div>
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
