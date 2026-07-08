import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";

import type { GeneroUsuario } from "@/lib/usuario";
import { normalizarGenero } from "@/lib/usuario";
import { isHttpsRequest } from "@/lib/request-scheme";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  /** @deprecated Use `name` — mantido para compatibilidade */
  nome: string;
  usuario: string;
  funcao: string;
  genero: GeneroUsuario;
  regiaoId: number;
  regiaoNome: string;
  alterarSenhaObrigatorio?: boolean;
  regioesAcessoIds?: number[];
};

export const SESSION_COOKIE = "shi_session";

type HeaderReader = {
  get(name: string): string | null;
};

function cookieSecureFlag(headers?: HeaderReader): boolean {
  if (headers && isHttpsRequest(headers)) {
    return true;
  }

  if (process.env.COOKIE_SECURE === "true") {
    return true;
  }

  if (process.env.COOKIE_SECURE === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function sessionCookieOptions(headers?: HeaderReader) {
  const secure = cookieSecureFlag(headers);

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

export function applySessionToResponse(
  response: NextResponse,
  user: SessionUser,
  request?: Request,
): NextResponse {
  response.cookies.set(
    SESSION_COOKIE,
    JSON.stringify(user),
    sessionCookieOptions(request?.headers),
  );
  return response;
}

export function clearSessionFromResponse(
  response: NextResponse,
  request?: Request,
): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(request?.headers),
    maxAge: 0,
  });
  return response;
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify(user),
    sessionCookieOptions(headerStore),
  );
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    const email = parsed.email ?? parsed.usuario;
    const name = parsed.name ?? parsed.nome;
    const funcao = parsed.funcao;
    const regiaoNome = parsed.regiaoNome;

    if (!email || !funcao || !regiaoNome) {
      return null;
    }

    return {
      id: parsed.id ?? 0,
      email,
      name: name ?? email,
      nome: name ?? email,
      usuario: parsed.usuario ?? email,
      funcao,
      genero: normalizarGenero(parsed.genero),
      regiaoId: parsed.regiaoId ?? 0,
      regiaoNome,
      alterarSenhaObrigatorio: parsed.alterarSenhaObrigatorio === true,
      regioesAcessoIds: Array.isArray(parsed.regioesAcessoIds)
        ? parsed.regioesAcessoIds
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
