import { NextResponse } from "next/server";

import { requireGestaoApiAccess } from "@/lib/auth-guard";
import {
  agregarDashboardExecutivo,
  filtrarItensDashboard,
  type ItemDashboardRaw,
} from "@/lib/dashboard-executivo";
import { criarIntervaloDatasBrasil } from "@/lib/data-brasil";
import {
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
  type FiltroRegiaoScope,
} from "@/lib/regiao-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireGestaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio") ?? "";
  const dataFim = searchParams.get("dataFim") ?? "";
  const lojaId = searchParams.get("lojaId") ?? "";
  const produtoId = searchParams.get("produtoId") ?? "";
  const promotorId = searchParams.get("promotorId") ?? "";
  const diaSemana = searchParams.get("diaSemana") ?? "";
  const compararRegioes = searchParams.get("compararRegioes") === "true";
  const regiaoParam = (searchParams.get("regiao") ?? "todos") as FiltroRegiaoScope;

  const intervalo = criarIntervaloDatasBrasil(dataInicio, dataFim);

  if (!intervalo) {
    return NextResponse.json(
      { error: "Informe um período válido." },
      { status: 400 },
    );
  }

  try {
    const escopo = compararRegioes
      ? resolverEscopoRegiao(auth.session, auth.role, "todos")
      : resolverEscopoRegiao(auth.session, auth.role, regiaoParam);

    const filtroRegiao = filtroRegiaoParaWhere(escopo);

    const itens = await prisma.itemPedido.findMany({
      where: {
        pedido: {
          createdAt: { gte: intervalo.inicio, lte: intervalo.fim },
          ...filtroRegiao,
        },
      },
      include: {
        produto: true,
        origem: true,
        pedido: {
          include: {
            usuario: true,
            loja: true,
            regiao: true,
          },
        },
      },
      orderBy: { pedido: { createdAt: "asc" } },
    });

    const itensFiltrados = filtrarItensDashboard(itens as ItemDashboardRaw[], {
      lojaId,
      produtoId,
      promotorId,
      diaSemana,
    });

    const opcoesBase = agregarDashboardExecutivo(itens as ItemDashboardRaw[]);
    const dados = agregarDashboardExecutivo(itensFiltrados);

    return NextResponse.json({
      dados: {
        ...dados,
        opcoes: opcoesBase.opcoes,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard executivo:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o dashboard." },
      { status: 500 },
    );
  }
}
