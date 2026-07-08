import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const promotorId = Number(id);
  const { searchParams } = new URL(request.url);
  const regiaoId = Number(searchParams.get("regiaoId"));

  if (!Number.isInteger(promotorId) || promotorId <= 0) {
    return NextResponse.json({ error: "Promotor inválido." }, { status: 400 });
  }

  if (!Number.isInteger(regiaoId) || regiaoId <= 0) {
    return NextResponse.json(
      { error: "Informe uma região válida." },
      { status: 400 },
    );
  }

  try {
    const promotor = await prisma.usuario.findFirst({
      where: {
        id: promotorId,
        ativo: true,
        regiaoId,
        funcao: { equals: "Promotor", mode: "insensitive" },
      },
    });

    if (!promotor) {
      return NextResponse.json(
        { error: "Promotor não encontrado nesta região." },
        { status: 404 },
      );
    }

    const vinculos = await prisma.usuarioLoja.findMany({
      where: {
        usuarioId: promotorId,
        loja: {
          ativo: true,
          regiaoId,
        },
      },
      include: { loja: true },
      orderBy: { loja: { nome: "asc" } },
    });

    return NextResponse.json({
      lojas: vinculos.map((vinculo) => ({
        id: String(vinculo.loja.id),
        codigo: vinculo.loja.codigo,
        rotulo: `${vinculo.loja.codigo} - ${vinculo.loja.nome}`,
        regiaoId: vinculo.loja.regiaoId,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar lojas do promotor:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar lojas do promotor." },
      { status: 500 },
    );
  }
}
