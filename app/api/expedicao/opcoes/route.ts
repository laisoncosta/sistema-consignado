import { NextResponse } from "next/server";

import { criarIntervaloDatas } from "@/lib/expedicao-serializer";
import { requireExpedicaoApiAccess } from "@/lib/auth-guard";
import {
  filtroRegiaoLojaParaWhere,
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
} from "@/lib/regiao-scope";
import { filtroPedidoNaoExcluido } from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireExpedicaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio") ?? "";
  const dataFim = searchParams.get("dataFim") ?? "";
  const promotorId = Number(searchParams.get("promotorId") ?? "");
  const escopo = resolverEscopoRegiao(
    auth.session,
    auth.role,
    searchParams.get("regiao"),
  );
  const filtroPedidoRegiao = filtroRegiaoParaWhere(escopo);
  const filtroLojaRegiao = filtroRegiaoLojaParaWhere(escopo);

  const intervalo = criarIntervaloDatas(dataInicio, dataFim);

  if (!intervalo) {
    return NextResponse.json(
      { error: "Informe um período válido." },
      { status: 400 },
    );
  }

  try {
    const pedidosNoPeriodo = await prisma.pedido.findMany({
      where: {
        createdAt: { gte: intervalo.inicio, lte: intervalo.fim },
        ...filtroPedidoNaoExcluido,
        ...filtroPedidoRegiao,
      },
      select: { usuarioId: true, lojaId: true },
    });

    const promotorIds = [...new Set(pedidosNoPeriodo.map((p) => p.usuarioId))];
    const lojaIdsPedidos = [...new Set(pedidosNoPeriodo.map((p) => p.lojaId))];

    const promotores = await prisma.usuario.findMany({
      where: {
        id: { in: promotorIds.length > 0 ? promotorIds : [-1] },
        funcao: { equals: "Promotor", mode: "insensitive" },
        ativo: true,
        ...(escopo.regiaoId ? { regiaoId: escopo.regiaoId } : {}),
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });

    let lojaIdsFiltro = lojaIdsPedidos;

    if (Number.isInteger(promotorId) && promotorId > 0) {
      const vinculos = await prisma.usuarioLoja.findMany({
        where: { usuarioId: promotorId },
        select: { lojaId: true },
      });
      const vinculadas = new Set(vinculos.map((v) => v.lojaId));
      lojaIdsFiltro = lojaIdsPedidos.filter((id) => vinculadas.has(id));
    }

    const lojas = await prisma.loja.findMany({
      where: {
        id: { in: lojaIdsFiltro.length > 0 ? lojaIdsFiltro : [-1] },
        ativo: true,
        ...filtroLojaRegiao,
      },
      orderBy: { nome: "asc" },
      select: { id: true, codigo: true, nome: true },
    });

    const lojasTransferencia = await prisma.loja.findMany({
      where: {
        ativo: true,
        ...filtroLojaRegiao,
      },
      orderBy: { nome: "asc" },
      select: { id: true, codigo: true, nome: true },
    });

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        ...(escopo.regiaoId ? { regiaoId: escopo.regiaoId } : {}),
        ...(escopo.regiaoNome && !escopo.regiaoId
          ? {
              regiao: {
                nome: { equals: escopo.regiaoNome, mode: "insensitive" },
              },
            }
          : {}),
      },
      orderBy: { descricao: "asc" },
      select: { id: true, codigo: true, descricao: true },
    });

    const origens = await prisma.origem.findMany({
      where: {
        ...(escopo.regiaoId ? { regiaoId: escopo.regiaoId } : {}),
        ...(escopo.regiaoNome && !escopo.regiaoId
          ? {
              regiao: {
                nome: { equals: escopo.regiaoNome, mode: "insensitive" },
              },
            }
          : {}),
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });

    return NextResponse.json({
      acessoGlobalRegiao: escopo.acessoGlobal,
      promotores: promotores.map((p) => ({
        id: p.id,
        label: p.nome,
      })),
      lojas: lojas.map((l) => ({
        id: l.id,
        label: `${l.codigo} - ${l.nome}`,
      })),
      lojasTransferencia: lojasTransferencia.map((l) => ({
        id: l.id,
        label: `${l.codigo} - ${l.nome}`,
      })),
      produtos: produtos.map((p) => ({
        id: p.id,
        label: `${p.codigo} - ${p.descricao}`,
      })),
      origens: origens.map((o) => ({
        id: o.id,
        label: o.nome,
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar opções da expedição:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os filtros." },
      { status: 500 },
    );
  }
}
