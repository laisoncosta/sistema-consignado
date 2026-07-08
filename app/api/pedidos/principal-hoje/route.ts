import { NextResponse } from "next/server";

import {
  criarLinhasPedidoIniciais,
  type LinhasPedidoForm,
} from "@/lib/pedido";
import { criarIntervaloDatasBrasil, obterDataHojeBrasil } from "@/lib/data-brasil";
import { filtroRegiaoParaWhere, resolverEscopoRegiao, roleFromSession } from "@/lib/regiao-scope";
import { getSession } from "@/lib/session";
import { filtroPedidoNaoExcluido } from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";

function mapearLinhasPedido(
  itens: Array<{
    produtoId: number;
    estoque: number;
    avaria: number;
    trocas: number;
    pedidoSolicitado: number;
  }>,
): LinhasPedidoForm {
  const linhas = criarLinhasPedidoIniciais([]);

  for (const item of itens) {
    const chave = String(item.produtoId);
    linhas[chave] = {
      estoque: String(item.estoque),
      avaria: String(item.avaria),
      trocas: String(item.trocas),
      pedido: String(item.pedidoSolicitado),
    };
  }

  return linhas;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lojaId = Number(searchParams.get("lojaId") ?? "");
  const dataReferencia =
    searchParams.get("data") ?? obterDataHojeBrasil(session.regiaoNome);

  if (!Number.isInteger(lojaId) || lojaId <= 0) {
    return NextResponse.json({ error: "Loja inválida." }, { status: 400 });
  }

  const role = roleFromSession(session);
  const escopo = role ? resolverEscopoRegiao(session, role) : null;

  const vinculo = await prisma.usuarioLoja.findFirst({
    where: { usuarioId: session.id, lojaId },
  });

  if (!vinculo) {
    return NextResponse.json(
      { error: "Loja não vinculada a este promotor." },
      { status: 403 },
    );
  }

  try {
    const intervalo = criarIntervaloDatasBrasil(dataReferencia, dataReferencia);

    if (!intervalo) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    }

    const pedido = await prisma.pedido.findFirst({
      where: {
        usuarioId: session.id,
        lojaId,
        tipoLancamento: "principal",
        createdAt: { gte: intervalo.inicio, lte: intervalo.fim },
        ...filtroPedidoNaoExcluido,
        ...(escopo ? filtroRegiaoParaWhere(escopo) : {}),
      },
      include: { itens: true },
      orderBy: { createdAt: "asc" },
    });

    if (!pedido) {
      return NextResponse.json({ linhas: null });
    }

    return NextResponse.json({
      pedidoId: pedido.id,
      linhas: mapearLinhasPedido(pedido.itens),
    });
  } catch (error) {
    console.error("Erro ao buscar pedido principal:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o pedido principal." },
      { status: 500 },
    );
  }
}
