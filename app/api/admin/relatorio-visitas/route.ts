import { NextResponse } from "next/server";

import { criarIntervaloDatasBrasil, extrairDataBrasil } from "@/lib/data-brasil";
import { requireGestaoApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/rbac";
import {
  avaliarFarolIntegridadeVisita,
  calcularTempoEmLojaMinutos,
  formatarTempoEmLoja,
  normalizarChaveRegiaoRelatorio,
  rotuloTipoLancamentoVisita,
  type OpcoesFiltroRelatorioVisitas,
  type RegistroRelatorioVisita,
} from "@/lib/relatorio-visitas";
import {
  calcularStatusPedidoExpedicao,
  classificarAlertaCancelamentoPedido,
} from "@/lib/expedicao";
import {
  formatarNumeroAmigavelPedido,
  pedidoEstaExcluido,
} from "@/lib/pedido-numero-amigavel";
import {
  filtroRegiaoLojaParaWhere,
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
  roleFromSession,
} from "@/lib/regiao-scope";
import {
  montarMetaPaginacao,
  resolverParametrosPaginacao,
} from "@/lib/paginacao";

function formatarHoraBrasil(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

async function montarOpcoesFiltro(
  escopo: ReturnType<typeof resolverEscopoRegiao>,
): Promise<OpcoesFiltroRelatorioVisitas> {
  const whereRegiaoUsuario = {
    ativo: true,
    funcao: { equals: "Promotor", mode: "insensitive" as const },
    ...filtroRegiaoParaWhere(escopo),
  };

  const whereRegiaoLoja = {
    ativo: true,
    ...filtroRegiaoLojaParaWhere(escopo),
  };

  const [promotores, lojas] = await Promise.all([
    prisma.usuario.findMany({
      where: whereRegiaoUsuario,
      select: {
        id: true,
        nome: true,
        regiaoId: true,
        regiao: { select: { nome: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.loja.findMany({
      where: whereRegiaoLoja,
      select: {
        id: true,
        codigo: true,
        nome: true,
        regiaoId: true,
        regiao: { select: { nome: true } },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  return {
    promotores: promotores.map((promotor) => ({
      value: String(promotor.id),
      label: promotor.nome,
      regiaoId: promotor.regiaoId,
      regiaoChave: normalizarChaveRegiaoRelatorio(promotor.regiao.nome),
    })),
    lojas: lojas.map((loja) => ({
      value: String(loja.id),
      label: `${loja.codigo} - ${loja.nome}`,
      regiaoId: loja.regiaoId,
      regiaoChave: normalizarChaveRegiaoRelatorio(loja.regiao.nome),
    })),
  };
}

export async function GET(request: Request) {
  const auth = await requireGestaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataInicial = String(searchParams.get("dataInicial") ?? "").trim();
  const dataFinal = String(searchParams.get("dataFinal") ?? "").trim();
  const { pagina, limite, skip, take } = resolverParametrosPaginacao(
    searchParams.get("pagina"),
    searchParams.get("limite"),
  );
  const role = roleFromSession(auth.session);
  const acessoGlobal = role === ROLES.DIRETOR;
  const escopo = resolverEscopoRegiao(
    auth.session,
    role ?? ROLES.ADMINISTRADOR,
    "todos",
  );

  try {
    const intervalo =
      dataInicial && dataFinal
        ? criarIntervaloDatasBrasil(dataInicial, dataFinal)
        : null;

    const wherePedidos = {
      ...filtroRegiaoParaWhere(escopo),
      ...(intervalo
        ? {
            createdAt: {
              gte: intervalo.inicio,
              lte: intervalo.fim,
            },
          }
        : {}),
    };

    const [total, pedidos, opcoesFiltro] = await Promise.all([
      prisma.pedido.count({ where: wherePedidos }),
      prisma.pedido.findMany({
        where: wherePedidos,
        include: {
          usuario: true,
          loja: true,
          regiao: true,
          itens: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      montarOpcoesFiltro(escopo),
    ]);

    const registros: RegistroRelatorioVisita[] = pedidos.map((pedido) => {
      const tempoMinutos = calcularTempoEmLojaMinutos(
        pedido.inicioVisitaEm,
        pedido.createdAt,
      );

      const statusItens = pedido.itens.map((item) => item.status);
      const statusPedido = pedidoEstaExcluido(pedido.status)
        ? pedido.status
        : calcularStatusPedidoExpedicao(statusItens);

      return {
        id: pedido.id,
        numeroAmigavel: pedido.numeroAmigavel,
        numeroAmigavelRotulo: formatarNumeroAmigavelPedido(
          pedido.numeroAmigavel,
        ),
        status: statusPedido,
        alertaCancelamento: classificarAlertaCancelamentoPedido(statusItens),
        data: extrairDataBrasil(pedido.createdAt, pedido.regiao.nome),
        horaEnvio: formatarHoraBrasil(pedido.createdAt),
        promotorId: pedido.usuarioId,
        promotorNome: pedido.usuario.nome,
        promotorEmail: pedido.usuario.usuario,
        lojaId: pedido.lojaId,
        lojaRotulo: pedido.loja.nome,
        regiaoId: pedido.regiaoId,
        regiaoNome: pedido.regiao.nome,
        tipoLancamento: rotuloTipoLancamentoVisita(pedido.tipoLancamento),
        tempoEmLoja: formatarTempoEmLoja(tempoMinutos),
        tempoEmLojaMinutos: tempoMinutos,
        distanciaLojaMetros: pedido.distanciaLojaMetros,
        farolIntegridade: avaliarFarolIntegridadeVisita({
          latitudeEnvio: pedido.latitudeEnvio,
          longitudeEnvio: pedido.longitudeEnvio,
          distanciaLojaMetros: pedido.distanciaLojaMetros,
        }),
      };
    });

    return NextResponse.json({
      registros,
      opcoesFiltro,
      paginacao: montarMetaPaginacao(total, pagina, limite),
      meta: {
        acessoGlobal,
        regiaoUsuario: auth.session.regiaoNome || null,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar relatório de visitas:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o relatório de visitas." },
      { status: 500 },
    );
  }
}
