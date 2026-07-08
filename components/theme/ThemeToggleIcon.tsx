"use client";

import { Moon, Sun } from "lucide-react";

import { useThemeAparencia } from "@/components/theme/ThemeProvider";

type ThemeToggleIconProps = {
  compacto?: boolean;
};

export function ThemeToggleIcon({ compacto = false }: ThemeToggleIconProps) {
  const { theme, toggleTheme, montado } = useThemeAparencia();
  const escuro = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${
        compacto ? "h-9 w-9" : "h-10 w-10"
      }`}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {montado && escuro ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
