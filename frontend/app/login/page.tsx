"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { useAuthStore } from "@/stores/auth";

const FIELD =
  "w-full rounded-none border border-ink/25 bg-transparent px-2.5 py-2 text-ink " +
  "transition-colors focus:border-ink focus:outline-none";

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
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* Una sola tira apoyada en la consola apagada: la que se firma al tomar la posición. */}
      <form
        onSubmit={handleSubmit}
        className="stock w-full max-w-sm text-ink shadow-[0_12px_40px_rgb(0_0_0/0.55)]"
      >
        <header className="border-b border-ink/20 px-6 pb-3 pt-5">
          <h1 className="font-mono text-xs uppercase tracking-[0.2em]">{PRODUCT_NAME}</h1>
          <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{PRODUCT_TAGLINE}</p>
        </header>

        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-1">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
              Contraseña
            </span>
            <input
              type="password"
              required
              // Mismo mínimo que valida el backend: mejor avisar acá que ir y volver.
              minLength={8}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={FIELD}
            />
            {isRegistering && (
              <span className="block text-[0.6875rem] text-ink-soft">Mínimo 8 caracteres.</span>
            )}
          </label>

          {error && (
            <p
              role="alert"
              className="border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink py-2.5 font-mono text-xs font-medium uppercase
              tracking-[0.14em] text-stock transition-opacity hover:opacity-85
              disabled:opacity-50"
          >
            {submitting
              ? "Verificando…"
              : isRegistering
                ? "Crear cuenta"
                : "Entrar"}
          </button>
        </div>

        <footer className="border-t border-ink/20 px-6 py-3">
          <button
            type="button"
            onClick={() => {
              setIsRegistering((value) => !value);
              setError(null);
            }}
            className="font-mono text-[0.6875rem] text-ink-soft underline
              decoration-ink-soft/40 transition-colors hover:text-ink hover:decoration-ink"
          >
            {isRegistering ? "Ya tengo cuenta" : "Crear una cuenta"}
          </button>
        </footer>
      </form>
    </main>
  );
}
