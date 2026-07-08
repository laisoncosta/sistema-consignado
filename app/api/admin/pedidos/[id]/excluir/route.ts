import { NextResponse } from "next/server";

import { requireDiretorApiAccess } from "@/lib/auth-guard";
import { calcularStatusPedidoExpedicao } from "@/lib/expedicao";
import {
  formatarNumeroAmigavelPedido,
  pedidoEstaExcluido,
  STATUS_PEDIDO_EXCLUIDO,
} from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
        { error: "Informe o motivo da exclusão." },
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
        itens: { select: { status: true } },
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (pedidoEstaExcluido(pedido.status)) {
      return NextResponse.json(
        { error: "Este pedido já foi excluído." },
        { status: 409 },
      );
    }

    const statusOperacional = calcularStatusPedidoExpedicao(
      pedido.itens.map((item) => item.status),
    );
    const numeroRotulo = formatarNumeroAmigavelPedido(pedido.numeroAmigavel);
    const excluidoEm = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          status: STATUS_PEDIDO_EXCLUIDO,
          motivoExclusao: motivo,
          excluidoEm,
          excluidoPorId: diretorId,
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: diretorId,
          perfil: auth.session.funcao,
          acao: "EXCLUSAO_PEDIDO",
          registroAlterado: `Pedido ${numeroRotulo} (id:${pedido.id})`,
          valorAnterior: statusOperacional,
          valorNovo: JSON.stringify({
            status: STATUS_PEDIDO_EXCLUIDO,
            motivo,
            excluidoEm: excluidoEm.toISOString(),
            excluidoPorId: diretorId,
            numeroAmigavel: pedido.numeroAmigavel,
            tipoLancamento: pedido.tipoLancamento,
            lojaId: pedido.lojaId,
            promotorId: pedido.usuarioId,
            alertaCancelamento: statusOperacional,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      mensagem: `Pedido ${numeroRotulo} excluído com sucesso.`,
      pedido: {
        id: pedido.id,
        numeroAmigavel: pedido.numeroAmigavel,
        numeroAmigavelRotulo: numeroRotulo,
        status: STATUS_PEDIDO_EXCLUIDO,
      },
    });
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir o pedido." },
      { status: 500 },
    );
  }
}
