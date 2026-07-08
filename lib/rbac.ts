export const ROLES = {
  PROMOTOR: "promotor",
  EXPEDICAO: "expedicao",
  SUPERVISOR: "supervisor",
  ADMINISTRADOR: "administrador",
  DIRETOR: "diretor",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

const ROLE_ALIASES: Record<string, UserRole> = {
  promotor: ROLES.PROMOTOR,
  expedição: ROLES.EXPEDICAO,
  expedicao: ROLES.EXPEDICAO,
  supervisor: ROLES.SUPERVISOR,
  administrador: ROLES.ADMINISTRADOR,
  admin: ROLES.ADMINISTRADOR,
  diretor: ROLES.DIRETOR,
};

export function normalizeRole(funcao: string): UserRole | null {
  const normalized = funcao.trim().toLowerCase();
  return ROLE_ALIASES[normalized] ?? null;
}

export function isGestaoRole(role: UserRole): boolean {
  return role === ROLES.ADMINISTRADOR || role === ROLES.DIRETOR;
}

export function canAccessExpedicao(role: UserRole): boolean {
  return role === ROLES.EXPEDICAO || isGestaoRole(role);
}

export function getHomePath(role: UserRole): string {
  switch (role) {
    case ROLES.PROMOTOR:
      return "/dashboard/portal-pedidos";
    case ROLES.EXPEDICAO:
      return "/dashboard/expedicao";
    case ROLES.SUPERVISOR:
      return "/dashboard/supervisor";
    case ROLES.ADMINISTRADOR:
    case ROLES.DIRETOR:
      return "/dashboard/inicio";
    default:
      return "/login";
  }
}

export function canAccessCadastros(role: UserRole): boolean {
  return isGestaoRole(role);
}

export function canAccessPortalPedidos(role: UserRole): boolean {
  return (
    role === ROLES.PROMOTOR ||
    role === ROLES.ADMINISTRADOR ||
    role === ROLES.DIRETOR
  );
}

export function requiresGpsEnforcement(role: UserRole): boolean {
  return role === ROLES.PROMOTOR;
}

function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0].replace(/\/$/, "");
  return path || "/";
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const path = normalizePathname(pathname);

  if (path === "/dashboard/promotor") {
    return canAccessPortalPedidos(role);
  }

  if (path.startsWith("/dashboard/inicio")) {
    return isGestaoRole(role);
  }

  if (path.startsWith("/dashboard/portal-pedidos")) {
    return canAccessPortalPedidos(role);
  }

  if (path.startsWith("/dashboard/gestao/expedicao")) {
    return canAccessExpedicao(role);
  }

  if (path.startsWith("/dashboard/gestao/relatorio-visitas")) {
    return isGestaoRole(role);
  }

  if (path.startsWith("/dashboard/fechamento")) {
    return isGestaoRole(role);
  }

  if (path.startsWith("/dashboard/admin/produtos")) {
    return canAccessCadastros(role);
  }

  if (path.startsWith("/dashboard/admin/origens")) {
    return canAccessCadastros(role);
  }

  if (path.startsWith("/dashboard/admin/lojas")) {
    return canAccessCadastros(role);
  }

  if (path.startsWith("/dashboard/admin/usuarios")) {
    return canAccessCadastros(role);
  }

  if (path.startsWith("/dashboard/supervisor")) {
    return role === ROLES.SUPERVISOR;
  }

  if (path.startsWith("/dashboard/expedicao")) {
    return canAccessExpedicao(role);
  }

  if (path.startsWith("/dashboard/admin")) {
    return role === ROLES.ADMINISTRADOR;
  }

  if (path.startsWith("/dashboard/diretor")) {
    return role === ROLES.DIRETOR;
  }

  return false;
}

export type SidebarLink = {
  href: string;
  label: string;
  emoji: string;
};

export type SidebarAdminChild = {
  href: string;
  label: string;
  emoji: string;
};

export const GESTAO_SIDEBAR_LINKS: SidebarLink[] = [
  { href: "/dashboard/inicio", label: "Dashboard", emoji: "📊" },
  { href: "/dashboard/portal-pedidos", label: "Portal de Pedidos", emoji: "📦" },
  {
    href: "/dashboard/gestao/expedicao",
    label: "Expedição",
    emoji: "🚚",
  },
  {
    href: "/dashboard/gestao/relatorio-visitas",
    label: "Relatório de Visita",
    emoji: "📍",
  },
  {
    href: "/dashboard/fechamento",
    label: "Fechamento de Resultados",
    emoji: "📈",
  },
];

export const GESTAO_ADMIN_CHILDREN: SidebarAdminChild[] = [
  {
    href: "/dashboard/admin/produtos",
    label: "Cadastro de Produtos",
    emoji: "🥬",
  },
  {
    href: "/dashboard/admin/origens",
    label: "Cadastro de Origens",
    emoji: "📍",
  },
  {
    href: "/dashboard/admin/lojas",
    label: "Cadastro de Lojas",
    emoji: "🏪",
  },
  {
    href: "/dashboard/admin/usuarios",
    label: "Gestão de Usuários e Perfis",
    emoji: "👥",
  },
];

export function getGestaoSidebarLinks(): SidebarLink[] {
  return GESTAO_SIDEBAR_LINKS;
}

export function getGestaoAdminChildren(): SidebarAdminChild[] {
  return GESTAO_ADMIN_CHILDREN;
}

/** @deprecated Use getGestaoSidebarLinks — mantido para compatibilidade */
export type NavItem = {
  href: string;
  label: string;
  visibleFor: UserRole[];
};

/** @deprecated */
export function getNavItemsForRole(_role: UserRole): NavItem[] {
  return [];
}
