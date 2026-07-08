import { redirect } from "next/navigation";

import {
  canAccessCadastros,
  canAccessExpedicao,
  canAccessRoute,
  getHomePath,
  isGestaoRole,
  normalizeRole,
  ROLES,
  type UserRole,
} from "@/lib/rbac";
import { getSession, type SessionUser } from "@/lib/session";

export type AuthenticatedSession = {
  session: SessionUser;
  role: UserRole;
};

export async function requireRouteAccess(
  pathname: string,
): Promise<AuthenticatedSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = normalizeRole(session.funcao);

  if (!role || !canAccessRoute(role, pathname)) {
    redirect(role ? getHomePath(role) : "/login");
  }

  return { session, role };
}

export async function requireCadastroApiAccess(): Promise<AuthenticatedSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const role = normalizeRole(session.funcao);

  if (!role || !canAccessCadastros(role)) {
    return null;
  }

  return { session, role };
}

export async function requireExpedicaoApiAccess(): Promise<AuthenticatedSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const role = normalizeRole(session.funcao);

  if (!role || !canAccessExpedicao(role)) {
    return null;
  }

  return { session, role };
}

export async function requireGestaoApiAccess(): Promise<AuthenticatedSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const role = normalizeRole(session.funcao);

  if (!role || !isGestaoRole(role)) {
    return null;
  }

  return { session, role };
}

export async function requireDiretorApiAccess(): Promise<AuthenticatedSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const role = normalizeRole(session.funcao);

  if (role !== ROLES.DIRETOR) {
    return null;
  }

  return { session, role };
}
