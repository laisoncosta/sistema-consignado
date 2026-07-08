import { NextResponse } from "next/server";

import {
  filtroRegiaoParaNome,
  normalizarPrecoUnitario,
  rotuloRegiaoProduto,
  type FiltroRegiaoProduto,
  type FiltroStatusProduto,
  type ProdutoCatalogoItem,
  type ProdutoContadores,
  type RegiaoCatalogo,
} from "@/lib/admin-produtos";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";
  const regiaoFiltro = searchParams.get("regiao") ?? "todos";
  const statusFiltro = (searchParams.get("status") ?? "todos") as FiltroStatusProduto;
  const nomeRegiao = filtroRegiaoParaNome(
    regiaoFiltro as FiltroRegiaoProduto,
  );

  const filtroAtivo =
    statusFiltro === "ativos"
      ? { ativo: true }
      : statusFiltro === "inativos"
        ? { ativo: false }
        : {};

  try {
    const regioes = await prisma.regiao.findMany({
      orderBy: { nome: "asc" },
    });

    const regioesCatalogo: RegiaoCatalogo[] = regioes.map((regiao) => ({
      id: regiao.id,
      nome: regiao.nome,
      rotulo: rotuloRegiaoProduto(regiao.nome),
    }));

    const [todosProdutos, produtos] = await Promise.all([
      prisma.produto.findMany({
        include: { regiao: true },
      }),
      prisma.produto.findMany({
        where: {
          ...filtroAtivo,
          ...(nomeRegiao
            ? { regiao: { nome: { equals: nomeRegiao, mode: "insensitive" } } }
            : {}),
          ...(busca
            ? {
                OR: [
                  { codigo: { contains: busca, mode: "insensitive" } },
                  { descricao: { contains: busca, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { regiao: true },
        orderBy: [{ regiao: { nome: "asc" } }, { descricao: "asc" }],
      }),
    ]);

    const contadores: ProdutoContadores = {
      listados: todosProdutos.length,
      manaus: todosProdutos.filter((produto) =>
        produto.regiao.nome.toLowerCase().includes("manaus"),
      ).length,
      rioBranco: todosProdutos.filter((produto) =>
        produto.regiao.nome.toLowerCase().includes("rio branco"),
      ).length,
      ativos: todosProdutos.filter((produto) => produto.ativo).length,
      inativos: todosProdutos.filter((produto) => !produto.ativo).length,
    };

    return NextResponse.json({
      produtos: produtos.map(serializarProduto),
      regioes: regioesCatalogo,
      contadores,
    });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os produtos." },
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
    const codigo = String(body.codigo ?? "").trim();
    const descricao = String(body.descricao ?? "").trim();
    const regiaoId = Number(body.regiaoId);
    const ativo = body.ativo !== false;
    const precoUnitario = normalizarPrecoUnitario(body.precoUnitario);

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
      where: { codigo, regiaoId },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Já existe um produto com este código nesta região." },
        { status: 409 },
      );
    }

    const produto = await prisma.produto.create({
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
    console.error("Erro ao cadastrar produto:", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o produto." },
      { status: 500 },
    );
  }
}
