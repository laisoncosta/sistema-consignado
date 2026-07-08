import { ROLES, normalizeRole, type UserRole } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

export type FiltroRegiaoScope = "todos" | "manaus" | "rio-branco";

export type EscopoRegiaoResolvido = {
  regiaoId: number | null;
  regiaoNome: string | null;
  acessoGlobal: boolean;
};

export function usuarioTemAcessoGlobalRegiao(
  session: SessionUser,
  role: UserRole,
): boolean {
  return role === ROLES.DIRETOR;
}

export function resolverEscopoRegiao(
  session: SessionUser,
  role: UserRole,
  regiaoFiltro?: string | null,
): EscopoRegiaoResolvido {
  if (usuarioTemAcessoGlobalRegiao(session, role)) {
    const filtro = (regiaoFiltro ?? "todos") as FiltroRegiaoScope;

    if (filtro === "manaus") {
      return {
        regiaoId: null,
        regiaoNome: "Manaus",
        acessoGlobal: true,
      };
    }

    if (filtro === "rio-branco") {
      return {
        regiaoId: null,
        regiaoNome: "Rio Branco",
        acessoGlobal: true,
      };
    }

    return {
      regiaoId: null,
      regiaoNome: null,
      acessoGlobal: true,
    };
  }

  return {
    regiaoId: session.regiaoId > 0 ? session.regiaoId : null,
    regiaoNome: session.regiaoNome || null,
    acessoGlobal: false,
  };
}

export function filtroRegiaoParaWhere(
  escopo: EscopoRegiaoResolvido,
): { regiaoId?: number; regiao?: { nome: { equals: string; mode: "insensitive" } } } {
  if (escopo.regiaoId) {
    return { regiaoId: escopo.regiaoId };
  }

  if (escopo.regiaoNome) {
    return {
      regiao: { nome: { equals: escopo.regiaoNome, mode: "insensitive" } },
    };
  }

  return {};
}

export function filtroRegiaoLojaParaWhere(
  escopo: EscopoRegiaoResolvido,
): { regiaoId?: number; regiao?: { nome: { equals: string; mode: "insensitive" } } } {
  if (escopo.regiaoId) {
    return { regiaoId: escopo.regiaoId };
  }

  if (escopo.regiaoNome) {
    return {
      regiao: { nome: { equals: escopo.regiaoNome, mode: "insensitive" } },
    };
  }

  return {};
}

export function roleFromSession(session: SessionUser): UserRole | null {
  return normalizeRole(session.funcao);
}
