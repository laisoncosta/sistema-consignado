import { NextResponse } from "next/server";

import { requireDiretorApiAccess } from "@/lib/auth-guard";
import {
  formatarNumeroAmigavelPedido,
  pedidoEstaExcluido,
  STATUS_PEDIDO_PADRAO_RESTAURACAO,
} from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolverStatusOriginalPedido(
  pedidoId: number,
): Promise<string> {
  const logExclusao = await prisma.logAuditoria.findFirst({
    where: {
      acao: "EXCLUSAO_PEDIDO",
      registroAlterado: { contains: `(id:${pedidoId})` },
    },
    orderBy: { createdAt: "desc" },
    select: { valorAnterior: true },
  });

  const statusAnterior = logExclusao?.valorAnterior?.trim() ?? "";

  if (!statusAnterior || pedidoEstaExcluido(statusAnterior)) {
    return STATUS_PEDIDO_PADRAO_RESTAURACAO;
  }

  return statusAnterior;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDiretorApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const pedidoId = Number(id);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const motivo = String(body.motivo ?? "").trim();

    if (!motivo) {
      return NextResponse.json(
        { error: "Informe o motivo da reativação." },
        { status: 400 },
      );
    }

    const diretorId = await resolveSessionUserId(auth.session);

    if (diretorId <= 0) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        numeroAmigavel: true,
        status: true,
        tipoLancamento: true,
        lojaId: true,
        usuarioId: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (!pedidoEstaExcluido(pedido.status)) {
      return NextResponse.json(
        { error: "Este pedido não está cancelado." },
        { status: 409 },
      );
    }

    const statusRestaurado = await resolverStatusOriginalPedido(pedido.id);
    const numeroRotulo = formatarNumeroAmigavelPedido(pedido.numeroAmigavel);
    const restauradoEm = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          status: statusRestaurado,
          motivoExclusao: null,
          excluidoEm: null,
          excluidoPorId: null,
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: diretorId,
          perfil: auth.session.funcao,
          acao: "RESTAURACAO_PEDIDO",
          registroAlterado: `Pedido ${numeroRotulo} (id:${pedido.id})`,
          valorAnterior: pedido.status,
          valorNovo: JSON.stringify({
            status: statusRestaurado,
            motivo,
            restauradoEm: restauradoEm.toISOString(),
            restauradoPorId: diretorId,
            numeroAmigavel: pedido.numeroAmigavel,
            tipoLancamento: pedido.tipoLancamento,
            lojaId: pedido.lojaId,
            promotorId: pedido.usuarioId,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      mensagem: `Pedido ${numeroRotulo} reativado com sucesso.`,
      pedido: {
        id: pedido.id,
        numeroAmigavel: pedido.numeroAmigavel,
        numeroAmigavelRotulo: numeroRotulo,
        status: statusRestaurado,
      },
    });
  } catch (error) {
    console.error("Erro ao restaurar pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível restaurar o pedido." },
      { status: 500 },
    );
  }
}
