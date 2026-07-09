"use client";

import { useEffect } from "react";

import {
  aplicarThemeAparenciaNoDocumento,
  resolverThemeAparencia,
} from "@/lib/theme-aparencia";

type LoginThemeShellProps = {
  children: React.ReactNode;
};

/** Mantém a tela de login sempre no tema claro, independente da preferência global. */
export function LoginThemeShell({ children }: LoginThemeShellProps) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";

    return () => {
      aplicarThemeAparenciaNoDocumento(resolverThemeAparencia());
    };
  }, []);

  return <div className="login-isolado min-h-screen">{children}</div>;
}
