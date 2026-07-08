import { NextResponse } from "next/server";

import { rotuloRegiaoProduto, type OrigemCatalogoItem } from "@/lib/admin-origens";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializarOrigem(origem: {
  id: number;
  nome: string;
  regiaoId: number;
  createdAt: Date;
  regiao: { id: number; nome: string };
}): OrigemCatalogoItem {
  return {
    id: origem.id,
    nome: origem.nome,
    regiaoId: origem.regiaoId,
    regiaoNome: origem.regiao.nome,
    regiaoRotulo: rotuloRegiaoProduto(origem.regiao.nome),
    createdAt: origem.createdAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const origemId = Number(id);

  if (!Number.isInteger(origemId) || origemId <= 0) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
  }

  try {
    const existente = await prisma.origem.findUnique({
      where: { id: origemId },
    });

    if (!existente) {
      return NextResponse.json({ error: "Origem não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const nome = String(body.nome ?? existente.nome).trim();
    const regiaoId = Number(body.regiaoId ?? existente.regiaoId);

    if (!nome || !Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Nome e região são obrigatórios." },
        { status: 400 },
      );
    }

    const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId } });

    if (!regiao) {
      return NextResponse.json({ error: "Região inválida." }, { status: 400 });
    }

    const duplicada = await prisma.origem.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        regiaoId,
        NOT: { id: origemId },
      },
    });

    if (duplicada) {
      return NextResponse.json(
        { error: "Já existe uma origem com este nome nesta região." },
        { status: 409 },
      );
    }

    const origem = await prisma.origem.update({
      where: { id: origemId },
      data: { nome, regiaoId },
      include: { regiao: true },
    });

    return NextResponse.json({
      origem: serializarOrigem(origem),
    });
  } catch (error) {
    console.error("Erro ao atualizar origem:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a origem." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const origemId = Number(id);

  if (!Number.isInteger(origemId) || origemId <= 0) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
  }

  try {
    const existente = await prisma.origem.findUnique({
      where: { id: origemId },
      include: {
        _count: { select: { transferenciasAvulsas: true } },
      },
    });

    if (!existente) {
      return NextResponse.json({ error: "Origem não encontrada." }, { status: 404 });
    }

    if (existente._count.transferenciasAvulsas > 0) {
      return NextResponse.json(
        {
          error:
            "Esta origem possui transferências vinculadas e não pode ser excluída.",
        },
        { status: 409 },
      );
    }

    await prisma.origem.delete({ where: { id: origemId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir origem:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a origem." },
      { status: 500 },
    );
  }
}
