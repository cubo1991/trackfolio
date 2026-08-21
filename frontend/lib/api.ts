import type {
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  User,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "trackfolio_token";

/**
 * El token vive en localStorage.
 *
 * La alternativa más segura es una cookie httpOnly, que JavaScript no puede leer y por lo tanto
 * un XSS no puede robar. No se usa acá porque el front y la API están en dominios distintos:
 * requeriría SameSite=None con Secure y protección CSRF propia, bastante maquinaria para un
 * proyecto de un solo usuario. Es la decisión a revisar primero si esto alguna vez maneja datos
 * de terceros.
 */
export const tokenStorage = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    // El backend manda { detail: "..." }, pero un 500 puede devolver HTML: si el parseo
    // falla, mejor un mensaje genérico que romper acá y perder el status.
    const detail = await response
      .json()
      .then((body) => body.detail)
      .catch(() => null);
    throw new ApiError(response.status, detail ?? "Error de conexión con el servidor.");
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const api = {
  register: (email: string, password: string) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),

  listApplications: () => request<Application[]>("/applications"),

  createApplication: (body: ApplicationCreate) =>
    request<Application>("/applications", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateApplication: (id: number, body: ApplicationUpdate) =>
    request<Application>(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteApplication: (id: number) =>
    request<void>(`/applications/${id}`, { method: "DELETE" }),
};
