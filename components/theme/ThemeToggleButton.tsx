"use client";

import { Moon, Sun } from "lucide-react";

import { useThemeAparencia } from "@/components/theme/ThemeProvider";

type ThemeToggleButtonProps = {
  compacto?: boolean;
};

export function ThemeToggleButton({ compacto = false }: ThemeToggleButtonProps) {
  const { theme, toggleTheme, montado } = useThemeAparencia();
  const escuro = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${
        compacto ? "justify-center" : "justify-between"
      }`}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      <span className="flex items-center gap-3">
        {montado && escuro ? (
          <Sun className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        )}
        {!compacto ? (
          <span>{montado && escuro ? "Modo Claro" : "Modo Escuro"}</span>
        ) : null}
      </span>
      {!compacto ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {montado && escuro ? "Escuro" : "Claro"}
        </span>
      ) : null}
    </button>
  );
}
