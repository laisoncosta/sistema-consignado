"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { BrandLogoDuplo } from "@/components/BrandLogoDuplo";
import { GestaoMobileMenuButton } from "@/components/dashboard/DashboardGestaoMobileNav";
import { PromotorHeaderActions } from "@/components/dashboard/PromotorHeaderActions";
import { useDashboardHeader } from "@/components/dashboard/DashboardHeaderContext";
import type { BrandTheme } from "@/lib/brands";

type DashboardTopHeaderProps = {
  tituloArea: string;
  tituloRegiaoInicial: string;
  brandInicial: BrandTheme;
  nomeUsuario: string;
  exibirLogosDuplos?: boolean;
  exibirAcoesHeader?: boolean;
  exibirMenuGestaoMobile?: boolean;
  otimizadoMobile?: boolean;
  desktopOnly?: boolean;
  executive?: boolean;
};

export function DashboardTopHeader({
  tituloArea,
  tituloRegiaoInicial,
  brandInicial,
  nomeUsuario,
  exibirLogosDuplos = false,
  exibirAcoesHeader = true,
  exibirMenuGestaoMobile = false,
  otimizadoMobile = false,
  desktopOnly = false,
  executive = false,
}: DashboardTopHeaderProps) {
  const headerContext = useDashboardHeader();
  const brand = headerContext?.brandAtivo ?? brandInicial;
  const tituloRegiao = headerContext?.tituloRegiao || tituloRegiaoInicial;

  return (
    <header
      className="relative z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90"
      style={executive ? undefined : { borderColor: brand.primaryLight }}
    >
      <div
        className={`relative z-30 mx-auto flex flex-wrap items-center justify-between gap-3 ${
          otimizadoMobile ? "px-4 py-3 sm:gap-4 sm:px-6 sm:py-5" : "gap-4 px-6 py-5"
        } ${desktopOnly ? "w-full max-w-[1600px]" : "max-w-7xl"}`}
      >
        <div className="relative z-0 flex min-w-0 items-center gap-2 sm:gap-3">
          {exibirMenuGestaoMobile ? <GestaoMobileMenuButton /> : null}
          {exibirLogosDuplos ? (
            <BrandLogoDuplo
              className={otimizadoMobile ? "h-10 sm:h-12" : "h-12"}
            />
          ) : (
            <BrandLogo
              brand={brand}
              className={
                otimizadoMobile ? "h-10 w-28 sm:h-12 sm:w-36" : "h-12 w-36"
              }
            />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {tituloArea}
            </p>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {tituloRegiao}
            </h1>
          </div>
        </div>
        {exibirAcoesHeader ? (
          <PromotorHeaderActions
            nomeUsuario={nomeUsuario}
            primary={brand.primary}
            otimizadoMobile={otimizadoMobile}
          />
        ) : null}
        {exibirMenuGestaoMobile ? (
          <div className="lg:hidden">
            <PromotorHeaderActions
              nomeUsuario={nomeUsuario}
              primary={brand.primary}
              otimizadoMobile
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
