import { create } from "zustand";

import { api, tokenStorage } from "@/lib/api";
import type { User } from "@/lib/types";

/**
 * "loading" es un tercer estado a propósito, y no un booleano: al montar todavía no se sabe si
 * hay sesión, y tratar esa incertidumbre como "no autenticado" hace que la app patee al login
 * por un instante en cada refresh.
 */
type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Valida contra la API el token guardado. Se llama una vez, al montar la app. */
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Cambia el umbral de alerta. Devuelve el usuario actualizado para que el tablero recargue. */
  setStaleThreshold: (days: number) => Promise<void>;
  /** Guarda el perfil contra el que el asistente compara las ofertas. */
  setProfile: (profile: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  /** Un token guardado no alcanza: puede estar expirado o ser de un usuario borrado. */
  async function loadUser() {
    const user = await api.me();
    set({ user, status: "authenticated" });
  }

  return {
    user: null,
    status: "loading",

    init: async () => {
      if (!tokenStorage.get()) {
        set({ user: null, status: "anonymous" });
        return;
      }
      try {
        await loadUser();
      } catch {
        tokenStorage.clear();
        set({ user: null, status: "anonymous" });
      }
    },

    login: async (email, password) => {
      const { access_token } = await api.login(email, password);
      tokenStorage.set(access_token);
      await loadUser();
    },

    register: async (email, password) => {
      const { access_token } = await api.register(email, password);
      tokenStorage.set(access_token);
      await loadUser();
    },

    logout: () => {
      tokenStorage.clear();
      set({ user: null, status: "anonymous" });
    },

    setStaleThreshold: async (days) => {
      set({ user: await api.updateStaleThreshold(days) });
    },

    setProfile: async (profile) => {
      set({ user: await api.updateProfile(profile) });
    },
  };
});
