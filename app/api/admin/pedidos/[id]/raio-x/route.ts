import { NextResponse } from "next/server";

import { requireGestaoApiAccess } from "@/lib/auth-guard";
import { extrairDataBrasil } from "@/lib/data-brasil";
import { serializarPedidoRaioX } from "@/lib/pedido-raio-x";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireGestaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const pedidoId = Number(id);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        usuario: { select: { nome: true, usuario: true } },
        loja: {
          select: {
            nome: true,
            codigo: true,
            latitude: true,
            longitude: true,
          },
        },
        regiao: { select: { nome: true } },
        itens: {
          select: {
            status: true,
            pedidoSolicitado: true,
            trocas: true,
            produto: { select: { descricao: true } },
            logsExpedicao: {
              include: { usuario: { select: { nome: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    const logsAuditoria = await prisma.logAuditoria.findMany({
      where: {
        acao: { in: ["EXCLUSAO_PEDIDO", "RESTAURACAO_PEDIDO"] },
        registroAlterado: { contains: `(id:${pedidoId})` },
      },
      include: { usuario: { select: { nome: true } } },
      orderBy: { createdAt: "asc" },
    });

    const raioX = serializarPedidoRaioX({
      ...pedido,
      dataBrasil: extrairDataBrasil(pedido.createdAt, pedido.regiao.nome),
      logsAuditoria,
    });

    return NextResponse.json({ raioX });
  } catch (error) {
    console.error("Erro ao carregar raio-x do pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os detalhes do pedido." },
      { status: 500 },
    );
  }
}
