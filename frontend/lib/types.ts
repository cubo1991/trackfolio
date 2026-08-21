// Espejo de los esquemas del backend (backend/app/schemas.py). Se mantienen a mano: son pocos
// y estables, y generarlos desde el OpenAPI agregaría un paso de build para ahorrar 30 líneas.

export const STATUSES = [
  "applied",
  "in_process",
  "interview",
  "rejected",
  "offer",
] as const;

export type Status = (typeof STATUSES)[number];

/** Etiquetas de las columnas del Kanban. */
export const STATUS_LABELS: Record<Status, string> = {
  applied: "Aplicado",
  in_process: "En proceso",
  interview: "Entrevista",
  rejected: "Rechazado",
  offer: "Oferta",
};

export type Role = "user" | "admin";

export interface User {
  id: number;
  email: string;
  role: Role;
  created_at: string;
}

export interface Application {
  id: number;
  user_id: number;
  company: string;
  position: string;
  /** ISO date, sin hora: "2026-08-21" */
  applied_date: string;
  status: Status;
  url: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type ApplicationCreate = Omit<
  Application,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type ApplicationUpdate = Partial<ApplicationCreate>;

/** Filtros del listado. Cadena vacía significa "sin filtrar" y no se manda a la API. */
export interface ApplicationFilters {
  company?: string;
  status?: Status | "";
  tag?: string;
  date_from?: string;
  date_to?: string;
}
