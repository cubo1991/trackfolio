import { create } from "zustand";

import { ApiError, api } from "@/lib/api";
import type {
  Application,
  ApplicationCreate,
  ApplicationFilters,
  ApplicationUpdate,
  Status,
} from "@/lib/types";

const SIN_FILTROS: ApplicationFilters = {};

interface BoardState {
  applications: Application[];
  loading: boolean;
  error: string | null;
  filters: ApplicationFilters;

  /** Trae del servidor las postulaciones que pasan los filtros actuales. */
  load: () => Promise<void>;
  setFilter: <K extends keyof ApplicationFilters>(
    key: K,
    value: ApplicationFilters[K],
  ) => void;
  clearFilters: () => void;
  /** Mueve una tarjeta de columna. Actualiza la UI primero y revierte si la API falla. */
  move: (id: number, status: Status) => Promise<void>;
  createApplication: (body: ApplicationCreate) => Promise<void>;
  updateApplication: (id: number, body: ApplicationUpdate) => Promise<void>;
  removeApplication: (id: number) => Promise<void>;
  dismissError: () => void;
}

function message(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,
  filters: SIN_FILTROS,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ applications: await api.listApplications(get().filters), loading: false });
    } catch (caught) {
      set({ loading: false, error: message(caught, "No se pudieron cargar las postulaciones.") });
    }
  },

  // El filtrado lo resuelve el servidor, no el cliente: filtrar acá obligaría a traerse todas
  // las postulaciones siempre, y deja la API sin una capacidad que le corresponde.
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () => set({ filters: SIN_FILTROS }),

  move: async (id, status) => {
    const previous = get().applications.find((application) => application.id === id);

    // Soltar la tarjeta en su propia columna no es un movimiento: no vale un request.
    if (!previous || previous.status === status) return;

    const replace = (updated: Application) =>
      set((state) => ({
        applications: state.applications.map((application) =>
          application.id === id ? updated : application,
        ),
      }));

    // Optimista: la tarjeta se mueve ya, sin esperar al servidor. Es lo que hace que el
    // drag & drop se sienta instantáneo.
    replace({ ...previous, status });

    try {
      replace(await api.updateApplication(id, { status }));
    } catch (caught) {
      // Rollback: si el servidor no aceptó el cambio, la tarjeta vuelve sola a su columna.
      // Sin esto la UI mentiría sobre el estado real.
      replace(previous);
      set({ error: message(caught, "No se pudo mover la postulación.") });
    }
  },

  createApplication: async (body) => {
    const created = await api.createApplication(body);
    set((state) => ({ applications: [created, ...state.applications] }));
  },

  updateApplication: async (id, body) => {
    const updated = await api.updateApplication(id, body);
    set((state) => ({
      applications: state.applications.map((application) =>
        application.id === id ? updated : application,
      ),
    }));
  },

  removeApplication: async (id) => {
    const previous = get().applications;
    set({ applications: previous.filter((application) => application.id !== id) });
    try {
      await api.deleteApplication(id);
    } catch (caught) {
      set({ applications: previous, error: message(caught, "No se pudo borrar la postulación.") });
    }
  },

  dismissError: () => set({ error: null }),
}));

/** Agrupa por estado una sola vez, en vez de filtrar el array entero por cada columna. */
export function groupByStatus(applications: Application[]) {
  const groups = {} as Record<Status, Application[]>;
  for (const application of applications) {
    (groups[application.status] ??= []).push(application);
  }
  return groups;
}
