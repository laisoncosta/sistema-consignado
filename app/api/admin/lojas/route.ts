import { NextResponse } from "next/server";

import {
  filtroRegiaoParaNome,
  normalizarCoordenada,
  normalizarPerimetroCerca,
  rotuloRegiaoProduto,
  statusCercaLojaParaBoolean,
  type FiltroRegiaoProduto,
  type FiltroStatusLoja,
  type LojaCatalogoItem,
  type LojaContadores,
  type RegiaoCatalogo,
} from "@/lib/admin-lojas";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { resolverCoordenadasLoja } from "@/lib/geocodificar-loja-salvar";
import { prisma } from "@/lib/prisma";

function serializarLoja(loja: {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  regiaoId: number;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  cercaVirtualAtiva: boolean;
  perimetroCerca: number;
  regiao: { id: number; nome: string };
}): LojaCatalogoItem {
  return {
    id: loja.id,
    codigo: loja.codigo,
    nome: loja.nome,
    ativo: loja.ativo,
    regiaoId: loja.regiaoId,
    regiaoNome: loja.regiao.nome,
    regiaoRotulo: rotuloRegiaoProduto(loja.regiao.nome),
    cep: loja.cep,
    rua: loja.rua,
    numero: loja.numero,
    bairro: loja.bairro,
    cidade: loja.cidade,
    latitude: loja.latitude,
    longitude: loja.longitude,
    cercaVirtualAtiva: loja.cercaVirtualAtiva,
    perimetroCerca: loja.perimetroCerca,
  };
}

async function listarLojasPromotor(regiaoId: number) {
  const lojas = await prisma.loja.findMany({
    where: { regiaoId, ativo: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({
    lojas: lojas.map((loja) => ({
      id: String(loja.id),
      codigo: loja.codigo,
      nome: `${loja.codigo} - ${loja.nome}`,
    })),
  });
}

async function listarLojasAdmin(request: Request) {
  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";
  const regiaoFiltro = (searchParams.get("regiao") ?? "todos") as FiltroRegiaoProduto;
  const statusFiltro = (searchParams.get("status") ?? "todos") as FiltroStatusLoja;
  const nomeRegiao = filtroRegiaoParaNome(regiaoFiltro);

  const filtroAtivo =
    statusFiltro === "ativas"
      ? { ativo: true }
      : statusFiltro === "inativas"
        ? { ativo: false }
        : {};

  const regioes = await prisma.regiao.findMany({
    orderBy: { nome: "asc" },
  });

  const regioesCatalogo: RegiaoCatalogo[] = regioes.map((regiao) => ({
    id: regiao.id,
    nome: regiao.nome,
    rotulo: rotuloRegiaoProduto(regiao.nome),
  }));

  const [todasLojas, lojasFiltradas] = await Promise.all([
    prisma.loja.findMany({
      include: { regiao: true },
    }),
    prisma.loja.findMany({
      where: {
        ...filtroAtivo,
        ...(nomeRegiao
          ? { regiao: { nome: { equals: nomeRegiao, mode: "insensitive" } } }
          : {}),
        ...(busca
          ? {
              OR: [
                { codigo: { contains: busca, mode: "insensitive" } },
                { nome: { contains: busca, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { regiao: true },
      orderBy: [{ regiao: { nome: "asc" } }, { nome: "asc" }],
    }),
  ]);

  const contadores: LojaContadores = {
    total: todasLojas.length,
    manaus: todasLojas.filter((loja) =>
      loja.regiao.nome.toLowerCase().includes("manaus"),
    ).length,
    rioBranco: todasLojas.filter((loja) =>
      loja.regiao.nome.toLowerCase().includes("rio branco"),
    ).length,
    ativas: todasLojas.filter((loja) => loja.ativo).length,
  };

  return NextResponse.json({
    lojas: lojasFiltradas.map(serializarLoja),
    regioes: regioesCatalogo,
    contadores,
  });
}

export async function GET(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const regiaoIdParam = searchParams.get("regiaoId");

  if (regiaoIdParam) {
    const regiaoId = Number(regiaoIdParam);

    if (!Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Informe uma região válida." },
        { status: 400 },
      );
    }

    try {
      return await listarLojasPromotor(regiaoId);
    } catch (error) {
      console.error("Erro ao listar lojas por região:", error);
      return NextResponse.json(
        { error: "Não foi possível carregar lojas." },
        { status: 500 },
      );
    }
  }

  try {
    return await listarLojasAdmin(request);
  } catch (error) {
    console.error("Erro ao listar lojas:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar lojas." },
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
    const nome = String(body.nome ?? "").trim();
    const regiaoId = Number(body.regiaoId);
    const ativo = body.ativo !== false;
    const cep = String(body.cep ?? "").trim() || null;
    const rua = String(body.rua ?? "").trim() || null;
    const numero = String(body.numero ?? "").trim() || null;
    const bairro = String(body.bairro ?? "").trim() || null;
    const cidade = String(body.cidade ?? "").trim() || null;
    const latitudeInformada = normalizarCoordenada(body.latitude);
    const longitudeInformada = normalizarCoordenada(body.longitude);
    const cercaVirtualAtiva = statusCercaLojaParaBoolean(
      body.cercaVirtualStatus === "ativar" ? "ativar" : "desativar",
    );
    const perimetroCerca = cercaVirtualAtiva
      ? normalizarPerimetroCerca(body.perimetro)
      : 0;

    if (!codigo || !nome || !Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Código CISS, nome e região são obrigatórios." },
        { status: 400 },
      );
    }

    const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId } });

    if (!regiao) {
      return NextResponse.json({ error: "Região inválida." }, { status: 400 });
    }

    const uf = String(body.uf ?? "").trim().toUpperCase().slice(0, 2) || null;
    const coordenadas = await resolverCoordenadasLoja({
      rua,
      numero,
      bairro,
      cidade,
      cep,
      uf,
      regiaoNome: regiao.nome,
      latitude: latitudeInformada,
      longitude: longitudeInformada,
    });
    const latitude = coordenadas.latitude;
    const longitude = coordenadas.longitude;

    const duplicado = await prisma.loja.findFirst({
      where: { codigo, regiaoId },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Já existe uma loja com este código CISS nesta região." },
        { status: 409 },
      );
    }

    const produtosAtivos: number[] = Array.isArray(body.produtosAtivos)
      ? body.produtosAtivos
          .map((item: unknown) => Number(item))
          .filter(
            (item: number): item is number =>
              Number.isInteger(item) && item > 0,
          )
      : [];

    const loja = await prisma.$transaction(async (tx) => {
      const criada = await tx.loja.create({
        data: {
          codigo,
          nome,
          ativo,
          regiaoId,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          latitude,
          longitude,
          cercaVirtualAtiva,
          perimetroCerca,
        },
        include: { regiao: true },
      });

      if (produtosAtivos.length > 0) {
        const produtosRegiao = await tx.produto.findMany({
          where: { regiaoId: criada.regiaoId },
          select: { id: true },
        });

        const idsRegiao = new Set(produtosRegiao.map((produto) => produto.id));
        const idsAtivos = produtosAtivos.filter((produtoId) =>
          idsRegiao.has(produtoId),
        );

        if (idsAtivos.length > 0) {
          await tx.lojaProduto.createMany({
            data: idsAtivos.map((produtoId) => ({
              lojaId: criada.id,
              produtoId,
              ativo: true,
            })),
          });
        }
      }

      return criada;
    });

    return NextResponse.json({
      loja: serializarLoja(loja),
    });
  } catch (error) {
    console.error("Erro ao cadastrar loja:", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar a loja." },
      { status: 500 },
    );
  }
}
