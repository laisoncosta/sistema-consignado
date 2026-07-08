import { NextResponse } from "next/server";

import {
  calcularTiposPedidoMap,
  consolidarLancamentosExpedicao,
  criarIntervaloDatas,
  serializarItemPedido,
  serializarTransferenciaAvulsa,
} from "@/lib/expedicao-serializer";
import type {
  StatusExpedicaoFiltro,
  TipoPedidoFiltro,
} from "@/lib/expedicao";
import { filtroPrismaStatusItemExpedicao } from "@/lib/expedicao";
import { deveExibirItemPedidoExtra } from "@/lib/historico-pedidos";
import { requireExpedicaoApiAccess } from "@/lib/auth-guard";
import {
  filtroRegiaoLojaParaWhere,
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
} from "@/lib/regiao-scope";
import { filtroPedidoNaoExcluido } from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";
import {
  montarMetaPaginacao,
  resolverParametrosPaginacao,
} from "@/lib/paginacao";

export async function GET(request: Request) {
  const auth = await requireExpedicaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio") ?? "";
  const dataFim = searchParams.get("dataFim") ?? "";
  const promotorId = Number(searchParams.get("promotorId") ?? "");
  const lojaId = Number(searchParams.get("lojaId") ?? "");
  const produtoId = Number(searchParams.get("produtoId") ?? "");
  const origemId = Number(searchParams.get("origemId") ?? "");
  const tipoPedido = (searchParams.get("tipoPedido") ?? "todos") as TipoPedidoFiltro;
  const status = (searchParams.get("status") ?? "todos") as StatusExpedicaoFiltro;
  const { pagina, limite, skip, take } = resolverParametrosPaginacao(
    searchParams.get("pagina"),
    searchParams.get("limite"),
  );
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
    const incluirPedidos = tipoPedido !== "avulsa";
    const incluirAvulsos = tipoPedido === "todos" || tipoPedido === "avulsa";

    const linhas = [];

    if (incluirPedidos) {
      const filtroStatusItem = filtroPrismaStatusItemExpedicao(status);

      const itens = await prisma.itemPedido.findMany({
        where: {
          ...filtroStatusItem,
          ...(Number.isInteger(produtoId) && produtoId > 0 ? { produtoId } : {}),
          ...(Number.isInteger(origemId) && origemId > 0 ? { origemId } : {}),
          pedido: {
            createdAt: { gte: intervalo.inicio, lte: intervalo.fim },
            ...filtroPedidoNaoExcluido,
            ...filtroPedidoRegiao,
            ...(Number.isInteger(promotorId) && promotorId > 0
              ? { usuarioId: promotorId }
              : {}),
            ...(Number.isInteger(lojaId) && lojaId > 0 ? { lojaId } : {}),
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
        orderBy: [{ pedido: { createdAt: "desc" } }, { id: "asc" }],
      });

      const tiposPedidoMap = await calcularTiposPedidoMap(itens);

      const itensFiltrados =
        tipoPedido === "normal"
          ? itens.filter(
              (item) => tiposPedidoMap.get(item.pedido.id) === "Normal",
            )
          : tipoPedido === "extra"
            ? itens.filter(
                (item) => tiposPedidoMap.get(item.pedido.id) === "Extra",
              )
            : itens;

      linhas.push(
        ...itensFiltrados
          .filter((item) => {
            const tipo = tiposPedidoMap.get(item.pedido.id) ?? "Normal";
            return deveExibirItemPedidoExtra(tipo, item.pedidoSolicitado);
          })
          .map((item) =>
            serializarItemPedido(
              item,
              tiposPedidoMap.get(item.pedido.id) ?? "Normal",
            ),
          ),
      );
    }

    if (incluirAvulsos) {
      // Transf Avulsa não possui promotor: sempre incluída quando os demais
      // filtros (loja, produto, origem, período) forem atendidos, mesmo com
      // promotorId na query — equivalente a (promotor = X OR tipo = avulsa).
      const transferencias = await prisma.transferenciaAvulsa.findMany({
        where: {
          data: { gte: intervalo.inicio, lte: intervalo.fim },
          ...(Number.isInteger(lojaId) && lojaId > 0 ? { lojaId } : {}),
          ...(Number.isInteger(produtoId) && produtoId > 0 ? { produtoId } : {}),
          ...(Number.isInteger(origemId) && origemId > 0 ? { origemId } : {}),
          loja: filtroLojaRegiao,
          ...(status === "pendente" || status === "reprovado" ? { id: -1 } : {}),
        },
        include: {
          produto: true,
          origem: true,
          loja: { include: { regiao: true } },
        },
        orderBy: { data: "desc" },
      });

      linhas.push(...transferencias.map(serializarTransferenciaAvulsa));
    }

    const linhasConsolidadas = consolidarLancamentosExpedicao(linhas);

    linhasConsolidadas.sort((a, b) => {
      const porData = b.dataLancamento.localeCompare(a.dataLancamento);
      if (porData !== 0) {
        return porData;
      }

      return a.produto.localeCompare(b.produto, "pt-BR");
    });

    const total = linhasConsolidadas.length;
    const lancamentosPaginados = linhasConsolidadas.slice(skip, skip + take);

    return NextResponse.json({
      lancamentos: lancamentosPaginados,
      paginacao: montarMetaPaginacao(total, pagina, limite),
    });
  } catch (error) {
    console.error("Erro ao listar lançamentos da expedição:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os lançamentos." },
      { status: 500 },
    );
  }
}
