import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { resetarSenhaUsuarioParaPadrao } from "@/lib/resetar-senha-usuario";
import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  }

  try {
    const usuario = await resetarSenhaUsuarioParaPadrao(prisma, usuarioId);

    if (!usuario) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mensagem: `Senha de ${usuario.nome} redefinida para ${SENHA_INICIAL_PADRAO}. No próximo login será obrigatório alterá-la.`,
    });
  } catch (error) {
    console.error("Erro ao resetar senha do usuário:", error);
    return NextResponse.json(
      { error: "Não foi possível resetar a senha." },
      { status: 500 },
    );
  }
}
