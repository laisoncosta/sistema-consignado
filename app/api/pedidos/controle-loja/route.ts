import { NextResponse } from "next/server";

import { registrarEnvioPedidoLoja } from "@/lib/controle-pedido-loja";
import { criarIntervaloDatasBrasil, obterDataHojeBrasil } from "@/lib/data-brasil";
import { filtroPedidoNaoExcluido } from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import { getSession } from "@/lib/session";
async function sincronizarControleComPedidos(
  usuarioId: number,
  lojaId: string,
  dataReferencia: string,
) {
  const lojaIdNum = Number(lojaId);
  if (!Number.isInteger(lojaIdNum) || lojaIdNum <= 0) {
    return {
      pedidoPrincipalEnviado: false,
      pedidoExtraRealizado: false,
    };
  }

  const intervalo = criarIntervaloDatasBrasil(dataReferencia, dataReferencia);
  const filtroData = intervalo
    ? { createdAt: { gte: intervalo.inicio, lte: intervalo.fim } }
    : {};

  const [principalHoje, complementarHoje] = await Promise.all([
    prisma.pedido.count({
      where: {
        usuarioId,
        lojaId: lojaIdNum,
        tipoLancamento: "principal",
        ...filtroPedidoNaoExcluido,
        ...filtroData,
      },
    }),
    prisma.pedido.count({
      where: {
        usuarioId,
        lojaId: lojaIdNum,
        tipoLancamento: "complementar",
        ...filtroPedidoNaoExcluido,
        ...filtroData,
      },
    }),
  ]);

  return {
    pedidoPrincipalEnviado: principalHoje >= 1,
    pedidoExtraRealizado: complementarHoje >= 1,
  };
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lojaId = String(searchParams.get("lojaId") ?? "").trim();
  const dataReferencia =
    searchParams.get("data") ??
    obterDataHojeBrasil(session.regiaoNome);

  if (!lojaId) {
    return NextResponse.json(
      { error: "Informe a loja." },
      { status: 400 },
    );
  }

  const usuarioId = await resolveSessionUserId(session);

  if (usuarioId <= 0) {
    return NextResponse.json({
      pedidoPrincipalEnviado: false,
      pedidoExtraRealizado: false,
    });
  }

  const controle = await sincronizarControleComPedidos(
    usuarioId,
    lojaId,
    dataReferencia,
  );
  return NextResponse.json(controle);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const lojaId = String(body.lojaId ?? "").trim();
    const tipo = body.tipo === "complementar" ? "complementar" : "principal";
    const dataReferencia =
      typeof body.dataReferencia === "string"
        ? body.dataReferencia
        : obterDataHojeBrasil(session.regiaoNome);

    if (!lojaId) {
      return NextResponse.json(
        { error: "Informe a loja." },
        { status: 400 },
      );
    }

    const controle = await registrarEnvioPedidoLoja(
      session.email,
      lojaId,
      tipo,
      session.id,
      dataReferencia,
    );

    return NextResponse.json({ success: true, ...controle });
  } catch (error) {
    console.error("Erro ao registrar pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o pedido." },
      { status: 500 },
    );
  }
}
