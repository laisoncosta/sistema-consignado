import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { resetarAparelhoUsuario } from "@/lib/device-id";
import { prisma } from "@/lib/prisma";

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
    const existente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true },
    });

    if (!existente) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    await resetarAparelhoUsuario(usuarioId);

    return NextResponse.json({
      success: true,
      mensagem: "Aparelho cadastrado resetado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao resetar aparelho:", error);
    return NextResponse.json(
      { error: "Não foi possível resetar o aparelho cadastrado." },
      { status: 500 },
    );
  }
}
