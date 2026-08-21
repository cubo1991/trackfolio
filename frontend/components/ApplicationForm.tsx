"use client";

import { useEffect, useRef, useState } from "react";

import { IconClose } from "@/components/icons";
import { OfferAssistant } from "@/components/OfferAssistant";
import { ApiError } from "@/lib/api";
import { STATUSES, STATUS_LABELS, type Application, type ApplicationCreate } from "@/lib/types";

interface Props {
  /** Si viene, el formulario edita; si no, crea. */
  application: Application | null;
  onSubmit: (body: ApplicationCreate) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onClose: () => void;
}

const hoy = () => new Date().toISOString().slice(0, 10);

const FIELD =
  "w-full rounded-none border border-ink/25 bg-transparent px-2 py-1.5 text-sm text-ink " +
  "transition-colors placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";

/**
 * La tira sacada de la bahía y apoyada en el escritorio para anotarla. Panel lateral y no modal
 * centrado: el tablero sigue visible detrás, que es el contexto de lo que se está anotando.
 */
export function ApplicationForm({ application, onSubmit, onDelete, onClose }: Props) {
  const [company, setCompany] = useState(application?.company ?? "");
  const [position, setPosition] = useState(application?.position ?? "");
  const [appliedDate, setAppliedDate] = useState(application?.applied_date ?? hoy());
  const [status, setStatus] = useState(application?.status ?? "applied");
  const [url, setUrl] = useState(application?.url ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [tags, setTags] = useState(application?.tags.join(", ") ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  // Escape cierra: en un panel que se abre sobre el trabajo, salir tiene que costar una tecla.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        company: company.trim(),
        position: position.trim(),
        applied_date: appliedDate,
        status,
        url: url.trim() || null,
        notes: notes.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex justify-end bg-console/70 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={application ? "Editar postulación" : "Nueva postulación"}
        className="stock flex h-full w-full max-w-sm flex-col overflow-y-auto text-ink
          shadow-[-8px_0_24px_rgb(0_0_0/0.5)]
          motion-safe:animate-[slide-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <header className="flex items-center justify-between border-b border-ink/20 px-4 py-2.5">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            {application ? `Tira ${String(application.id).padStart(4, "0")}` : "Tira en blanco"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 px-4 py-4">
          <Field label="Empresa">
            <input
              ref={firstField}
              required
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className={FIELD}
            />
          </Field>

          <Field label="Puesto">
            <input
              required
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className={FIELD}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              {/* Input de fecha nativo: da el calendario y la validación del navegador gratis. */}
              <input
                type="date"
                required
                value={appliedDate}
                onChange={(event) => setAppliedDate(event.target.value)}
                className={`${FIELD} font-mono text-xs`}
              />
            </Field>

            <Field label="Bahía">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className={`${FIELD} text-xs`}
              >
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Link a la oferta">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              className={`${FIELD} font-mono text-xs`}
            />
          </Field>

          <Field label="Tags" hint="Separados por coma.">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="python, fastapi, remoto"
              className={`${FIELD} font-mono text-xs`}
            />
          </Field>

          <Field label="Notas">
            <textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contacto, salario conversado, próximos pasos…"
              className={`${FIELD} resize-none`}
            />
          </Field>

          <OfferAssistant
            currentTags={tags.split(",").map((tag) => tag.trim()).filter(Boolean)}
            onAddTags={(nuevos) =>
              setTags((actuales) => {
                const lista = actuales.split(",").map((tag) => tag.trim()).filter(Boolean);
                return [...lista, ...nuevos.filter((tag) => !lista.includes(tag))].join(", ");
              })
            }
          />

          {error && (
            <p
              role="alert"
              className="border-l-2 border-pen bg-pen/10 px-3 py-2 text-sm text-pen"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 flex items-center gap-2 border-t border-ink/20 bg-stock px-4 py-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-ink px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider
              text-stock transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Guardando…" : application ? "Guardar" : "Cargar"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1.5 font-mono text-xs uppercase tracking-wider text-ink-soft
              transition-colors hover:text-ink"
          >
            Cancelar
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={async () => {
                // Dos toques y sin modal encima de un panel: el botón se convierte en su
                // propia confirmación.
                if (!confirmingDelete) return setConfirmingDelete(true);
                await onDelete();
                onClose();
              }}
              onBlur={() => setConfirmingDelete(false)}
              className="ml-auto font-mono text-xs uppercase tracking-wider text-pen
                transition-colors hover:text-pen/80"
            >
              {confirmingDelete ? "¿Seguro?" : "Descartar"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[0.6875rem] text-ink-soft">{hint}</span>}
    </label>
  );
}
