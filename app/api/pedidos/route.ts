import { NextResponse } from "next/server";

import { registrarEnvioPedidoLoja } from "@/lib/controle-pedido-loja";
import { criarIntervaloDatasBrasil, extrairDataBrasil, obterDataHojeBrasil } from "@/lib/data-brasil";
import { canAccessPortalPedidos, isGestaoRole, normalizeRole } from "@/lib/rbac";
import {
  filtroRegiaoLojaParaWhere,
  filtroRegiaoParaWhere,
  resolverEscopoRegiao,
  roleFromSession,
} from "@/lib/regiao-scope";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import { getSession } from "@/lib/session";
import {
  cercaVirtualDeveValidarGps,
  validarPedidoCercaVirtual,
} from "@/lib/cerca-virtual";
import { hostIndicaTunelHttps } from "@/lib/request-scheme";
import { calcularStatusPedidoExpedicao } from "@/lib/expedicao";
import {
  alocarProximoNumeroAmigavel,
  filtroPedidoNaoExcluido,
  formatarNumeroAmigavelPedido,
} from "@/lib/pedido-numero-amigavel";
import { prisma } from "@/lib/prisma";

function cercaBypassAmbienteServidor(request: Request): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  return hostIndicaTunelHttps(host.split(",")[0]?.trim() ?? "");
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const role = roleFromSession(session);

  if (!role || !canAccessPortalPedidos(role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const regiaoIdParam = searchParams.get("regiaoId");
  const lojaIdParam = Number(searchParams.get("lojaId") ?? "");
  const escopo = resolverEscopoRegiao(session, role);
  const gestao = isGestaoRole(role);

  try {
    if (Number.isInteger(lojaIdParam) && lojaIdParam > 0) {
      const loja = await prisma.loja.findFirst({
        where: { id: lojaIdParam, ativo: true },
      });

      if (!loja) {
        return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
      }

      if (!gestao) {
        const usuarioId = await resolveSessionUserId(session);

        if (usuarioId <= 0) {
          return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
        }

        const vinculo = await prisma.usuarioLoja.findFirst({
          where: { usuarioId, lojaId: lojaIdParam },
        });

        if (!vinculo) {
          return NextResponse.json(
            { error: "Loja não vinculada a este promotor." },
            { status: 403 },
          );
        }

        if (
          !escopo.acessoGlobal &&
          session.regiaoId > 0 &&
          loja.regiaoId !== session.regiaoId
        ) {
          return NextResponse.json({ error: "Acesso negado à região." }, { status: 403 });
        }
      } else if (
        !escopo.acessoGlobal &&
        session.regiaoId > 0 &&
        loja.regiaoId !== session.regiaoId
      ) {
        return NextResponse.json({ error: "Acesso negado à região." }, { status: 403 });
      }

      const vinculos = await prisma.lojaProduto.findMany({
        where: {
          lojaId: lojaIdParam,
          ativo: true,
          produto: { ativo: true },
        },
        include: { produto: true },
        orderBy: { produto: { descricao: "asc" } },
      });

      let cercaVirtual:
        | {
            exigeValidacao: boolean;
            promotor: { cercaVirtualAtiva: boolean };
            loja: {
              cercaVirtualAtiva: boolean;
              latitude: number | null;
              longitude: number | null;
              perimetroCerca: number;
            };
          }
        | undefined;

      if (!gestao) {
        const usuarioId = await resolveSessionUserId(session);
        const usuario = await prisma.usuario.findFirst({
          where: { id: usuarioId },
          select: { cercaVirtualAtiva: true },
        });

        const promotor = {
          cercaVirtualAtiva: usuario?.cercaVirtualAtiva ?? false,
        };
        const lojaCerca = {
          cercaVirtualAtiva: loja.cercaVirtualAtiva,
          latitude: loja.latitude,
          longitude: loja.longitude,
          perimetroCerca: loja.perimetroCerca ?? 0,
        };

        cercaVirtual = {
          exigeValidacao: cercaVirtualDeveValidarGps(promotor, lojaCerca),
          promotor,
          loja: lojaCerca,
        };
      }

      return NextResponse.json({
        regiaoId: loja.regiaoId,
        produtos: vinculos.map((vinculo) => ({
          id: String(vinculo.produto.id),
          codigoCiss: vinculo.produto.codigo,
          nome: vinculo.produto.descricao,
        })),
        ...(cercaVirtual ? { cercaVirtual } : {}),
      });
    }

    let regiaoId = regiaoIdParam
      ? Number(regiaoIdParam)
      : escopo.regiaoId ?? session.regiaoId;

    if (escopo.acessoGlobal && regiaoIdParam) {
      regiaoId = Number(regiaoIdParam);
    } else if (!escopo.acessoGlobal && session.regiaoId > 0) {
      regiaoId = session.regiaoId;
    }

    if (!regiaoId || !Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Informe uma loja ou região válida." },
        { status: 400 },
      );
    }

    if (
      !escopo.acessoGlobal &&
      session.regiaoId > 0 &&
      regiaoId !== session.regiaoId
    ) {
      return NextResponse.json({ error: "Acesso negado à região." }, { status: 403 });
    }

    const produtos = await prisma.produto.findMany({
      where: {
        regiaoId,
        ativo: true,
      },
      orderBy: { descricao: "asc" },
    });

    return NextResponse.json({
      regiaoId,
      produtos: produtos.map((produto) => ({
        id: String(produto.id),
        codigoCiss: produto.codigo,
        nome: produto.descricao,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar produtos do catálogo:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar produtos." },
      { status: 500 },
    );
  }
}

type LinhaPedidoPayload = {
  produtoId?: number;
  produtoCodigo?: string;
  estoque?: number;
  avaria?: number;
  trocas?: number;
  pedido?: number;
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const role = roleFromSession(session);

  if (!role || !canAccessPortalPedidos(role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const escopo = resolverEscopoRegiao(session, role);

  try {
    const body = await request.json();
    const usuarioId = Number(body.usuarioId ?? session.id);
    const lojaId = Number(body.lojaId);
    let regiaoId = Number(body.regiaoId ?? session.regiaoId);
    const linhas = Array.isArray(body.linhas) ? (body.linhas as LinhaPedidoPayload[]) : [];
    const tipoLancamento =
      body.tipo === "complementar" ? "complementar" : "principal";

    const loja = await prisma.loja.findFirst({
      where: { id: lojaId, ativo: true },
    });

    if (!loja) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    if (!regiaoId || regiaoId <= 0) {
      regiaoId = loja.regiaoId;
    }

    if (
      !Number.isInteger(usuarioId) ||
      usuarioId <= 0 ||
      !Number.isInteger(lojaId) ||
      lojaId <= 0 ||
      !Number.isInteger(regiaoId) ||
      regiaoId <= 0
    ) {
      return NextResponse.json(
        { error: "Promotor, loja e região são obrigatórios." },
        { status: 400 },
      );
    }

    if (!isGestaoRole(role) && session.id > 0 && session.id !== usuarioId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    if (
      !escopo.acessoGlobal &&
      session.regiaoId > 0 &&
      regiaoId !== session.regiaoId
    ) {
      return NextResponse.json(
        { error: "Pedido permitido apenas para sua região." },
        { status: 403 },
      );
    }

    if (loja.regiaoId !== regiaoId) {
      return NextResponse.json(
        { error: "Loja inválida para a região selecionada." },
        { status: 400 },
      );
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        regiaoId,
        ativo: true,
        funcao: { equals: "Promotor", mode: "insensitive" },
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Promotor inválido." }, { status: 400 });
    }

    const vinculo = await prisma.usuarioLoja.findFirst({
      where: { usuarioId, lojaId },
    });

    if (!vinculo) {
      return NextResponse.json(
        { error: "Loja não vinculada a este promotor." },
        { status: 400 },
      );
    }

    const latitudePedido =
      body.latitude_envio != null
        ? Number(body.latitude_envio)
        : body.latitude != null
          ? Number(body.latitude)
          : null;
    const longitudePedido =
      body.longitude_envio != null
        ? Number(body.longitude_envio)
        : body.longitude != null
          ? Number(body.longitude)
          : null;
    const distanciaLojaMetrosInformada =
      body.distancia_loja_metros != null
        ? Number(body.distancia_loja_metros)
        : null;
    const inicioVisitaBruto = String(body.inicio_visita ?? "").trim();
    const inicioVisitaEm =
      inicioVisitaBruto.length > 0 ? new Date(inicioVisitaBruto) : null;
    const inicioVisitaValido =
      inicioVisitaEm != null && !Number.isNaN(inicioVisitaEm.getTime())
        ? inicioVisitaEm
        : null;

    const resultadoCerca = cercaBypassAmbienteServidor(request)
      ? { exigeValidacao: false, permitido: true }
      : validarPedidoCercaVirtual({
          promotor: { cercaVirtualAtiva: usuario.cercaVirtualAtiva },
          loja: {
            cercaVirtualAtiva: loja.cercaVirtualAtiva,
            latitude: loja.latitude,
            longitude: loja.longitude,
            perimetroCerca: loja.perimetroCerca,
          },
          latitude: latitudePedido,
          longitude: longitudePedido,
        });

    if (!resultadoCerca.permitido) {
      return NextResponse.json(
        { error: resultadoCerca.erro ?? "Localização fora do perímetro permitido." },
        { status: 403 },
      );
    }

    const produtosRegiao = await prisma.produto.findMany({
      where: { regiaoId, ativo: true },
    });

    const itensCreate = [];
    const produtosIncluidos = new Set<number>();

    for (const linha of linhas) {
      const pedidoSolicitado = Number(linha.pedido ?? 0);
      const estoque = Number(linha.estoque ?? 0);
      const avaria = Number(linha.avaria ?? 0);
      const trocas = Number(linha.trocas ?? 0);

      if (tipoLancamento === "complementar") {
        if (pedidoSolicitado <= 0) {
          continue;
        }
      } else if (
        pedidoSolicitado === 0 &&
        estoque === 0 &&
        avaria === 0 &&
        trocas === 0
      ) {
        continue;
      }

      const produto =
        (linha.produtoId
          ? produtosRegiao.find((item) => item.id === linha.produtoId)
          : null) ??
        produtosRegiao.find(
          (item) => item.codigo === String(linha.produtoCodigo ?? ""),
        ) ??
        produtosRegiao.find((item) => item.id === Number(linha.produtoCodigo));

      if (!produto) {
        continue;
      }

      if (produtosIncluidos.has(produto.id)) {
        continue;
      }

      produtosIncluidos.add(produto.id);

      itensCreate.push({
        produtoId: produto.id,
        estoque: tipoLancamento === "complementar" ? 0 : estoque,
        avaria: tipoLancamento === "complementar" ? 0 : avaria,
        trocas: tipoLancamento === "complementar" ? 0 : trocas,
        pedidoSolicitado,
        status:
          pedidoSolicitado <= 0 && trocas <= 0 ? "APROVADO" : "PENDENTE",
      });
    }

    if (itensCreate.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um item no pedido." },
        { status: 400 },
      );
    }

    const dataReferencia = obterDataHojeBrasil(session.regiaoNome);
    const intervalo = criarIntervaloDatasBrasil(dataReferencia, dataReferencia);
    const filtroData = intervalo
      ? { createdAt: { gte: intervalo.inicio, lte: intervalo.fim } }
      : {};

    const [principalHoje, complementarHoje] = await Promise.all([
      prisma.pedido.count({
        where: {
          lojaId,
          tipoLancamento: "principal",
          ...filtroPedidoNaoExcluido,
          ...filtroData,
        },
      }),
      prisma.pedido.count({
        where: {
          lojaId,
          tipoLancamento: "complementar",
          ...filtroPedidoNaoExcluido,
          ...filtroData,
        },
      }),
    ]);

    if (tipoLancamento === "principal" && principalHoje >= 1) {
      return NextResponse.json(
        { error: "O pedido principal de hoje já foi enviado para esta loja." },
        { status: 409 },
      );
    }

    if (tipoLancamento === "complementar") {
      if (principalHoje < 1) {
        return NextResponse.json(
          { error: "Envie o pedido principal antes do pedido extra." },
          { status: 400 },
        );
      }

      if (complementarHoje >= 1) {
        return NextResponse.json(
          { error: "O pedido extra de hoje já foi enviado para esta loja." },
          { status: 409 },
        );
      }
    }

    const pedido = await prisma.$transaction(async (tx) => {
      const numeroAmigavel = await alocarProximoNumeroAmigavel(tx);

      return tx.pedido.create({
        data: {
          numeroAmigavel,
          usuarioId,
          lojaId,
          regiaoId,
          tipoLancamento,
          status: "AGUARDANDO_APROVACAO",
          ...(Number.isFinite(latitudePedido) ? { latitudeEnvio: latitudePedido } : {}),
          ...(Number.isFinite(longitudePedido)
            ? { longitudeEnvio: longitudePedido }
            : {}),
          ...(Number.isFinite(distanciaLojaMetrosInformada)
            ? { distanciaLojaMetros: distanciaLojaMetrosInformada }
            : resultadoCerca.distanciaMetros != null
              ? { distanciaLojaMetros: resultadoCerca.distanciaMetros }
              : {}),
          ...(inicioVisitaValido ? { inicioVisitaEm: inicioVisitaValido } : {}),
          itens: { create: itensCreate },
        },
        include: {
          regiao: true,
          loja: true,
          usuario: true,
          itens: true,
        },
      });
    });

    const statusPedido = calcularStatusPedidoExpedicao(
      pedido.itens.map((item) => item.status),
    );

    if (statusPedido !== pedido.status) {
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { status: statusPedido },
      });
      pedido.status = statusPedido;
    }

    const dataReferenciaPedido = extrairDataBrasil(
      pedido.createdAt,
      pedido.regiao.nome,
    );

    await registrarEnvioPedidoLoja(
      session.email,
      String(lojaId),
      tipoLancamento === "complementar" ? "complementar" : "principal",
      session.id,
      dataReferenciaPedido,
    );

    return NextResponse.json({
      pedido: {
        id: pedido.id,
        numeroAmigavel: pedido.numeroAmigavel,
        numeroAmigavelRotulo: formatarNumeroAmigavelPedido(pedido.numeroAmigavel),
        status: pedido.status,
        regiaoId: pedido.regiaoId,
        regiaoNome: pedido.regiao.nome,
        lojaId: pedido.lojaId,
        usuarioId: pedido.usuarioId,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o pedido." },
      { status: 500 },
    );
  }
}
