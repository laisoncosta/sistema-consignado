"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Leaf,
  LineChart,
  LogOut,
  MapPin,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ThemeToggleIcon } from "@/components/theme/ThemeToggleIcon";
import { logoutAction } from "@/app/dashboard/actions";
import type { BrandTheme } from "@/lib/brands";
import {
  getGestaoAdminChildren,
  getGestaoSidebarLinks,
} from "@/lib/rbac";

type DashboardSidebarProps = {
  brand: BrandTheme;
  userName: string;
  userRole: string;
};

const CHAVE_SIDEBAR_RECOLHIDA = "sidebar-recolhida";

/** Tokens de layout do sidebar — ponto único para plugar dark mode depois. */
const sidebarShell = {
  asideBase:
    "hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:flex-col",
  asideExpandida: "w-72",
  asideRecolhida: "w-[4.25rem]",
  header: "shrink-0 border-b border-slate-100 px-3 py-4 dark:border-slate-800",
  headerExpandido: "px-5 py-5",
  headerEyebrow:
    "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400",
  headerTitle: "mt-1 text-sm font-medium text-slate-700 dark:text-slate-200",
  nav: "min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4",
  navExpandido: "px-3",
  sectionLabel:
    "px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500",
  adminDivider: "mt-4 border-t border-slate-200 pt-4 dark:border-slate-700",
  footer:
    "shrink-0 border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900",
  footerExpandido: "p-4",
} as const;

const itemStyles = {
  mainBase:
    "group flex items-center gap-3 py-3 text-sm font-medium transition-all duration-150 focus-visible:outline-none",
  mainInactive:
    "rounded-xl px-3 text-slate-600 hover:translate-x-1 hover:bg-slate-50 focus-visible:translate-x-1 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800 dark:focus-visible:ring-slate-600",
  mainActive: "rounded-r-xl rounded-l-none border-l-2 pl-[10px] pr-3",
  mainIcon:
    "shrink-0 transition-colors duration-150 group-hover:text-slate-700 group-focus-visible:text-slate-700",
  adminBase:
    "group flex items-center gap-2 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none",
  adminInactive:
    "rounded-lg px-3 text-slate-600 hover:translate-x-1 hover:bg-slate-50 focus-visible:translate-x-1 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800 dark:focus-visible:ring-slate-600",
  adminActive: "rounded-r-lg rounded-l-none border-l-2 pl-[10px] pr-3 font-semibold",
  adminIcon:
    "shrink-0 transition-colors duration-150 group-hover:text-slate-700 group-focus-visible:text-slate-700",
  adminToggle:
    "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-all duration-150 hover:translate-x-1 hover:bg-slate-50 focus-visible:translate-x-1 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800 dark:focus-visible:ring-slate-600",
  adminChildren: "ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700",
} as const;

const ICONES_POR_LABEL: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  "Portal de Pedidos": Package,
  Expedição: Truck,
  "Relatório de Visita": MapPin,
  "Fechamento de Resultados": LineChart,
  "Cadastro de Produtos": Leaf,
  "Cadastro de Origens": MapPin,
  "Cadastro de Lojas": Store,
  "Gestão de Usuários e Perfis": Users,
};

function linkAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolverIcone(label: string): LucideIcon {
  return ICONES_POR_LABEL[label] ?? Package;
}

function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0] ?? ""}${partes[partes.length - 1][0] ?? ""}`.toUpperCase();
}

function formatarRole(role: string): string {
  const normalizado = role.trim();

  if (!normalizado) {
    return "Usuário";
  }

  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1).toLowerCase();
}

type SidebarNavItemProps = {
  href: string;
  label: string;
  ativo: boolean;
  brand: BrandTheme;
  tamanhoIcone: number;
  variant: "main" | "admin";
  recolhida?: boolean;
};

function SidebarNavItem({
  href,
  label,
  ativo,
  brand,
  tamanhoIcone,
  variant,
  recolhida = false,
}: SidebarNavItemProps) {
  const Icone = resolverIcone(label);
  const baseClass =
    variant === "main" ? itemStyles.mainBase : itemStyles.adminBase;
  const inactiveClass =
    variant === "main" ? itemStyles.mainInactive : itemStyles.adminInactive;
  const activeClass =
    variant === "main" ? itemStyles.mainActive : itemStyles.adminActive;
  const iconClass =
    variant === "main" ? itemStyles.mainIcon : itemStyles.adminIcon;

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      title={recolhida ? label : undefined}
      className={`${baseClass} ${ativo ? (recolhida ? "rounded-lg border-l-0 px-0 justify-center" : activeClass) : inactiveClass} ${recolhida ? "justify-center rounded-lg px-0 hover:translate-x-0 focus-visible:translate-x-0" : ""}`}
      style={
        ativo
          ? {
              backgroundColor: brand.primaryLight,
              color: brand.primary,
              borderLeftColor: recolhida ? undefined : brand.primary,
            }
          : undefined
      }
    >
      <Icone
        aria-hidden="true"
        className={`${iconClass} ${ativo ? "" : "text-slate-400"}`}
        size={tamanhoIcone}
        strokeWidth={2}
        style={ativo ? { color: brand.primary } : undefined}
      />
      {recolhida ? (
        <span className="sr-only">{label}</span>
      ) : (
        label
      )}
    </Link>
  );
}

export function DashboardSidebar({
  brand,
  userName,
  userRole,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const links = getGestaoSidebarLinks();
  const adminChildren = getGestaoAdminChildren();
  const adminAtivo = adminChildren.some((item) => linkAtivo(pathname, item.href));
  const [adminAberto, setAdminAberto] = useState(adminAtivo);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    if (adminAtivo) {
      setAdminAberto(true);
    }
  }, [adminAtivo]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_SIDEBAR_RECOLHIDA);
      if (salvo === "true") {
        setRecolhida(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function alternarRecolhimento() {
    setRecolhida((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(CHAVE_SIDEBAR_RECOLHIDA, String(proximo));
      } catch {
        // ignore
      }
      return proximo;
    });
  }

  const iniciais = obterIniciais(userName);
  const roleFormatado = formatarRole(userRole);

  return (
    <aside
      className={`${sidebarShell.asideBase} ${recolhida ? sidebarShell.asideRecolhida : sidebarShell.asideExpandida}`}
      aria-label="Menu lateral"
      aria-expanded={!recolhida}
    >
      <div
        className={`${sidebarShell.header} ${recolhida ? "" : sidebarShell.headerExpandido}`}
      >
        <div
          className={`flex items-center ${recolhida ? "justify-center" : "justify-between gap-2"}`}
        >
          {recolhida ? null : (
            <div className="min-w-0">
              <p className={sidebarShell.headerEyebrow}>Navegação</p>
              <p className={sidebarShell.headerTitle}>Gestão Integrada</p>
            </div>
          )}
          <button
            type="button"
            onClick={alternarRecolhimento}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-600"
            aria-label={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
          >
            {recolhida ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav
        className={`${sidebarShell.nav} ${recolhida ? "" : sidebarShell.navExpandido}`}
      >
        {recolhida ? null : (
          <p className={sidebarShell.sectionLabel}>Operação</p>
        )}

        {links.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            ativo={linkAtivo(pathname, item.href)}
            brand={brand}
            tamanhoIcone={18}
            variant="main"
            recolhida={recolhida}
          />
        ))}

        <div className={sidebarShell.adminDivider}>
          <button
            type="button"
            onClick={() => setAdminAberto((atual) => !atual)}
            className={`${itemStyles.adminToggle} group ${recolhida ? "justify-center px-0 hover:translate-x-0 focus-visible:translate-x-0" : ""}`}
            aria-expanded={adminAberto}
            title={recolhida ? "Administração" : undefined}
          >
            <span
              className={`flex items-center ${recolhida ? "justify-center" : "gap-3"}`}
            >
              <Settings
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-slate-400 transition-colors duration-150 group-hover:text-slate-700 group-focus-visible:text-slate-700 dark:group-hover:text-slate-200 dark:group-focus-visible:text-slate-200"
                strokeWidth={2}
              />
              {recolhida ? (
                <span className="sr-only">Administração</span>
              ) : (
                "Administração"
              )}
            </span>
            {recolhida ? null : (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${adminAberto ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            )}
          </button>

          {adminAberto ? (
            <div
              className={
                recolhida
                  ? "mt-1 space-y-1"
                  : itemStyles.adminChildren
              }
            >
              {adminChildren.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  ativo={linkAtivo(pathname, item.href)}
                  brand={brand}
                  tamanhoIcone={16}
                  variant="admin"
                  recolhida={recolhida}
                />
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      <div
        className={`${sidebarShell.footer} ${recolhida ? "" : sidebarShell.footerExpandido}`}
      >
        {recolhida ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: brand.primary }}
              title={`${userName} · ${roleFormatado}`}
              aria-hidden="true"
            >
              {iniciais}
            </div>
            <ThemeToggleIcon compacto />
            <form action={logoutAction} className="m-0 shrink-0">
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: brand.primary }}
              aria-hidden="true"
            >
              {iniciais}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {userName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {roleFormatado}
              </p>
            </div>
            <ThemeToggleIcon compacto />
            <form action={logoutAction} className="m-0 shrink-0">
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
