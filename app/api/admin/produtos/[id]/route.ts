import { NextResponse } from "next/server";

import {
  normalizarPrecoUnitario,
  rotuloRegiaoProduto,
  type ProdutoCatalogoItem,
} from "@/lib/admin-produtos";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializarProduto(produto: {
  id: number;
  codigo: string;
  descricao: string;
  precoUnitario: { toNumber?: () => number } | number | string;
  ativo: boolean;
  regiaoId: number;
  regiao: { id: number; nome: string };
}): ProdutoCatalogoItem {
  const preco =
    typeof produto.precoUnitario === "object" &&
    produto.precoUnitario !== null &&
    "toNumber" in produto.precoUnitario &&
    typeof produto.precoUnitario.toNumber === "function"
      ? produto.precoUnitario.toNumber()
      : Number(produto.precoUnitario);

  return {
    id: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    precoUnitario: normalizarPrecoUnitario(preco),
    ativo: produto.ativo,
    regiaoId: produto.regiaoId,
    regiaoNome: produto.regiao.nome,
    regiaoRotulo: rotuloRegiaoProduto(produto.regiao.nome),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const produtoId = Number(id);

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }

  try {
    const existente = await prisma.produto.findUnique({
      where: { id: produtoId },
    });

    if (!existente) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const codigo = String(body.codigo ?? existente.codigo).trim();
    const descricao = String(body.descricao ?? existente.descricao).trim();
    const regiaoId = Number(body.regiaoId ?? existente.regiaoId);
    const ativo =
      typeof body.ativo === "boolean" ? body.ativo : existente.ativo;
    const precoUnitario = normalizarPrecoUnitario(
      body.precoUnitario ?? existente.precoUnitario,
    );

    if (!codigo || !descricao || !Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Código, nome e região são obrigatórios." },
        { status: 400 },
      );
    }

    const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId } });

    if (!regiao) {
      return NextResponse.json({ error: "Região inválida." }, { status: 400 });
    }

    const duplicado = await prisma.produto.findFirst({
      where: {
        codigo,
        regiaoId,
        NOT: { id: produtoId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Já existe um produto com este código nesta região." },
        { status: 409 },
      );
    }

    const produto = await prisma.produto.update({
      where: { id: produtoId },
      data: {
        codigo,
        descricao,
        precoUnitario,
        ativo,
        regiaoId,
      },
      include: { regiao: true },
    });

    return NextResponse.json({
      produto: serializarProduto(produto),
    });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o produto." },
      { status: 500 },
    );
  }
}
