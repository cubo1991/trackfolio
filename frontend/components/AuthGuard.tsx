"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth";

/**
 * Envuelve las páginas que requieren sesión. Es un guard de cliente: sirve para la navegación,
 * no es una medida de seguridad. Lo que protege los datos es que la API rechaza cualquier
 * request sin token válido — acá solo se evita mostrar una pantalla vacía.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    if (status === "loading") init();
  }, [status, init]);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }

  return <>{children}</>;
}
