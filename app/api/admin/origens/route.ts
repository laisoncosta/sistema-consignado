import { NextResponse } from "next/server";

import {
  filtroRegiaoParaNome,
  rotuloRegiaoProduto,
  type FiltroRegiaoProduto,
  type OrigemCatalogoItem,
  type RegiaoCatalogo,
} from "@/lib/admin-origens";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";
  const regiaoFiltro = (searchParams.get("regiao") ?? "todos") as FiltroRegiaoProduto;
  const nomeRegiao = filtroRegiaoParaNome(regiaoFiltro);

  try {
    const regioes = await prisma.regiao.findMany({
      orderBy: { nome: "asc" },
    });

    const regioesCatalogo: RegiaoCatalogo[] = regioes.map((regiao) => ({
      id: regiao.id,
      nome: regiao.nome,
      rotulo: rotuloRegiaoProduto(regiao.nome),
    }));

    const origens = await prisma.origem.findMany({
      where: {
        ...(nomeRegiao
          ? { regiao: { nome: { equals: nomeRegiao, mode: "insensitive" } } }
          : {}),
        ...(busca
          ? { nome: { contains: busca, mode: "insensitive" } }
          : {}),
      },
      include: { regiao: true },
      orderBy: [{ regiao: { nome: "asc" } }, { nome: "asc" }],
    });

    return NextResponse.json({
      origens: origens.map(serializarOrigem),
      regioes: regioesCatalogo,
    });
  } catch (error) {
    console.error("Erro ao listar origens:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as origens." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const nome = String(body.nome ?? "").trim();
    const regiaoId = Number(body.regiaoId);

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
      },
    });

    if (duplicada) {
      return NextResponse.json(
        { error: "Já existe uma origem com este nome nesta região." },
        { status: 409 },
      );
    }

    const origem = await prisma.origem.create({
      data: { nome, regiaoId },
      include: { regiao: true },
    });

    return NextResponse.json({
      origem: serializarOrigem(origem),
    });
  } catch (error) {
    console.error("Erro ao cadastrar origem:", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar a origem." },
      { status: 500 },
    );
  }
}
