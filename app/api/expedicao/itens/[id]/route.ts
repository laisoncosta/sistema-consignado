import { NextResponse } from "next/server";

import {
  calcularPedidoAprovado,
  calcularStatusPedidoExpedicao,
  calcularTrocaAtendida,
  origemObrigatoriaExpedicao,
  podeExpedicaoAlterarItemPorData,
  quantidadesAprovadasParaExibicao,
  resolverStatusItemExpedicao,
  type ItemPedidoExpedicaoDetalhe,
} from "@/lib/expedicao";
import { extrairDataBrasil } from "@/lib/data-brasil";
import { requireExpedicaoApiAccess } from "@/lib/auth-guard";
import { isGestaoRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializarDetalhe(item: {
  id: number;
  estoque: number;
  avaria: number;
  trocas: number;
  pedidoSolicitado: number;
  pedidoAtendido: number | null;
  cortePedido: number | null;
  estoqueConferido: number | null;
  corteTroca: number | null;
  trocaAtendida: number | null;
  bonificacao: number;
  origemId: number | null;
  origemSaida: string | null;
  status: string;
  pedido: {
    id: number;
    createdAt: Date;
    usuario: { nome: string };
    loja: { nome: string };
    regiao: { nome: string };
  };
  produto: { descricao: string };
  logsExpedicao: Array<{
    id: number;
    acao: string;
    detalhes: string | null;
    createdAt: Date;
    usuario: { nome: string };
  }>;
}): ItemPedidoExpedicaoDetalhe {
  const cortePedido = item.cortePedido ?? 0;
  const corteTroca = item.corteTroca ?? 0;
  const status = resolverStatusItemExpedicao(
    item.status,
    item.pedidoSolicitado,
    item.trocas,
  );

  const pedidoAprovadoCalculado = calcularPedidoAprovado(
    item.pedidoSolicitado,
    cortePedido,
    item.pedidoAtendido,
  );
  const trocaAtendidaCalculada = calcularTrocaAtendida(
    item.trocas,
    corteTroca,
    item.trocaAtendida,
  );
  const { pedidoAprovado, trocaAtendida } = quantidadesAprovadasParaExibicao(
    status,
    pedidoAprovadoCalculado,
    trocaAtendidaCalculada,
  );

  return {
    itemPedidoId: item.id,
    pedidoId: item.pedido.id,
    promotorNome: item.pedido.usuario.nome,
    lojaNome: item.pedido.loja.nome,
    produtoNome: item.produto.descricao,
    dataPedido: item.pedido.createdAt.toISOString(),
    estoque: item.estoqueConferido ?? item.estoque,
    pedidoSolicitado: item.pedidoSolicitado,
    cortePedido,
    pedidoAprovado,
    trocaSolicitada: item.trocas,
    corteTroca,
    trocaAtendida,
    bonificacao: item.bonificacao,
    origemId: item.origemId,
    origemSaida: item.origemSaida,
    status,
    logs: item.logsExpedicao.map((log) => ({
      id: log.id,
      acao: log.acao,
      detalhes: log.detalhes,
      usuarioNome: log.usuario.nome,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

const includeDetalhe = {
  produto: true,
  pedido: {
    include: {
      usuario: true,
      loja: true,
      regiao: true,
    },
  },
  logsExpedicao: {
    include: { usuario: true },
    orderBy: { createdAt: "desc" as const },
  },
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireExpedicaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Item inválido." }, { status: 400 });
  }

  try {
    const item = await prisma.itemPedido.findUnique({
      where: { id: itemId },
      include: includeDetalhe,
    });

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ item: serializarDetalhe(item) });
  } catch (error) {
    console.error("Erro ao carregar item da expedição:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o item." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireExpedicaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Item inválido." }, { status: 400 });
  }

  try {
    const existente = await prisma.itemPedido.findUnique({
      where: { id: itemId },
      include: {
        pedido: { include: { regiao: true } },
      },
    });

    if (!existente) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const regiaoNome = existente.pedido.regiao.nome;
    const dataPedido = extrairDataBrasil(existente.pedido.createdAt, regiaoNome);

    if (!podeExpedicaoAlterarItemPorData(auth.role, dataPedido, regiaoNome)) {
      return NextResponse.json(
        {
          error:
            "Pedidos de dias anteriores só podem ser alterados por ADM ou Diretor.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const finalizar = body.finalizar === true;
    const reprovar = body.reprovar === true;
    const edicaoAdmin = body.edicaoAdmin === true && isGestaoRole(auth.role);

    if (finalizar && reprovar) {
      return NextResponse.json(
        { error: "Informe apenas aprovar ou reprovar." },
        { status: 400 },
      );
    }

    let pedidoSolicitado = existente.pedidoSolicitado;
    let estoque = existente.estoque;
    let trocas = existente.trocas;

    if (edicaoAdmin) {
      if (body.pedidoSolicitado != null) {
        pedidoSolicitado = Number(body.pedidoSolicitado);
      }
      if (body.estoque != null) {
        estoque = Number(body.estoque);
      }
      if (body.trocas != null) {
        trocas = Number(body.trocas);
      }
    }

    let cortePedido = Number(body.cortePedido ?? existente.cortePedido ?? 0);
    let corteTroca = Number(body.corteTroca ?? existente.corteTroca ?? 0);
    const origemId = Number(body.origemId ?? existente.origemId ?? 0);
    const bonificacao = Number(body.bonificacao ?? existente.bonificacao ?? 0);

    if (reprovar) {
      cortePedido = pedidoSolicitado;
      corteTroca = trocas;
    }

    if (
      finalizar &&
      origemObrigatoriaExpedicao(pedidoSolicitado, trocas, cortePedido, corteTroca) &&
      (!origemId || origemId <= 0)
    ) {
      return NextResponse.json(
        { error: "Local de origem é obrigatório para finalizar." },
        { status: 400 },
      );
    }

    if (cortePedido < 0 || corteTroca < 0 || bonificacao < 0) {
      return NextResponse.json(
        { error: "Valores numéricos não podem ser negativos." },
        { status: 400 },
      );
    }

    if (cortePedido > pedidoSolicitado || corteTroca > trocas) {
      return NextResponse.json(
        { error: "Corte não pode ser maior que a quantidade solicitada." },
        { status: 400 },
      );
    }

    const origem =
      origemId > 0
        ? await prisma.origem.findUnique({ where: { id: origemId } })
        : null;

    const exigeOrigem = origemObrigatoriaExpedicao(
      pedidoSolicitado,
      trocas,
      cortePedido,
      corteTroca,
    );

    if (finalizar && exigeOrigem && !origem) {
      return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
    }

    const pedidoAtendido = Math.max(0, pedidoSolicitado - cortePedido);
    const trocaAtendida = Math.max(0, trocas - corteTroca);

    const logsCreate: Array<{
      usuarioId: number;
      acao: string;
      detalhes?: string;
    }> = [];

    if (edicaoAdmin) {
      const alteracoes: string[] = [];

      if (pedidoSolicitado !== existente.pedidoSolicitado) {
        alteracoes.push(
          `Pedido solicitado: ${existente.pedidoSolicitado} → ${pedidoSolicitado}`,
        );
      }
      if (estoque !== existente.estoque) {
        alteracoes.push(`Estoque: ${existente.estoque} → ${estoque}`);
      }
      if (trocas !== existente.trocas) {
        alteracoes.push(`Trocas: ${existente.trocas} → ${trocas}`);
      }

      if (alteracoes.length > 0) {
        logsCreate.push({
          usuarioId: auth.session.id,
          acao: "Edição administrativa",
          detalhes: alteracoes.join(" | "),
        });
      }
    }

    if (reprovar) {
      logsCreate.push({
        usuarioId: auth.session.id,
        acao: "Reprovação",
        detalhes: `Corte total — Pedido: ${cortePedido} | Trocas: ${corteTroca}`,
      });
    } else if (finalizar) {
      const detalhesOrigem = exigeOrigem
        ? `Corte: ${cortePedido} | Aprovado: ${pedidoAtendido} | Origem: ${origem?.nome ?? ""}`
        : `Corte pedido: ${cortePedido} | Corte troca: ${corteTroca} | Sem expedição`;

      logsCreate.push({
        usuarioId: auth.session.id,
        acao: "Aprovação",
        detalhes: detalhesOrigem,
      });
    } else if (logsCreate.length === 0) {
      logsCreate.push({
        usuarioId: auth.session.id,
        acao: "Atualização de cortes",
        detalhes: `Corte pedido: ${cortePedido} | Corte troca: ${corteTroca}`,
      });
    }

    let novoStatus = existente.status;

    if (reprovar) {
      novoStatus = "REPROVADO";
    } else if (finalizar) {
      novoStatus = "APROVADO";
    }

    const item = await prisma.itemPedido.update({
      where: { id: itemId },
      data: {
        pedidoSolicitado,
        estoque,
        estoqueConferido: estoque,
        trocas,
        cortePedido,
        corteTroca,
        pedidoAtendido,
        trocaAtendida,
        bonificacao,
        origemId: reprovar || !exigeOrigem ? null : origemId > 0 ? origemId : null,
        origemSaida:
          reprovar || !exigeOrigem
            ? null
            : origemId > 0
              ? (origem?.nome ?? existente.origemSaida)
              : null,
        status: novoStatus,
        logsExpedicao: { create: logsCreate },
      },
      include: includeDetalhe,
    });

    const itensPedido = await prisma.itemPedido.findMany({
      where: { pedidoId: existente.pedidoId },
      select: { status: true },
    });

    await prisma.pedido.update({
      where: { id: existente.pedidoId },
      data: {
        status: calcularStatusPedidoExpedicao(
          itensPedido.map((registro) => registro.status),
        ),
      },
    });

    return NextResponse.json({ item: serializarDetalhe(item) });
  } catch (error) {
    console.error("Erro ao atualizar item da expedição:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o item." },
      { status: 500 },
    );
  }
}
