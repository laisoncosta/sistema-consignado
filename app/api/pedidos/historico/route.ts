import { NextResponse } from "next/server";

import {
  HISTORICO_PEDIDOS_MOCK,
  consolidarLancamentosHistorico,
  deveExibirItemPedidoExtra,
  normalizarStatusPedido,
  type LancamentoHistoricoRaw,
} from "@/lib/historico-pedidos";
import { extrairDataBrasil } from "@/lib/data-brasil";
import { resolverStatusItemExpedicao } from "@/lib/expedicao";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/rbac";
import {
  filtroRegiaoLojaParaWhere,
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
  roleFromSession,
} from "@/lib/regiao-scope";
import {
  filtroPedidoNaoExcluido,
  formatarNumeroAmigavelPedido,
} from "@/lib/pedido-numero-amigavel";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import { getSession } from "@/lib/session";

function criarLancamentoBase(
  parcial: Omit<LancamentoHistoricoRaw, "qtdeTransf" | "bonificacao" | "motivo">,
): LancamentoHistoricoRaw {
  return {
    ...parcial,
    qtdeTransf: 0,
    bonificacao: 0,
    motivo: "",
  };
}

function tipoPedidoHistorico(tipoLancamento: string): "Normal" | "Extra" {
  return tipoLancamento === "complementar" ? "Extra" : "Normal";
}

function mapearPedidoPrisma(
  pedido: {
    id: number;
    numeroAmigavel: number;
    status: string;
    tipoLancamento: string;
    createdAt: Date;
    regiao: { nome: string };
    loja: { id: number; nome: string };
    itens: Array<{
      id: number;
      status: string;
      produtoId: number;
      produto: { id: number; codigo: string; descricao: string };
      estoque: number;
      avaria: number;
      trocas: number;
      pedidoSolicitado: number;
      cortePedido: number | null;
      corteTroca: number | null;
    }>;
  },
): LancamentoHistoricoRaw[] {
  const data = extrairDataBrasil(pedido.createdAt, pedido.regiao.nome);
  const numeroAmigavelRotulo = formatarNumeroAmigavelPedido(
    pedido.numeroAmigavel,
  );

  return pedido.itens.map((item) =>
    criarLancamentoBase({
      id: `${pedido.id}-${item.id}`,
      data,
      produtoId: String(item.produtoId),
      produtoNome: item.produto.descricao,
      lojaId: String(pedido.loja.id),
      lojaRotulo: pedido.loja.nome,
      status: normalizarStatusPedido(
        resolverStatusItemExpedicao(
          item.status || pedido.status,
          item.pedidoSolicitado,
          item.trocas,
        ),
      ),
      tipoPedido: tipoPedidoHistorico(pedido.tipoLancamento),
      estoque: item.estoque,
      qtdSolicitada: item.pedidoSolicitado,
      corte: item.cortePedido ?? 0,
      avarias: item.avaria,
      trocasSolicitadas: item.trocas,
      corteTroca: item.corteTroca ?? 0,
      pedidoId: pedido.id,
      numeroAmigavel: pedido.numeroAmigavel,
      numeroAmigavelRotulo,
      statusPedido: pedido.status,
    }),
  );
}

function mapearTransferenciaPrisma(transferencia: {
  id: number;
  quantidade: number;
  bonificacao: number;
  motivo: string;
  data: Date;
  produtoId: number;
  produto: { descricao: string };
  lojaId: number;
  loja: { nome: string; regiao: { nome: string } };
}): LancamentoHistoricoRaw {
  return criarLancamentoBase({
    id: `transf-${transferencia.id}`,
    data: extrairDataBrasil(transferencia.data, transferencia.loja.regiao.nome),
    produtoId: String(transferencia.produtoId),
    produtoNome: transferencia.produto.descricao,
    lojaId: String(transferencia.lojaId),
    lojaRotulo: transferencia.loja.nome,
    status: "Aprovado",
    tipoPedido: "Normal",
    estoque: 0,
    qtdSolicitada: 0,
    corte: 0,
    avarias: 0,
    trocasSolicitadas: 0,
    corteTroca: 0,
  });
}

function aplicarTransferenciaNoLancamento(
  lancamento: LancamentoHistoricoRaw,
  transferencia: {
    quantidade: number;
    bonificacao: number;
    motivo: string;
  },
): LancamentoHistoricoRaw {
  return {
    ...lancamento,
    qtdeTransf: lancamento.qtdeTransf + transferencia.quantidade,
    bonificacao: lancamento.bonificacao + transferencia.bonificacao,
    motivo: lancamento.motivo
      ? `${lancamento.motivo} | ${transferencia.motivo.trim()}`
      : transferencia.motivo.trim(),
  };
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Histórico do promotor: sem validação de GPS/cerca virtual.
  try {
    const usuarioId = await resolveSessionUserId(session);

    if (usuarioId > 0) {
      const role = roleFromSession(session);
      const escopo = resolverEscopoRegiao(session, role ?? ROLES.PROMOTOR);

      const vinculos = await prisma.usuarioLoja.findMany({
        where: {
          usuarioId,
          loja: {
            ativo: true,
            ...filtroRegiaoLojaParaWhere(escopo),
          },
        },
        select: { lojaId: true },
      });
      const lojaIds = vinculos.map((vinculo) => vinculo.lojaId);

      if (lojaIds.length === 0) {
        return NextResponse.json({ lancamentos: [] });
      }

      const pedidos = await prisma.pedido.findMany({
        where: {
          usuarioId,
          lojaId: { in: lojaIds },
          ...filtroPedidoNaoExcluido,
          ...filtroRegiaoParaWhere(escopo),
        },
        include: {
          loja: true,
          regiao: true,
          itens: { include: { produto: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      let lancamentos = consolidarLancamentosHistorico(
        pedidos.flatMap(mapearPedidoPrisma),
      );

      const transferencias = await prisma.transferenciaAvulsa.findMany({
        where: {
          lojaId: { in: lojaIds },
          loja: filtroRegiaoLojaParaWhere(escopo),
        },
        include: {
          produto: true,
          loja: { include: { regiao: true } },
        },
        orderBy: { data: "desc" },
      });

      for (const transferencia of transferencias) {
        const data = extrairDataBrasil(
          transferencia.data,
          transferencia.loja.regiao.nome,
        );
        const indice = lancamentos.findIndex(
          (lancamento) =>
            lancamento.data === data &&
            lancamento.produtoId === String(transferencia.produtoId) &&
            lancamento.lojaId === String(transferencia.lojaId),
        );

        if (indice >= 0) {
          lancamentos[indice] = aplicarTransferenciaNoLancamento(
            lancamentos[indice],
            transferencia,
          );
          continue;
        }

        lancamentos.push({
          ...mapearTransferenciaPrisma(transferencia),
          qtdeTransf: transferencia.quantidade,
          bonificacao: transferencia.bonificacao,
          motivo: transferencia.motivo.trim(),
        });
      }

      return NextResponse.json({
        lancamentos: lancamentos.filter((item) =>
          deveExibirItemPedidoExtra(item.tipoPedido, item.qtdSolicitada),
        ),
      });
    }
  } catch (error) {
    console.warn("Histórico via banco indisponível:", error);
  }

  return NextResponse.json({ lancamentos: HISTORICO_PEDIDOS_MOCK });
}
