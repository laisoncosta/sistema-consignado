"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  alternarThemeAparencia,
  aplicarThemeAparenciaNoDocumento,
  resolverThemeAparencia,
  salvarThemeAparencia,
  THEME_INIT_SCRIPT,
  type ThemeAparencia,
} from "@/lib/theme-aparencia";

type ThemeAparenciaContextValue = {
  theme: ThemeAparencia;
  setTheme: (theme: ThemeAparencia) => void;
  toggleTheme: () => void;
  montado: boolean;
};

const ThemeAparenciaContext = createContext<ThemeAparenciaContextValue | null>(
  null,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeAparencia>("light");
  const [montado, setMontado] = useState(false);

  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: THEME_INIT_SCRIPT,
      }}
    />
  ));

  useEffect(() => {
    const temaAtual = resolverThemeAparencia();
    setThemeState(temaAtual);
    aplicarThemeAparenciaNoDocumento(temaAtual);
    setMontado(true);
  }, []);

  const setTheme = useCallback((novo: ThemeAparencia) => {
    setThemeState(novo);
    aplicarThemeAparenciaNoDocumento(novo);
    salvarThemeAparencia(novo);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((atual) => {
      const novo = alternarThemeAparencia(atual);
      aplicarThemeAparenciaNoDocumento(novo);
      salvarThemeAparencia(novo);
      return novo;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, montado }),
    [montado, setTheme, theme, toggleTheme],
  );

  return (
    <ThemeAparenciaContext.Provider value={value}>
      {children}
    </ThemeAparenciaContext.Provider>
  );
}

export function useThemeAparencia(): ThemeAparenciaContextValue {
  const context = useContext(ThemeAparenciaContext);

  if (!context) {
    throw new Error("useThemeAparencia deve ser usado dentro de ThemeProvider.");
  }

  return context;
}
