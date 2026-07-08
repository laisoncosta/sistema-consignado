import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export async function resolveSessionUserId(
  session: SessionUser,
): Promise<number> {
  if (session.id > 0) {
    return session.id;
  }

  const login = (session.usuario || session.email)?.trim();
  if (!login) {
    return 0;
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      usuario: { equals: login, mode: "insensitive" },
      ativo: true,
    },
    select: { id: true },
  });

  return usuario?.id ?? 0;
}

/** Garante id do banco na sessão (login de teste sem id no cookie). */
export async function hydrateSessionUser(
  session: SessionUser,
): Promise<SessionUser> {
  if (session.id > 0) {
    return session;
  }

  const resolvedId = await resolveSessionUserId(session);

  if (resolvedId <= 0) {
    return session;
  }

  return { ...session, id: resolvedId };
}
