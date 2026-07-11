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
  Menu,
  Package,
  Settings,
  Store,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { logoutAction } from "@/app/dashboard/actions";
import { ThemeToggleIcon } from "@/components/theme/ThemeToggleIcon";
import type { BrandTheme } from "@/lib/brands";
import {
  getGestaoAdminChildren,
  getGestaoSidebarLinks,
} from "@/lib/rbac";

type GestaoMobileMenuContextValue = {
  aberto: boolean;
  alternar: () => void;
  fechar: () => void;
};

const GestaoMobileMenuContext = createContext<GestaoMobileMenuContextValue | null>(
  null,
);

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

type GestaoMobileMenuProviderProps = {
  enabled: boolean;
  brand: BrandTheme;
  userName: string;
  userRole: string;
  children: ReactNode;
};

export function GestaoMobileMenuProvider({
  enabled,
  brand,
  userName,
  userRole,
  children,
}: GestaoMobileMenuProviderProps) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  const fechar = useCallback(() => setAberto(false), []);
  const alternar = useCallback(() => setAberto((atual) => !atual), []);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  return (
    <GestaoMobileMenuContext.Provider value={{ aberto, alternar, fechar }}>
      {children}
      {enabled ? (
        <GestaoMobileMenuDrawer
          aberto={aberto}
          fechar={fechar}
          brand={brand}
          userName={userName}
          userRole={userRole}
        />
      ) : null}
    </GestaoMobileMenuContext.Provider>
  );
}

export function GestaoMobileMenuButton() {
  const contexto = useContext(GestaoMobileMenuContext);

  if (!contexto) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={contexto.alternar}
      className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"
      aria-label={contexto.aberto ? "Fechar menu" : "Abrir menu de navegação"}
      aria-expanded={contexto.aberto}
    >
      {contexto.aberto ? (
        <X className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Menu className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}

type GestaoMobileMenuDrawerProps = {
  aberto: boolean;
  fechar: () => void;
  brand: BrandTheme;
  userName: string;
  userRole: string;
};

function GestaoMobileMenuDrawer({
  aberto,
  fechar,
  brand,
  userName,
  userRole,
}: GestaoMobileMenuDrawerProps) {
  const pathname = usePathname();
  const links = getGestaoSidebarLinks();
  const adminChildren = getGestaoAdminChildren();
  const adminAtivo = adminChildren.some((item) => linkAtivo(pathname, item.href));
  const [adminAberto, setAdminAberto] = useState(adminAtivo);
  const iniciais = obterIniciais(userName);
  const roleFormatado = formatarRole(userRole);

  useEffect(() => {
    if (adminAtivo) {
      setAdminAberto(true);
    }
  }, [adminAtivo]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${aberto ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!aberto}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
          aberto ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Fechar menu"
        onClick={fechar}
      />

      <aside
        className={`absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu de gestão"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Gestão Integrada
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Navegação
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Operação
          </p>

          {links.map((item) => {
            const ativo = linkAtivo(pathname, item.href);
            const Icone = resolverIcone(item.label);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={fechar}
                className={`flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  ativo
                    ? "border-l-2"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                style={
                  ativo
                    ? {
                        backgroundColor: brand.primaryLight,
                        color: brand.primary,
                        borderLeftColor: brand.primary,
                      }
                    : undefined
                }
                aria-current={ativo ? "page" : undefined}
              >
                <Icone
                  className={`h-[18px] w-[18px] shrink-0 ${ativo ? "" : "text-slate-400"}`}
                  style={ativo ? { color: brand.primary } : undefined}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAdminAberto((atual) => !atual)}
              className="flex min-h-12 w-full touch-manipulation items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-expanded={adminAberto}
            >
              <span className="flex items-center gap-3">
                <Settings className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
                Administração
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${adminAberto ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {adminAberto ? (
              <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
                {adminChildren.map((item) => {
                  const ativo = linkAtivo(pathname, item.href);
                  const Icone = resolverIcone(item.label);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={fechar}
                      className={`flex min-h-11 touch-manipulation items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                        ativo
                          ? "border-l-2 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      style={
                        ativo
                          ? {
                              backgroundColor: brand.primaryLight,
                              color: brand.primary,
                              borderLeftColor: brand.primary,
                            }
                          : undefined
                      }
                      aria-current={ativo ? "page" : undefined}
                    >
                      <Icone
                        className={`h-4 w-4 shrink-0 ${ativo ? "" : "text-slate-400"}`}
                        style={ativo ? { color: brand.primary } : undefined}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
