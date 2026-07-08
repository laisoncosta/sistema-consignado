import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const regiaoId = Number(searchParams.get("regiaoId"));

  if (!Number.isInteger(regiaoId) || regiaoId <= 0) {
    return NextResponse.json(
      { error: "Informe uma região válida." },
      { status: 400 },
    );
  }

  try {
    const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId } });

    if (!regiao) {
      return NextResponse.json({ error: "Região não encontrada." }, { status: 404 });
    }

    const promotores = await prisma.usuario.findMany({
      where: {
        ativo: true,
        regiaoId,
        funcao: { equals: "Promotor", mode: "insensitive" },
      },
      include: { regiao: true },
      orderBy: [{ nome: "asc" }],
    });

    return NextResponse.json({
      promotores: promotores.map((promotor) => ({
        id: promotor.id,
        nome: promotor.nome,
        email: promotor.usuario,
        regiaoId: promotor.regiaoId,
        regiaoNome: promotor.regiao.nome,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar promotores:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar promotores." },
      { status: 500 },
    );
  }
}
