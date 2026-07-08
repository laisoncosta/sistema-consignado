import { normalizarEmailLogin } from "@/lib/admin-usuarios";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

type BuscarUsuarioPorEmailLoginOptions = {
  excludeUsuarioId?: number;
  tx?: TransactionClient;
};

export async function buscarUsuarioPorEmailLogin(
  email: string,
  options?: BuscarUsuarioPorEmailLoginOptions,
) {
  const normalizado = normalizarEmailLogin(email);

  if (!normalizado) {
    return null;
  }

  const client = options?.tx ?? prisma;

  return client.usuario.findFirst({
    where: {
      usuario: { equals: normalizado, mode: "insensitive" },
      ...(options?.excludeUsuarioId
        ? { NOT: { id: options.excludeUsuarioId } }
        : {}),
    },
    select: { id: true },
  });
}

export async function emailLoginJaCadastrado(
  email: string,
  options?: BuscarUsuarioPorEmailLoginOptions,
): Promise<boolean> {
  const existente = await buscarUsuarioPorEmailLogin(email, options);
  return Boolean(existente);
}

export function isErroEmailLoginDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
