"use client";

import { ClipboardList, History } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { BrandTheme } from "@/lib/brands";
import { portalNavLinkMobile } from "@/lib/portal-mobile-ui";
import { montarUrlPortal, obterAbaPortal } from "@/lib/portal-navigation";

export type AbaPromotor = "novo-pedido" | "historico";

const navItems: Array<{
  id: AbaPromotor;
  label: string;
  labelCurto: string;
  icon: typeof ClipboardList;
}> = [
  { id: "novo-pedido", label: "Portal de Pedidos", labelCurto: "Pedidos", icon: ClipboardList },
  { id: "historico", label: "Histórico de Pedidos", labelCurto: "Histórico", icon: History },
];

type PromotorNavProps = {
  brand: BrandTheme;
  otimizadoMobile?: boolean;
};

export function PromotorNav({
  brand,
  otimizadoMobile = false,
}: PromotorNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const abaAtiva = obterAbaPortal(searchParams);

  function hrefParaAba(id: AbaPromotor) {
    return montarUrlPortal(pathname, searchParams, {
      aba: id === "historico" ? "historico" : null,
      abrirFormulario: null,
      pedidoExtra: null,
    });
  }

  const linkBase = otimizadoMobile
    ? portalNavLinkMobile
    : "relative z-30 inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium";

  return (
    <nav
      className="relative z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80"
      style={{ borderColor: brand.primaryLight }}
      aria-label="Menu principal do promotor"
    >
      <div
        className={`relative z-30 mx-auto max-w-6xl px-4 py-3 sm:px-6 ${
          otimizadoMobile
            ? "flex flex-row gap-2"
            : "flex flex-wrap gap-2"
        }`}
      >
        {navItems.map(({ id, label, labelCurto, icon: Icon }) => {
          const ativa = abaAtiva === id;

          return (
            <Link
              key={id}
              href={hrefParaAba(id)}
              scroll={false}
              aria-current={ativa ? "page" : undefined}
              className={`${linkBase} ${
                ativa
                  ? ""
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
              style={
                ativa
                  ? {
                      borderColor: brand.primary,
                      backgroundColor: brand.primaryLight,
                      color: brand.primary,
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {otimizadoMobile ? (
                <>
                  <span className="sm:hidden">{labelCurto}</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
