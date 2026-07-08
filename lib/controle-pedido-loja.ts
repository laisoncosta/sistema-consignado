import { prisma } from "@/lib/prisma";
import { obterDataHoje } from "@/lib/pedido";
import type { ControlePedidoLojaDia } from "@/lib/controle-pedido-loja-client";

export type { ControlePedidoLojaDia } from "@/lib/controle-pedido-loja-client";
export { MENSAGEM_PEDIDO_EXTRA_BLOQUEADO } from "@/lib/controle-pedido-loja-client";

export async function obterControlePedidoLojaDia(
  usuarioEmail: string,
  lojaId: string,
  usuarioId?: number,
  data = obterDataHoje(),
): Promise<ControlePedidoLojaDia> {
  try {
    const registro = await prisma.controlePedidoLojaDia.findUnique({
      where: {
        usuarioEmail_lojaId_dataReferencia: {
          usuarioEmail,
          lojaId,
          dataReferencia: data,
        },
      },
    });

    if (!registro) {
      return { pedidoPrincipalEnviado: false, pedidoExtraRealizado: false };
    }

    return {
      pedidoPrincipalEnviado: registro.pedidoPrincipalEnviado,
      pedidoExtraRealizado: registro.pedidoExtraRealizado,
    };
  } catch (error) {
    console.warn("Controle de pedido indisponível no banco:", error);
    return { pedidoPrincipalEnviado: false, pedidoExtraRealizado: false };
  }
}

export async function registrarEnvioPedidoLoja(
  usuarioEmail: string,
  lojaId: string,
  tipo: "principal" | "complementar",
  usuarioId?: number,
  data = obterDataHoje(),
): Promise<ControlePedidoLojaDia> {
  const atual = await obterControlePedidoLojaDia(
    usuarioEmail,
    lojaId,
    usuarioId,
    data,
  );

  const atualizado: ControlePedidoLojaDia = {
    pedidoPrincipalEnviado:
      tipo === "principal" ? true : atual.pedidoPrincipalEnviado,
    pedidoExtraRealizado:
      tipo === "complementar" ? true : atual.pedidoExtraRealizado,
  };

  try {
    await prisma.controlePedidoLojaDia.upsert({
      where: {
        usuarioEmail_lojaId_dataReferencia: {
          usuarioEmail,
          lojaId,
          dataReferencia: data,
        },
      },
      create: {
        usuarioEmail,
        usuarioId: usuarioId && usuarioId > 0 ? usuarioId : null,
        lojaId,
        dataReferencia: data,
        pedidoPrincipalEnviado: atualizado.pedidoPrincipalEnviado,
        pedidoExtraRealizado: atualizado.pedidoExtraRealizado,
      },
      update: {
        usuarioId: usuarioId && usuarioId > 0 ? usuarioId : undefined,
        pedidoPrincipalEnviado: atualizado.pedidoPrincipalEnviado,
        pedidoExtraRealizado: atualizado.pedidoExtraRealizado,
      },
    });
  } catch (error) {
    console.warn("Não foi possível persistir controle de pedido:", error);
  }

  return atualizado;
}
