"use client";

import { useState } from "react";

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
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          {application ? "Editar postulación" : "Nueva postulación"}
        </h2>

        <Field label="Empresa">
          <input
            required
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Puesto">
          <input
            required
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={inputClass}
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
              className={inputClass}
            />
          </Field>

          <Field label="Estado">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className={inputClass}
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
            className={inputClass}
          />
        </Field>

        <Field label="Tags">
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="python, fastapi, remoto"
            className={inputClass}
          />
          <span className="text-xs text-slate-500">Separados por coma.</span>
        </Field>

        <Field label="Notas">
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClass}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={async () => {
                await onDelete();
                onClose();
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Borrar
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
