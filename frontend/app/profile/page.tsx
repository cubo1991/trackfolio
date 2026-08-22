"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { IconChevronLeft } from "@/components/icons";
import { ApiError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const FIELD =
  "w-full rounded-none border border-ink/25 bg-transparent px-2 py-1.5 text-sm text-ink " +
  "transition-colors placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";

function Perfil() {
  const user = useAuthStore((state) => state.user);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [linkedinText, setLinkedinText] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  // null = todavía no lo tocó el usuario ni la IA; se muestra el perfil guardado, que puede
  // llegar recién después del primer render porque "me" es async.
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .assistantStatus()
      .then(({ available }) => setAvailable(available))
      .catch(() => setAvailable(false));
  }, []);

  const perfilMostrado = draft ?? user?.profile ?? "";
  const hayFuente = linkedinText.trim().length > 0 || githubUsername.trim().length > 0 || cvFile !== null;

  async function generar() {
    setError(null);
    setSaved(false);
    setGenerating(true);
    try {
      const { profile } = await api.buildProfile({
        linkedinText: linkedinText.trim() || undefined,
        githubUsername: githubUsername.trim() || undefined,
        cv: cvFile,
      });
      setDraft(profile);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo generar el perfil.");
    } finally {
      setGenerating(false);
    }
  }

  async function guardar() {
    setError(null);
    setSaving(true);
    try {
      await setProfile(perfilMostrado.trim());
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="rail flex items-center gap-3 px-4 py-2">
        <Link
          href="/board"
          className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.16em]
            text-label-soft transition-colors hover:text-label"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Tablero
        </Link>
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-label">Mi perfil</h1>
      </header>

      <div className="flex flex-1 justify-center p-4 sm:p-8">
        <section className="stock w-full max-w-2xl p-6 text-ink shadow-[0_12px_40px_rgb(0_0_0/0.5)] sm:p-8">
          <p className="text-sm text-ink-soft">
            Este es el texto contra el que el asistente compara una oferta. Lo podés escribir a
            mano abajo, o darle fuentes para que lo arme por vos.
          </p>

          {available === false && (
            <p className="mt-4 border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen">
              El asistente de IA no está configurado en el backend, así que por ahora solo podés
              escribir el perfil a mano.
            </p>
          )}

          {available && (
            <div className="mt-6 space-y-4 border-b border-ink/15 pb-6">
              <h2 className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                Armar con IA
              </h2>

              <label className="block space-y-1">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                  LinkedIn
                </span>
                <textarea
                  rows={4}
                  value={linkedinText}
                  onChange={(event) => setLinkedinText(event.target.value)}
                  placeholder="Pegá el 'Acerca de' y la experiencia de tu perfil (o el texto del PDF que exportás desde LinkedIn: Recursos → Guardar en PDF)."
                  className={`${FIELD} resize-none`}
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                  Usuario de GitHub
                </span>
                <input
                  value={githubUsername}
                  onChange={(event) => setGithubUsername(event.target.value)}
                  placeholder="tu-usuario"
                  className={`${FIELD} font-mono text-xs`}
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                  CV (PDF)
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-ink-soft file:mr-3 file:border
                    file:border-ink/25 file:bg-transparent file:px-2 file:py-1
                    file:font-mono file:text-xs file:uppercase file:tracking-wider
                    file:text-ink hover:file:border-ink"
                />
              </label>

              <button
                type="button"
                onClick={generar}
                disabled={!hayFuente || generating}
                className="bg-ink px-3 py-1.5 font-mono text-xs font-medium uppercase
                  tracking-wider text-stock transition-opacity hover:opacity-85
                  disabled:opacity-40"
              >
                {generating ? "Generando…" : "Generar perfil con IA"}
              </button>
            </div>
          )}

          <div className="mt-6">
            <label className="block space-y-1">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                Perfil
              </span>
              <textarea
                rows={6}
                value={perfilMostrado}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setSaved(false);
                }}
                placeholder="Dev backend, 3 años con Python y FastAPI. Algo de React."
                className={`${FIELD} resize-none`}
              />
              <span className="block text-[0.6875rem] text-ink-soft">
                Esto es lo que se guarda y se usa para comparar ofertas. Si lo generaste con IA,
                revisalo antes de guardar.
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-3 border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={guardar}
                disabled={saving || !perfilMostrado.trim()}
                className="bg-ink px-3 py-1.5 font-mono text-xs font-medium uppercase
                  tracking-wider text-stock transition-opacity hover:opacity-85
                  disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar perfil"}
              </button>
              {saved && (
                <span className="font-mono text-xs text-ink-soft">Guardado.</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Perfil />
    </AuthGuard>
  );
}
