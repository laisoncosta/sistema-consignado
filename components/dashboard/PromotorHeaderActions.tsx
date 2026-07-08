"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/dashboard/actions";
import { ThemeToggleIcon } from "@/components/theme/ThemeToggleIcon";
import { portalHeaderSairMobile } from "@/lib/portal-mobile-ui";

type PromotorHeaderActionsProps = {
  nomeUsuario: string;
  primary: string;
  otimizadoMobile?: boolean;
};

export function PromotorHeaderActions({
  nomeUsuario,
  primary,
  otimizadoMobile = false,
}: PromotorHeaderActionsProps) {
  return (
    <div className="relative z-30 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <div
        className={`pointer-events-none max-w-[10rem] truncate rounded-full font-medium text-white sm:max-w-none ${
          otimizadoMobile
            ? "px-3 py-2 text-xs sm:px-4 sm:text-sm"
            : "px-4 py-2 text-sm"
        }`}
        style={{ backgroundColor: primary }}
      >
        {nomeUsuario}
      </div>
      <ThemeToggleIcon />
      <form action={logoutAction} className="relative z-30 m-0">
        <button
          type="submit"
          className={
            otimizadoMobile
              ? portalHeaderSairMobile
              : "relative z-30 flex min-h-[44px] touch-manipulation items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </form>
    </div>
  );
}
