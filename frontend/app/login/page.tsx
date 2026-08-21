"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const { status, init, login, register } = useAuthStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading") init();
    if (status === "authenticated") router.replace("/board");
  }, [status, init, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await (isRegistering ? register(email, password) : login(email, password));
      router.replace("/board");
    } catch (caught) {
      // Se muestra el mensaje del backend cuando lo hay: ya está pensado para no filtrar
      // qué emails existen.
      setError(
        caught instanceof ApiError ? caught.message : "No se pudo conectar con el servidor.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">TrackFolio</h1>
          <p className="text-sm text-slate-500">
            {isRegistering ? "Creá tu cuenta." : "Entrá para ver tu pipeline."}
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            required
            // Mismo mínimo que valida el backend: mejor avisar acá que ir y volver.
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
          />
          {isRegistering && (
            <span className="text-xs text-slate-500">Mínimo 8 caracteres.</span>
          )}
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Entrando…" : isRegistering ? "Crear cuenta" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRegistering((value) => !value);
            setError(null);
          }}
          className="w-full text-sm text-slate-500 hover:text-slate-900"
        >
          {isRegistering ? "Ya tengo cuenta" : "No tengo cuenta"}
        </button>
      </form>
    </main>
  );
}
