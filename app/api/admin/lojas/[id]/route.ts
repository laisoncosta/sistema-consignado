import { NextResponse } from "next/server";

import {
  normalizarCoordenada,
  normalizarPerimetroCerca,
  rotuloRegiaoProduto,
  statusCercaLojaParaBoolean,
  type LojaCatalogoItem,
  type ProdutoLojaVinculo,
} from "@/lib/admin-lojas";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { resolverCoordenadasLoja } from "@/lib/geocodificar-loja-salvar";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const lojaId = Number(id);

  if (!Number.isInteger(lojaId) || lojaId <= 0) {
    return NextResponse.json({ error: "Loja inválida." }, { status: 400 });
  }

  try {
    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      include: {
        regiao: true,
        produtosVinculados: {
          where: { ativo: true },
          select: { produtoId: true },
        },
      },
    });

    if (!loja) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    const produtosRegiao = await prisma.produto.findMany({
      where: { regiaoId: loja.regiaoId, ativo: true },
      orderBy: { descricao: "asc" },
    });

    const produtosAtivosIds = new Set(
      loja.produtosVinculados.map((vinculo) => vinculo.produtoId),
    );

    const produtos: ProdutoLojaVinculo[] = produtosRegiao.map((produto) => ({
      id: produto.id,
      codigo: produto.codigo,
      descricao: produto.descricao,
      ativoNaLoja: produtosAtivosIds.has(produto.id),
    }));

    return NextResponse.json({
      loja: serializarLoja(loja),
      produtos,
    });
  } catch (error) {
    console.error("Erro ao carregar loja:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar a loja." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const lojaId = Number(id);

  if (!Number.isInteger(lojaId) || lojaId <= 0) {
    return NextResponse.json({ error: "Loja inválida." }, { status: 400 });
  }

  try {
    const existente = await prisma.loja.findUnique({
      where: { id: lojaId },
      include: { regiao: true },
    });

    if (!existente) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const codigo = String(body.codigo ?? existente.codigo).trim();
    const nome = String(body.nome ?? existente.nome).trim();
    const regiaoId = Number(body.regiaoId ?? existente.regiaoId);
    const ativo =
      typeof body.ativo === "boolean" ? body.ativo : existente.ativo;
    const cep = String(body.cep ?? existente.cep ?? "").trim() || null;
    const rua = String(body.rua ?? existente.rua ?? "").trim() || null;
    const numero = String(body.numero ?? existente.numero ?? "").trim() || null;
    const bairro = String(body.bairro ?? existente.bairro ?? "").trim() || null;
    const cidade = String(body.cidade ?? existente.cidade ?? "").trim() || null;
    const latitudeInformada = normalizarCoordenada(
      body.latitude ?? existente.latitude,
    );
    const longitudeInformada = normalizarCoordenada(
      body.longitude ?? existente.longitude,
    );
    const cercaVirtualAtiva =
      body.cercaVirtualStatus !== undefined
        ? statusCercaLojaParaBoolean(
            body.cercaVirtualStatus === "ativar" ? "ativar" : "desativar",
          )
        : existente.cercaVirtualAtiva;
    const perimetroCerca = cercaVirtualAtiva
      ? body.perimetro !== undefined
        ? normalizarPerimetroCerca(body.perimetro)
        : existente.perimetroCerca
      : 0;
    const produtosAtivos = Array.isArray(body.produtosAtivos)
      ? body.produtosAtivos
          .map((item: unknown) => Number(item))
          .filter(
            (item: number): item is number =>
              Number.isInteger(item) && item > 0,
          )
      : null;

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
      where: {
        codigo,
        regiaoId,
        NOT: { id: lojaId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Já existe uma loja com este código CISS nesta região." },
        { status: 409 },
      );
    }

    const loja = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.loja.update({
        where: { id: lojaId },
        data: {
          codigo,
          nome,
          ativo,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          latitude,
          longitude,
          cercaVirtualAtiva,
          perimetroCerca,
          regiao: { connect: { id: regiaoId } },
        },
        include: { regiao: true },
      });

      if (produtosAtivos !== null) {
        const produtosRegiao = await tx.produto.findMany({
          where: { regiaoId: atualizada.regiaoId },
          select: { id: true },
        });

        const idsRegiao = new Set(produtosRegiao.map((produto) => produto.id));
        const idsAtivos: number[] = produtosAtivos.filter((produtoId: number) =>
          idsRegiao.has(produtoId),
        );

        await tx.lojaProduto.deleteMany({ where: { lojaId } });

        if (idsAtivos.length > 0) {
          await tx.lojaProduto.createMany({
            data: idsAtivos.map((produtoId) => ({
              lojaId,
              produtoId,
              ativo: true,
            })),
          });
        }
      }

      return atualizada;
    });

    return NextResponse.json({
      loja: serializarLoja(loja),
    });
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a loja." },
      { status: 500 },
    );
  }
}
