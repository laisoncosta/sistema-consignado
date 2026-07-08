import type { PrismaClient } from "@/app/generated/prisma/client";
import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";

export type UsuarioSenhaResetada = {
  id: number;
  nome: string;
  usuario: string;
};

export async function resetarSenhaUsuarioParaPadrao(
  db: PrismaClient,
  usuarioId: number,
): Promise<UsuarioSenhaResetada | null> {
  const existente = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nome: true, usuario: true },
  });

  if (!existente) {
    return null;
  }

  await db.usuario.update({
    where: { id: usuarioId },
    data: {
      senha: SENHA_INICIAL_PADRAO,
      alterarSenhaObrigatorio: true,
    },
  });

  return existente;
}
