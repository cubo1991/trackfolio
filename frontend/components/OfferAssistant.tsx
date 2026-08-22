"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IconPlus } from "@/components/icons";
import { ApiError, api } from "@/lib/api";
import type { OfferAnalysis } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

interface Props {
  /** Tags que ya tiene la tira, para no ofrecer los repetidos. */
  currentTags: string[];
  onAddTags: (tags: string[]) => void;
}

const FIELD =
  "w-full rounded-none border border-ink/25 bg-transparent px-2 py-1.5 text-sm text-ink " +
  "transition-colors placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";

/**
 * Pegás el texto de una oferta y el asistente sugiere los tags de stack y qué tan bien encaja
 * contra tu perfil.
 *
 * Si el backend no tiene key configurada, este componente no se dibuja: nada de un botón que
 * promete algo y después falla.
 */
export function OfferAssistant({ currentTags, onAddTags }: Props) {
  const user = useAuthStore((state) => state.user);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [offerText, setOfferText] = useState("");
  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .assistantStatus()
      .then(({ available }) => setAvailable(available))
      .catch(() => setAvailable(false));
  }, []);

  if (available !== true) return null;

  const nuevos = analysis
    ? analysis.tags.filter((tag) => !currentTags.includes(tag))
    : [];

  async function analizar() {
    setError(null);
    setAnalyzing(true);
    try {
      setAnalysis(await api.analyzeOffer(offerText));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "No se pudo analizar la oferta.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="border-t border-ink/20 pt-4">
      <h3 className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
        Analizar la oferta
      </h3>

      {!user?.profile && (
        <div className="mt-2">
          <p className="text-[0.8125rem] text-ink-soft">
            Todavía no tenés un perfil configurado — sin eso, el análisis no tiene contra qué
            comparar la oferta.{" "}
            <Link href="/profile" className="underline decoration-ink-soft/40 hover:text-ink">
              Armalo en Mi perfil
            </Link>
            .
          </p>
        </div>
      )}

      <textarea
        rows={4}
        value={offerText}
        onChange={(event) => setOfferText(event.target.value)}
        placeholder="Pegá acá el texto de la oferta…"
        className={`${FIELD} mt-2 resize-none`}
      />

      <button
        type="button"
        onClick={analizar}
        disabled={analyzing || offerText.trim().length < 40}
        className="mt-2 bg-ink px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider
          text-stock transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {analyzing ? "Analizando…" : "Analizar"}
      </button>

      {offerText.trim().length > 0 && offerText.trim().length < 40 && (
        <p className="mt-1 text-[0.6875rem] text-ink-soft">
          Falta texto: pegá la descripción completa de la oferta.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen">
          {error}
        </p>
      )}

      {analysis && (
        <div className="mt-4 space-y-3">
          <p className="text-[0.8125rem] leading-relaxed">{analysis.fit_summary}</p>

          {analysis.seniority && (
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
              Nivel que pide: {analysis.seniority}
            </p>
          )}

          {nuevos.length > 0 && (
            <div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                Tags detectados
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {nuevos.map((tag) => (
                  <li key={tag}>
                    {/* La sugerencia se aplica con un click, pero nunca sola: los tags son
                        del usuario y el modelo puede equivocarse. */}
                    <button
                      type="button"
                      onClick={() => onAddTags([tag])}
                      className="flex items-center gap-1 border border-ink/25 px-1.5 py-0.5
                        font-mono text-[0.6875rem] transition-colors hover:border-ink
                        hover:bg-ink/5"
                    >
                      <IconPlus className="h-2.5 w-2.5" />
                      {tag}
                    </button>
                  </li>
                ))}
              </ul>
              {nuevos.length > 1 && (
                <button
                  type="button"
                  onClick={() => onAddTags(nuevos)}
                  className="mt-1.5 font-mono text-[0.6875rem] text-ink-soft underline
                    decoration-ink-soft/40 hover:text-ink"
                >
                  agregar los {nuevos.length}
                </button>
              )}
            </div>
          )}

          <Lista titulo="A favor" items={analysis.strengths} />
          <Lista titulo="Lo que te falta" items={analysis.gaps} />
        </div>
      )}
    </section>
  );
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
        {titulo}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-[0.8125rem] leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
