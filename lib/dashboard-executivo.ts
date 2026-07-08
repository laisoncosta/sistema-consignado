import type { FiltroRegiaoScope } from "@/lib/regiao-scope";
import {
  calcularPedidoAprovado,
  calcularTrocaAtendida,
  itemSemSolicitacaoExpedicao,
  normalizarStatusExpedicao,
  quantidadesAprovadasParaExibicao,
} from "@/lib/expedicao";
import { extrairDataBrasil } from "@/lib/data-brasil";

export type RegiaoDashboardExecutivo = FiltroRegiaoScope;

export type FiltrosDashboardExecutivo = {
  dataInicio: string;
  dataFim: string;
  regiao: RegiaoDashboardExecutivo;
  lojaId: string;
  produtoId: string;
  promotorId: string;
  diaSemana: string;
  compararRegioes: boolean;
};

export type SerieBarra = {
  label: string;
  valor: number;
  valor2?: number;
};

export type SerieEmpilhada = {
  label: string;
  cortes: number;
  atendido: number;
};

export type SeriePercentual = {
  label: string;
  percentual: number;
};

export type SerieDiaria = {
  data: string;
  valor: number;
  valor2?: number;
};

export type SerieDiariaComparativa = {
  data: string;
  rioBranco: number;
  manaus: number;
};

export type KpisDashboardExecutivo = {
  pedidosSolicitados: number;
  pedidosAtendidos: number;
  cortes: number;
  taxaCorte: number;
  avarias: number;
  indiceAvaria: number;
  trocasSolicitadas: number;
  trocasAtendidas: number;
  taxaTrocasAtendidas: number;
};

export type DashboardExecutivoPayload = {
  kpis: KpisDashboardExecutivo;
  pedidosPorLoja: SerieBarra[];
  pedidosPorProduto: SerieBarra[];
  cortesPorLoja: SerieEmpilhada[];
  cortesPorProduto: SerieEmpilhada[];
  taxaCortePorLoja: SeriePercentual[];
  taxaCortePorProduto: SeriePercentual[];
  evolucaoDiariaPedidos: SerieDiaria[];
  evolucaoDiariaPedidosComparativo: SerieDiariaComparativa[];
  saidaPorOrigem: SerieBarra[];
  pedidosPorDiaSemana: SerieBarra[];
  estoquePorProduto: SerieBarra[];
  evolucaoDiariaAvarias: SerieDiaria[];
  evolucaoDiariaAvariasComparativo: SerieDiariaComparativa[];
  avariasPorLoja: SerieBarra[];
  avariasPorProduto: SerieBarra[];
  top5IndiceAvariaLoja: SeriePercentual[];
  top5IndiceAvariaProduto: SeriePercentual[];
  top3AvariaPromotor: SeriePercentual[];
  opcoes: {
    lojas: Array<{ id: number; label: string }>;
    produtos: Array<{ id: number; label: string }>;
    promotores: Array<{ id: number; label: string }>;
  };
};

export type ItemDashboardRaw = {
  pedidoSolicitado: number;
  pedidoAtendido: number | null;
  cortePedido: number | null;
  avaria: number;
  trocas: number;
  trocaAtendida: number | null;
  corteTroca: number | null;
  estoque: number;
  estoqueConferido: number | null;
  status: string;
  origemSaida: string | null;
  origem?: { nome: string } | null;
  produto: { id: number; descricao: string };
  pedido: {
    createdAt: Date;
    usuario: { id: number; nome: string };
    loja: { id: number; nome: string };
    regiao: { nome: string };
  };
};

export const DIAS_SEMANA = [
  { value: "", label: "Todos" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
] as const;

export function filtrosDashboardExecutivoIniciais(
  dataInicio?: string,
  dataFim?: string,
): FiltrosDashboardExecutivo {
  return {
    dataInicio: dataInicio ?? "",
    dataFim: dataFim ?? "",
    regiao: "todos",
    lojaId: "",
    produtoId: "",
    promotorId: "",
    diaSemana: "",
    compararRegioes: false,
  };
}

export type TemaRegiaoExecutivo = {
  accent: string;
  accentMuted: string;
  border: string;
  glow: string;
  chartPrimary: string;
  chartSecondary: string;
  gradientFrom: string;
};

export function temaRegiaoExecutivo(
  regiao: RegiaoDashboardExecutivo,
  compararRegioes: boolean,
): TemaRegiaoExecutivo {
  if (compararRegioes || regiao === "todos") {
    return {
      accent: "text-violet-400",
      accentMuted: "text-slate-300",
      border: "border-violet-500/30",
      glow: "shadow-violet-500/10",
      chartPrimary: "#f43f5e",
      chartSecondary: "#06b6d4",
      gradientFrom: "from-violet-500/20",
    };
  }

  if (regiao === "rio-branco") {
    return {
      accent: "text-rose-500",
      accentMuted: "text-rose-400/80",
      border: "border-rose-500/30",
      glow: "shadow-rose-500/15",
      chartPrimary: "#f43f5e",
      chartSecondary: "#fb7185",
      gradientFrom: "from-rose-500/20",
    };
  }

  return {
    accent: "text-cyan-500",
    accentMuted: "text-cyan-400/80",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/15",
    chartPrimary: "#06b6d4",
    chartSecondary: "#22d3ee",
    gradientFrom: "from-cyan-500/20",
  };
}

function obterDiaSemanaBrasil(date: Date, regiaoNome: string): number {
  const iso = extrairDataBrasil(date, regiaoNome);
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

function normalizarRegiaoChave(nome: string): "rio-branco" | "manaus" | "outro" {
  const lower = nome.toLowerCase();
  if (lower.includes("rio branco") || lower.includes("acre")) {
    return "rio-branco";
  }
  if (lower.includes("manaus")) {
    return "manaus";
  }
  return "outro";
}

function metricasItem(item: ItemDashboardRaw) {
  const cortePedido = item.cortePedido ?? 0;
  const corteTroca = item.corteTroca ?? 0;
  const estoque = item.estoqueConferido ?? item.estoque;
  const status = itemSemSolicitacaoExpedicao(item.pedidoSolicitado, item.trocas)
    ? "Aprovado"
    : normalizarStatusExpedicao(item.status);

  const pedidoAprovadoCalc = calcularPedidoAprovado(
    item.pedidoSolicitado,
    cortePedido,
    item.pedidoAtendido,
  );
  const trocaAtendidaCalc = calcularTrocaAtendida(
    item.trocas,
    corteTroca,
    item.trocaAtendida,
  );

  const { pedidoAprovado, trocaAtendida } = quantidadesAprovadasParaExibicao(
    status,
    pedidoAprovadoCalc,
    trocaAtendidaCalc,
  );

  return {
    cortePedido,
    corteTroca,
    estoque,
    pedidoAprovado,
    trocaAtendida,
    origem: item.origem?.nome ?? item.origemSaida ?? "Sem origem",
  };
}

function topN<T>(items: T[], n: number, sortFn: (a: T, b: T) => number): T[] {
  return [...items].sort(sortFn).slice(0, n);
}

export function agregarDashboardExecutivo(
  itens: ItemDashboardRaw[],
): DashboardExecutivoPayload {
  const lojasMap = new Map<number, string>();
  const produtosMap = new Map<number, string>();
  const promotoresMap = new Map<number, string>();

  const pedidosLoja = new Map<string, { sol: number; atd: number }>();
  const pedidosProduto = new Map<string, { sol: number; atd: number }>();
  const cortesLoja = new Map<string, { cortes: number; atd: number }>();
  const cortesProduto = new Map<string, { cortes: number; atd: number }>();
  const taxaCorteLoja = new Map<string, { cortes: number; sol: number }>();
  const taxaCorteProduto = new Map<string, { cortes: number; sol: number }>();
  const evolucaoPedidos = new Map<string, { sol: number; atd: number }>();
  const evolucaoPedidosRb = new Map<string, number>();
  const evolucaoPedidosMn = new Map<string, number>();
  const origemSaida = new Map<string, number>();
  const pedidosDiaSemana = new Map<string, number>();
  const estoqueProduto = new Map<string, number>();
  const evolucaoAvarias = new Map<string, number>();
  const evolucaoAvariasRb = new Map<string, number>();
  const evolucaoAvariasMn = new Map<string, number>();
  const avariasLoja = new Map<string, number>();
  const avariasProduto = new Map<string, number>();
  const indiceAvariaLoja = new Map<string, { avarias: number; base: number }>();
  const indiceAvariaProduto = new Map<string, { avarias: number; base: number }>();
  const avariaPromotor = new Map<string, { avarias: number; base: number }>();

  let pedidosSolicitados = 0;
  let pedidosAtendidos = 0;
  let cortes = 0;
  let avarias = 0;
  let baseAvaria = 0;
  let trocasSolicitadas = 0;
  let trocasAtendidas = 0;

  for (const item of itens) {
    const regiaoNome = item.pedido.regiao.nome;
    const data = extrairDataBrasil(item.pedido.createdAt, regiaoNome);
    const m = metricasItem(item);
    const loja = item.pedido.loja.nome;
    const produto = item.produto.descricao;
    const promotor = item.pedido.usuario.nome;
    const regiaoChave = normalizarRegiaoChave(regiaoNome);
    const diaSemana = DIAS_SEMANA.find(
      (d) => d.value === String(obterDiaSemanaBrasil(item.pedido.createdAt, regiaoNome)),
    )?.label ?? "—";

    lojasMap.set(item.pedido.loja.id, loja);
    produtosMap.set(item.produto.id, produto);
    promotoresMap.set(item.pedido.usuario.id, promotor);

    pedidosSolicitados += item.pedidoSolicitado;
    pedidosAtendidos += m.pedidoAprovado;
    cortes += m.cortePedido;
    avarias += item.avaria;
    baseAvaria += m.estoque + item.avaria;
    trocasSolicitadas += item.trocas;
    trocasAtendidas += m.trocaAtendida;

    const addBar = (
      map: Map<string, { sol: number; atd: number }>,
      key: string,
    ) => {
      const atual = map.get(key) ?? { sol: 0, atd: 0 };
      atual.sol += item.pedidoSolicitado;
      atual.atd += m.pedidoAprovado;
      map.set(key, atual);
    };

    addBar(pedidosLoja, loja);
    addBar(pedidosProduto, produto);

    const addCorte = (
      map: Map<string, { cortes: number; atd: number }>,
      key: string,
    ) => {
      const atual = map.get(key) ?? { cortes: 0, atd: 0 };
      atual.cortes += m.cortePedido;
      atual.atd += m.pedidoAprovado;
      map.set(key, atual);
    };

    addCorte(cortesLoja, loja);
    addCorte(cortesProduto, produto);

    const addTaxaCorte = (
      map: Map<string, { cortes: number; sol: number }>,
      key: string,
    ) => {
      const atual = map.get(key) ?? { cortes: 0, sol: 0 };
      atual.cortes += m.cortePedido;
      atual.sol += item.pedidoSolicitado;
      map.set(key, atual);
    };

    addTaxaCorte(taxaCorteLoja, loja);
    addTaxaCorte(taxaCorteProduto, produto);

    const evol = evolucaoPedidos.get(data) ?? { sol: 0, atd: 0 };
    evol.sol += item.pedidoSolicitado;
    evol.atd += m.pedidoAprovado;
    evolucaoPedidos.set(data, evol);

    if (regiaoChave === "rio-branco") {
      evolucaoPedidosRb.set(data, (evolucaoPedidosRb.get(data) ?? 0) + m.pedidoAprovado);
      evolucaoAvariasRb.set(data, (evolucaoAvariasRb.get(data) ?? 0) + item.avaria);
    } else if (regiaoChave === "manaus") {
      evolucaoPedidosMn.set(data, (evolucaoPedidosMn.get(data) ?? 0) + m.pedidoAprovado);
      evolucaoAvariasMn.set(data, (evolucaoAvariasMn.get(data) ?? 0) + item.avaria);
    }

    origemSaida.set(m.origem, (origemSaida.get(m.origem) ?? 0) + m.pedidoAprovado + m.trocaAtendida);
    pedidosDiaSemana.set(diaSemana, (pedidosDiaSemana.get(diaSemana) ?? 0) + item.pedidoSolicitado);
    estoqueProduto.set(produto, (estoqueProduto.get(produto) ?? 0) + m.estoque);
    evolucaoAvarias.set(data, (evolucaoAvarias.get(data) ?? 0) + item.avaria);
    avariasLoja.set(loja, (avariasLoja.get(loja) ?? 0) + item.avaria);
    avariasProduto.set(produto, (avariasProduto.get(produto) ?? 0) + item.avaria);

    const addIndice = (
      map: Map<string, { avarias: number; base: number }>,
      key: string,
    ) => {
      const atual = map.get(key) ?? { avarias: 0, base: 0 };
      atual.avarias += item.avaria;
      atual.base += m.estoque + item.avaria;
      map.set(key, atual);
    };

    addIndice(indiceAvariaLoja, loja);
    addIndice(indiceAvariaProduto, produto);
    addIndice(avariaPromotor, promotor);
  }

  const mapBar = (map: Map<string, { sol: number; atd: number }>): SerieBarra[] =>
    Array.from(map.entries())
      .map(([label, v]) => ({ label, valor: v.sol, valor2: v.atd }))
      .sort((a, b) => b.valor - a.valor);

  const mapEmpilhada = (
    map: Map<string, { cortes: number; atd: number }>,
  ): SerieEmpilhada[] =>
    Array.from(map.entries())
      .map(([label, v]) => ({ label, cortes: v.cortes, atendido: v.atd }))
      .sort((a, b) => b.cortes - a.cortes);

  const mapTaxa = (
    map: Map<string, { cortes: number; sol: number }>,
  ): SeriePercentual[] =>
    Array.from(map.entries())
      .map(([label, v]) => ({
        label,
        percentual: v.sol > 0 ? (v.cortes / v.sol) * 100 : 0,
      }))
      .sort((a, b) => b.percentual - a.percentual);

  const mapIndiceAvaria = (
    map: Map<string, { avarias: number; base: number }>,
  ): SeriePercentual[] =>
    Array.from(map.entries())
      .map(([label, v]) => ({
        label,
        percentual: v.base > 0 ? (v.avarias / v.base) * 100 : 0,
      }))
      .sort((a, b) => b.percentual - a.percentual);

  const datasOrdenadas = Array.from(evolucaoPedidos.keys()).sort();

  return {
    kpis: {
      pedidosSolicitados,
      pedidosAtendidos,
      cortes,
      taxaCorte: pedidosSolicitados > 0 ? (cortes / pedidosSolicitados) * 100 : 0,
      avarias,
      indiceAvaria: baseAvaria > 0 ? (avarias / baseAvaria) * 100 : 0,
      trocasSolicitadas,
      trocasAtendidas,
      taxaTrocasAtendidas:
        trocasSolicitadas > 0 ? (trocasAtendidas / trocasSolicitadas) * 100 : 0,
    },
    pedidosPorLoja: mapBar(pedidosLoja).slice(0, 12),
    pedidosPorProduto: mapBar(pedidosProduto).slice(0, 12),
    cortesPorLoja: mapEmpilhada(cortesLoja).slice(0, 10),
    cortesPorProduto: mapEmpilhada(cortesProduto).slice(0, 10),
    taxaCortePorLoja: mapTaxa(taxaCorteLoja).slice(0, 10),
    taxaCortePorProduto: mapTaxa(taxaCorteProduto).slice(0, 10),
    evolucaoDiariaPedidos: datasOrdenadas.map((data) => {
      const v = evolucaoPedidos.get(data)!;
      return { data, valor: v.sol, valor2: v.atd };
    }),
    evolucaoDiariaPedidosComparativo: datasOrdenadas.map((data) => ({
      data,
      rioBranco: evolucaoPedidosRb.get(data) ?? 0,
      manaus: evolucaoPedidosMn.get(data) ?? 0,
    })),
    saidaPorOrigem: Array.from(origemSaida.entries())
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor),
    pedidosPorDiaSemana: DIAS_SEMANA.filter((d) => d.value !== "")
      .map((d) => ({
        label: d.label.slice(0, 3),
        valor: pedidosDiaSemana.get(d.label) ?? 0,
      })),
    estoquePorProduto: Array.from(estoqueProduto.entries())
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12),
    evolucaoDiariaAvarias: datasOrdenadas.map((data) => ({
      data,
      valor: evolucaoAvarias.get(data) ?? 0,
    })),
    evolucaoDiariaAvariasComparativo: datasOrdenadas.map((data) => ({
      data,
      rioBranco: evolucaoAvariasRb.get(data) ?? 0,
      manaus: evolucaoAvariasMn.get(data) ?? 0,
    })),
    avariasPorLoja: Array.from(avariasLoja.entries())
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
    avariasPorProduto: Array.from(avariasProduto.entries())
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
    top5IndiceAvariaLoja: topN(mapIndiceAvaria(indiceAvariaLoja), 5, (a, b) => b.percentual - a.percentual),
    top5IndiceAvariaProduto: topN(
      mapIndiceAvaria(indiceAvariaProduto),
      5,
      (a, b) => b.percentual - a.percentual,
    ),
    top3AvariaPromotor: topN(mapIndiceAvaria(avariaPromotor), 3, (a, b) => b.percentual - a.percentual),
    opcoes: {
      lojas: Array.from(lojasMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
      produtos: Array.from(produtosMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
      promotores: Array.from(promotoresMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    },
  };
}

export function filtrarItensDashboard(
  itens: ItemDashboardRaw[],
  filtros: Pick<
    FiltrosDashboardExecutivo,
    "lojaId" | "produtoId" | "promotorId" | "diaSemana"
  >,
): ItemDashboardRaw[] {
  return itens.filter((item) => {
    if (filtros.lojaId && String(item.pedido.loja.id) !== filtros.lojaId) {
      return false;
    }

    if (filtros.produtoId && String(item.produto.id) !== filtros.produtoId) {
      return false;
    }

    if (filtros.promotorId && String(item.pedido.usuario.id) !== filtros.promotorId) {
      return false;
    }

    if (filtros.diaSemana) {
      const dia = obterDiaSemanaBrasil(
        item.pedido.createdAt,
        item.pedido.regiao.nome,
      );
      if (String(dia) !== filtros.diaSemana) {
        return false;
      }
    }

    return true;
  });
}
