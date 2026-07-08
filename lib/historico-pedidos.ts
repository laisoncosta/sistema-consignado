import {
  obterDataHojeBrasil,
  obterPrimeiroDiaMesBrasil,
} from "@/lib/data-brasil";
import { PRODUTOS_PEDIDO_MOCK } from "@/lib/pedido";
import { LOJAS_PROMOTOR_MOCK } from "@/lib/visita";

export type StatusHistoricoFiltro = "todos" | "aprovado" | "pendente" | "reprovado";
export type StatusHistoricoFiltroMobile =
  | "todos"
  | "aprovado"
  | "aprovado_parcialmente"
  | "reprovado";
export type StatusHistoricoExibicao = "Aprovado" | "Pendente" | "Reprovado";
export type StatusHistoricoExibicaoMobile =
  | StatusHistoricoExibicao
  | "Aprovado Parcialmente";
export type TipoPedidoHistorico = "Normal" | "Extra";

export function deveExibirItemPedidoExtra(
  tipoPedido: TipoPedidoHistorico | undefined | null,
  pedidoSolicitado: number,
): boolean {
  if (tipoPedido !== "Extra") {
    return true;
  }

  return pedidoSolicitado > 0;
}

export type LancamentoHistoricoRaw = {
  id: string;
  data: string;
  produtoId: string;
  produtoNome: string;
  lojaId: string;
  lojaRotulo: string;
  status: StatusHistoricoExibicao;
  tipoPedido?: TipoPedidoHistorico;
  estoque: number;
  qtdSolicitada: number;
  corte: number;
  avarias: number;
  trocasSolicitadas: number;
  corteTroca: number;
  qtdeTransf: number;
  bonificacao: number;
  motivo: string;
  pedidoId?: number;
  numeroAmigavel?: number;
  numeroAmigavelRotulo?: string;
  statusPedido?: string;
};

export type LancamentoHistoricoAgrupado = {
  chave: string;
  data: string;
  produtoNome: string;
  loja: string;
  status: StatusHistoricoExibicao;
  contagemEstoque: number;
  qtdSolicitada: number;
  corte: number;
  qtdAtendida: number;
  avarias: number;
  trocasSolicitadas: number;
  corteTroca: number;
  trocasAtendidas: number;
  pedidoExtraSolicitado: number;
  pedidoExtraAtendido: number;
  pedidoExtraAprovado: boolean;
  qtdeTransf: number;
  bonificacao: number;
  motivo: string;
  pedidoTotal: number;
  numeroAmigavelRotulo?: string;
  statusPedido?: string;
};

export type TotaisHistoricoAgrupado = {
  contagemEstoque: number;
  qtdSolicitada: number;
  corte: number;
  qtdAtendida: number;
  avarias: number;
  trocasSolicitadas: number;
  corteTroca: number;
  trocasAtendidas: number;
  pedidoExtraSolicitado: number;
  pedidoExtraAtendido: number;
  qtdeTransf: number;
  bonificacao: number;
  pedidoTotal: number;
};

export function obterPrimeiroDiaMesAtual(regiaoNome?: string | null): string {
  return obterPrimeiroDiaMesBrasil(regiaoNome);
}


export function obterDataHojeIso(regiaoNome?: string | null): string {
  return obterDataHojeBrasil(regiaoNome);
}

export function chaveProdutoDiaHistorico(item: LancamentoHistoricoRaw): string {
  return `${item.data}|${item.produtoId}|${item.lojaId}`;
}

function chaveConsolidacaoHistorico(item: LancamentoHistoricoRaw): string {
  const tipo = item.tipoPedido ?? "Normal";
  return `${item.data}|${item.lojaId}|${item.produtoId}|${tipo}`;
}

function pontuacaoItemHistorico(item: LancamentoHistoricoRaw): number {
  return (
    item.estoque +
    item.avarias +
    item.qtdSolicitada +
    item.trocasSolicitadas
  );
}

function extrairPedidoIdHistorico(item: LancamentoHistoricoRaw): number {
  const pedidoId = Number.parseInt(item.id.split("-")[0] ?? "0", 10);
  return Number.isFinite(pedidoId) ? pedidoId : 0;
}

function extrairItemIdHistorico(item: LancamentoHistoricoRaw): number {
  const partes = item.id.split("-");
  const itemId = Number.parseInt(partes[partes.length - 1] ?? "0", 10);
  return Number.isFinite(itemId) ? itemId : 0;
}

function escolherLancamentoHistoricoCanonico(
  atual: LancamentoHistoricoRaw,
  candidato: LancamentoHistoricoRaw,
): LancamentoHistoricoRaw {
  const pontuacaoAtual = pontuacaoItemHistorico(atual);
  const pontuacaoCandidato = pontuacaoItemHistorico(candidato);

  if (pontuacaoCandidato !== pontuacaoAtual) {
    return pontuacaoCandidato > pontuacaoAtual ? candidato : atual;
  }

  if (atual.status === "Pendente" && candidato.status !== "Pendente") {
    return candidato;
  }

  if (candidato.status === "Pendente" && atual.status !== "Pendente") {
    return atual;
  }

  const pedidoAtual = extrairPedidoIdHistorico(atual);
  const pedidoCandidato = extrairPedidoIdHistorico(candidato);

  if (pedidoCandidato !== pedidoAtual) {
    return pedidoCandidato > pedidoAtual ? candidato : atual;
  }

  return extrairItemIdHistorico(candidato) > extrairItemIdHistorico(atual)
    ? candidato
    : atual;
}

function mesclarLancamentoHistoricoCanonico(
  atual: LancamentoHistoricoRaw,
  candidato: LancamentoHistoricoRaw,
): LancamentoHistoricoRaw {
  const canonico = escolherLancamentoHistoricoCanonico(atual, candidato);
  const outro = canonico === atual ? candidato : atual;
  const motivo = [canonico.motivo, outro.motivo]
    .map((texto) => texto.trim())
    .filter(Boolean)
    .join(" | ");

  return {
    ...canonico,
    qtdeTransf: canonico.qtdeTransf + outro.qtdeTransf,
    bonificacao: canonico.bonificacao + outro.bonificacao,
    motivo,
  };
}

/** Remove duplicatas do mesmo produto/loja/dia/tipo — mesma regra da expedição. */
export function consolidarLancamentosHistorico(
  lancamentos: LancamentoHistoricoRaw[],
): LancamentoHistoricoRaw[] {
  const pedidos: LancamentoHistoricoRaw[] = [];
  const avulsos: LancamentoHistoricoRaw[] = [];

  for (const item of lancamentos) {
    if (item.id.startsWith("transf-")) {
      avulsos.push(item);
      continue;
    }

    pedidos.push(item);
  }

  const mapa = new Map<string, LancamentoHistoricoRaw>();

  for (const item of pedidos) {
    const chave = chaveConsolidacaoHistorico(item);
    const existente = mapa.get(chave);

    if (!existente) {
      mapa.set(chave, item);
      continue;
    }

    mapa.set(chave, mesclarLancamentoHistoricoCanonico(existente, item));
  }

  return [...mapa.values(), ...avulsos];
}

function statusCanonicoPorProdutoDia(
  lancamentos: LancamentoHistoricoRaw[],
): Map<string, StatusHistoricoExibicao> {
  const mapa = new Map<string, LancamentoHistoricoRaw>();

  for (const item of lancamentos) {
    if ((item.tipoPedido ?? "Normal") !== "Normal") {
      continue;
    }

    const chave = chaveProdutoDiaHistorico(item);
    const existente = mapa.get(chave);

    if (!existente) {
      mapa.set(chave, item);
      continue;
    }

    mapa.set(chave, escolherLancamentoHistoricoCanonico(existente, item));
  }

  return new Map(
    Array.from(mapa.entries()).map(([chave, item]) => [chave, item.status]),
  );
}

function itemPassaFiltrosBaseHistorico(
  item: LancamentoHistoricoRaw,
  filtros: {
    lojaId: string;
    produtoId?: string;
    dataInicial?: string;
    dataFinal?: string;
    dataMaxima?: string;
  },
): boolean {
  if (filtros.lojaId && item.lojaId !== filtros.lojaId) {
    return false;
  }

  if (filtros.produtoId && item.produtoId !== filtros.produtoId) {
    return false;
  }

  if (
    filtros.dataInicial &&
    filtros.dataFinal &&
    (item.data < filtros.dataInicial || item.data > filtros.dataFinal)
  ) {
    return false;
  }

  if (filtros.dataMaxima && item.data > filtros.dataMaxima) {
    return false;
  }

  return true;
}

function chavesProdutoPorStatusNormal(
  lancamentos: LancamentoHistoricoRaw[],
  status: Exclude<StatusHistoricoFiltro, "todos">,
): Set<string> {
  const statusCanonico = statusCanonicoPorProdutoDia(lancamentos);
  const chaves = new Set<string>();

  for (const [chave, statusItem] of statusCanonico) {
    if (status === "aprovado" && statusItem === "Aprovado") {
      chaves.add(chave);
    }

    if (status === "pendente" && statusItem === "Pendente") {
      chaves.add(chave);
    }

    if (status === "reprovado" && statusItem === "Reprovado") {
      chaves.add(chave);
    }
  }

  return chaves;
}

/** Inclui pedido extra no grupo quando o status do pedido normal atende ao filtro. */
export function filtrarLancamentosHistoricoMesclado(
  lancamentos: LancamentoHistoricoRaw[],
  filtros: {
    lojaId: string;
    dataInicial: string;
    dataFinal: string;
    status: StatusHistoricoFiltro;
    produtoId?: string;
  },
): LancamentoHistoricoRaw[] {
  const base = lancamentos.filter((item) =>
    itemPassaFiltrosBaseHistorico(item, {
      lojaId: filtros.lojaId,
      produtoId: filtros.produtoId,
      dataInicial: filtros.dataInicial,
      dataFinal: filtros.dataFinal,
    }),
  );

  if (filtros.status === "todos") {
    return base;
  }

  const chavesIncluidas = chavesProdutoPorStatusNormal(base, filtros.status);

  return base.filter((item) =>
    chavesIncluidas.has(chaveProdutoDiaHistorico(item)),
  );
}

/** Pendentes agrupados: status considera apenas o pedido normal do produto. */
export function filtrarPedidosPendentesHistoricoMesclado(
  lancamentos: LancamentoHistoricoRaw[],
  filtros: {
    lojaId: string;
    produtoId?: string;
    dataMaxima?: string;
  },
): LancamentoHistoricoRaw[] {
  const base = lancamentos.filter((item) =>
    itemPassaFiltrosBaseHistorico(item, {
      lojaId: filtros.lojaId,
      produtoId: filtros.produtoId,
      dataMaxima: filtros.dataMaxima,
    }),
  );

  const chavesPendentes = chavesProdutoPorStatusNormal(base, "pendente");

  return base.filter((item) =>
    chavesPendentes.has(chaveProdutoDiaHistorico(item)),
  );
}

export function normalizarStatusPedido(status: string): StatusHistoricoExibicao {
  const upper = status.toUpperCase();

  if (upper.includes("REPROV")) {
    return "Reprovado";
  }

  if (upper.includes("APROV") && !upper.includes("AGUARDANDO")) {
    return "Aprovado";
  }

  return "Pendente";
}

export function statusExibicaoMobileAtendeFiltro(
  linha: LancamentoHistoricoAgrupado,
  status: StatusHistoricoFiltroMobile,
): boolean {
  const exibicao = resolverStatusExibicaoMobile(linha);

  if (status === "todos") {
    return exibicao !== "Pendente";
  }

  if (status === "aprovado") {
    return exibicao === "Aprovado";
  }

  if (status === "aprovado_parcialmente") {
    return exibicao === "Aprovado Parcialmente";
  }

  return exibicao === "Reprovado";
}

export function linhaHistoricoPendenteMobile(
  linha: LancamentoHistoricoAgrupado,
): boolean {
  return resolverStatusExibicaoMobile(linha) === "Pendente";
}

export function filtrarLancamentosHistorico(
  lancamentos: LancamentoHistoricoRaw[],
  filtros: {
    lojaId: string;
    dataInicial: string;
    dataFinal: string;
    status: StatusHistoricoFiltro;
    produtoId?: string;
  },
): LancamentoHistoricoRaw[] {
  return lancamentos.filter((item) => {
    if (filtros.lojaId && item.lojaId !== filtros.lojaId) {
      return false;
    }

    if (filtros.produtoId && item.produtoId !== filtros.produtoId) {
      return false;
    }

    if (item.data < filtros.dataInicial || item.data > filtros.dataFinal) {
      return false;
    }

    if (filtros.status === "aprovado" && item.status !== "Aprovado") {
      return false;
    }

    if (filtros.status === "pendente" && item.status !== "Pendente") {
      return false;
    }

    if (filtros.status === "reprovado" && item.status !== "Reprovado") {
      return false;
    }

    return true;
  });
}

/** Pendentes sem filtro de período — inclui dias anteriores ainda não aprovados. */
export function filtrarPedidosPendentesHistorico(
  lancamentos: LancamentoHistoricoRaw[],
  filtros: {
    lojaId: string;
    produtoId?: string;
    dataMaxima?: string;
  },
): LancamentoHistoricoRaw[] {
  return lancamentos.filter((item) => {
    if (item.status !== "Pendente") {
      return false;
    }

    if (filtros.lojaId && item.lojaId !== filtros.lojaId) {
      return false;
    }

    if (filtros.produtoId && item.produtoId !== filtros.produtoId) {
      return false;
    }

    if (filtros.dataMaxima && item.data > filtros.dataMaxima) {
      return false;
    }

    return true;
  });
}

export function resolverStatusExibicaoMobile(
  linha: LancamentoHistoricoAgrupado,
): StatusHistoricoExibicaoMobile {
  if (linha.status === "Aprovado") {
    return "Aprovado";
  }

  if (linha.status === "Reprovado") {
    const temAvulsoAprovado = linha.qtdeTransf > 0 || linha.bonificacao > 0;

    if (linha.pedidoExtraAprovado || temAvulsoAprovado) {
      return "Aprovado Parcialmente";
    }

    return "Reprovado";
  }

  return "Pendente";
}

export function calcularPedidoTotalHistorico(linha: {
  qtdAtendida: number;
  trocasAtendidas: number;
  pedidoExtraAtendido?: number;
  qtdeTransf: number;
  bonificacao: number;
}): number {
  return (
    linha.qtdAtendida +
    linha.trocasAtendidas +
    (linha.pedidoExtraAtendido ?? 0) +
    linha.qtdeTransf +
    linha.bonificacao
  );
}

function priorizarStatusHistorico(
  atual: StatusHistoricoExibicao,
  novo: StatusHistoricoExibicao,
): StatusHistoricoExibicao {
  if (atual === "Pendente" || novo === "Pendente") {
    return "Pendente";
  }

  if (atual === "Reprovado" || novo === "Reprovado") {
    return "Reprovado";
  }

  return "Aprovado";
}

function recalcularPedidoTotalAgrupado(
  linha: LancamentoHistoricoAgrupado,
): number {
  return calcularPedidoTotalHistorico({
    qtdAtendida: linha.qtdAtendida,
    trocasAtendidas: linha.trocasAtendidas,
    pedidoExtraAtendido: linha.pedidoExtraAtendido,
    qtdeTransf: linha.qtdeTransf,
    bonificacao: linha.bonificacao,
  });
}

function criarLinhaAgrupadaHistorico(
  item: LancamentoHistoricoRaw,
  mesclarPedidoExtra: boolean,
): LancamentoHistoricoAgrupado {
  const isExtra = (item.tipoPedido ?? "Normal") === "Extra";
  const qtdAtendida = item.qtdSolicitada - item.corte;
  const trocasAtendidas = item.trocasSolicitadas - item.corteTroca;
  const extraAprovado = isExtra && item.status === "Aprovado";
  const pedidoExtraSolicitado =
    mesclarPedidoExtra && isExtra ? item.qtdSolicitada : 0;
  const pedidoExtraAtendido =
    mesclarPedidoExtra && extraAprovado ? qtdAtendida : 0;
  const pedidoExtraAprovado = mesclarPedidoExtra && extraAprovado;

  const linha: LancamentoHistoricoAgrupado = {
    chave: "",
    data: item.data,
    produtoNome: item.produtoNome,
    loja: item.lojaRotulo,
    status:
      mesclarPedidoExtra && isExtra ? "Pendente" : item.status,
    contagemEstoque: mesclarPedidoExtra && isExtra ? 0 : item.estoque,
    qtdSolicitada: mesclarPedidoExtra && isExtra ? 0 : item.qtdSolicitada,
    corte: mesclarPedidoExtra && isExtra ? 0 : item.corte,
    qtdAtendida: mesclarPedidoExtra && isExtra ? 0 : qtdAtendida,
    avarias: mesclarPedidoExtra && isExtra ? 0 : item.avarias,
    trocasSolicitadas: mesclarPedidoExtra && isExtra ? 0 : item.trocasSolicitadas,
    corteTroca: mesclarPedidoExtra && isExtra ? 0 : item.corteTroca,
    trocasAtendidas: mesclarPedidoExtra && isExtra ? 0 : trocasAtendidas,
    pedidoExtraSolicitado,
    pedidoExtraAtendido,
    pedidoExtraAprovado,
    qtdeTransf: item.qtdeTransf,
    bonificacao: item.bonificacao,
    motivo: item.motivo,
    pedidoTotal: 0,
    numeroAmigavelRotulo: item.numeroAmigavelRotulo,
    statusPedido: item.statusPedido,
  };

  linha.pedidoTotal = recalcularPedidoTotalAgrupado(linha);
  return linha;
}

function substituirCamposNormalAgrupado(
  existente: LancamentoHistoricoAgrupado,
  item: LancamentoHistoricoRaw,
): void {
  const qtdAtendida = item.qtdSolicitada - item.corte;
  const trocasAtendidas = item.trocasSolicitadas - item.corteTroca;

  existente.contagemEstoque = item.estoque;
  existente.qtdSolicitada = item.qtdSolicitada;
  existente.corte = item.corte;
  existente.qtdAtendida = qtdAtendida;
  existente.avarias = item.avarias;
  existente.trocasSolicitadas = item.trocasSolicitadas;
  existente.corteTroca = item.corteTroca;
  existente.trocasAtendidas = trocasAtendidas;
  existente.status = item.status;
}

function acumularItemHistoricoAgrupado(
  existente: LancamentoHistoricoAgrupado,
  item: LancamentoHistoricoRaw,
  mesclarPedidoExtra: boolean,
): void {
  const isExtra = (item.tipoPedido ?? "Normal") === "Extra";

  if (mesclarPedidoExtra && isExtra) {
    existente.pedidoExtraSolicitado += item.qtdSolicitada;
    if (item.status === "Aprovado") {
      existente.pedidoExtraAprovado = true;
      existente.pedidoExtraAtendido += item.qtdSolicitada - item.corte;
    }
  } else if (mesclarPedidoExtra) {
    const novaPontuacao = pontuacaoItemHistorico(item);
    const pontuacaoAtual =
      existente.contagemEstoque +
      existente.avarias +
      existente.qtdSolicitada +
      existente.trocasSolicitadas;

    const deveSubstituir =
      novaPontuacao > pontuacaoAtual ||
      (novaPontuacao === pontuacaoAtual &&
        existente.status === "Pendente" &&
        item.status !== "Pendente");

    if (deveSubstituir) {
      substituirCamposNormalAgrupado(existente, item);
    }
  } else {
    existente.status = priorizarStatusHistorico(existente.status, item.status);
    existente.contagemEstoque += item.estoque;
    existente.qtdSolicitada += item.qtdSolicitada;
    existente.corte += item.corte;
    existente.avarias += item.avarias;
    existente.trocasSolicitadas += item.trocasSolicitadas;
    existente.corteTroca += item.corteTroca;
    existente.qtdAtendida = existente.qtdSolicitada - existente.corte;
    existente.trocasAtendidas =
      existente.trocasSolicitadas - existente.corteTroca;
  }

  existente.qtdeTransf += item.qtdeTransf;
  existente.bonificacao += item.bonificacao;

  if (item.motivo.trim()) {
    existente.motivo = existente.motivo
      ? `${existente.motivo} | ${item.motivo.trim()}`
      : item.motivo.trim();
  }

  existente.pedidoTotal = recalcularPedidoTotalAgrupado(existente);
}

export function agruparHistoricoPedidos(
  lancamentos: LancamentoHistoricoRaw[],
  opcoes?: { mesclarPedidoExtra?: boolean },
): LancamentoHistoricoAgrupado[] {
  const mesclarPedidoExtra = opcoes?.mesclarPedidoExtra === true;
  const mapa = new Map<string, LancamentoHistoricoAgrupado>();

  for (const item of lancamentos) {
    const chave = mesclarPedidoExtra
      ? `${item.data}|${item.produtoId}|${item.lojaId}`
      : `${item.data}|${item.produtoId}|${item.lojaId}|${item.status}`;
    const existente = mapa.get(chave);

    if (!existente) {
      const linha = criarLinhaAgrupadaHistorico(item, mesclarPedidoExtra);
      linha.chave = chave;
      mapa.set(chave, linha);
      continue;
    }

    acumularItemHistoricoAgrupado(existente, item, mesclarPedidoExtra);
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const porData = b.data.localeCompare(a.data);
    if (porData !== 0) {
      return porData;
    }

    return a.produtoNome.localeCompare(b.produtoNome, "pt-BR");
  });
}

export function calcularTotaisHistorico(
  linhas: LancamentoHistoricoAgrupado[],
): TotaisHistoricoAgrupado {
  return linhas.reduce(
    (acc, linha) => ({
      contagemEstoque: acc.contagemEstoque + linha.contagemEstoque,
      qtdSolicitada: acc.qtdSolicitada + linha.qtdSolicitada,
      corte: acc.corte + linha.corte,
      qtdAtendida: acc.qtdAtendida + linha.qtdAtendida,
      avarias: acc.avarias + linha.avarias,
      trocasSolicitadas: acc.trocasSolicitadas + linha.trocasSolicitadas,
      corteTroca: acc.corteTroca + linha.corteTroca,
      trocasAtendidas: acc.trocasAtendidas + linha.trocasAtendidas,
      pedidoExtraSolicitado: acc.pedidoExtraSolicitado + linha.pedidoExtraSolicitado,
      pedidoExtraAtendido: acc.pedidoExtraAtendido + linha.pedidoExtraAtendido,
      qtdeTransf: acc.qtdeTransf + linha.qtdeTransf,
      bonificacao: acc.bonificacao + linha.bonificacao,
      pedidoTotal: acc.pedidoTotal + linha.pedidoTotal,
    }),
    {
      contagemEstoque: 0,
      qtdSolicitada: 0,
      corte: 0,
      qtdAtendida: 0,
      avarias: 0,
      trocasSolicitadas: 0,
      corteTroca: 0,
      trocasAtendidas: 0,
      pedidoExtraSolicitado: 0,
      pedidoExtraAtendido: 0,
      qtdeTransf: 0,
      bonificacao: 0,
      pedidoTotal: 0,
    },
  );
}

function criarMockHistorico(): LancamentoHistoricoRaw[] {
  const loja1 = LOJAS_PROMOTOR_MOCK[0];
  const loja2 = LOJAS_PROMOTOR_MOCK[1];
  const agriao = PRODUTOS_PEDIDO_MOCK[0];
  const alface = PRODUTOS_PEDIDO_MOCK[1];
  const rucula = PRODUTOS_PEDIDO_MOCK[2];
  const mes = obterDataHojeIso().slice(0, 7);

  return [
    {
      id: "mock-1",
      data: `${mes}-02`,
      produtoId: agriao.id,
      produtoNome: agriao.nome,
      lojaId: loja1.id,
      lojaRotulo: loja1.rotulo,
      status: "Aprovado",
      tipoPedido: "Normal",
      estoque: 12,
      qtdSolicitada: 20,
      corte: 2,
      avarias: 1,
      trocasSolicitadas: 3,
      corteTroca: 0,
      qtdeTransf: 0,
      bonificacao: 0,
      motivo: "",
    },
    {
      id: "mock-2",
      data: `${mes}-04`,
      produtoId: agriao.id,
      produtoNome: agriao.nome,
      lojaId: loja1.id,
      lojaRotulo: loja1.rotulo,
      status: "Aprovado",
      tipoPedido: "Normal",
      estoque: 8,
      qtdSolicitada: 15,
      corte: 1,
      avarias: 0,
      trocasSolicitadas: 2,
      corteTroca: 1,
      qtdeTransf: 0,
      bonificacao: 0,
      motivo: "",
    },
    {
      id: "mock-3",
      data: `${mes}-03`,
      produtoId: alface.id,
      produtoNome: alface.nome,
      lojaId: loja2.id,
      lojaRotulo: loja2.rotulo,
      status: "Pendente",
      tipoPedido: "Normal",
      estoque: 10,
      qtdSolicitada: 18,
      corte: 0,
      avarias: 2,
      trocasSolicitadas: 1,
      corteTroca: 0,
      qtdeTransf: 0,
      bonificacao: 0,
      motivo: "",
    },
    {
      id: "mock-4",
      data: `${mes}-05`,
      produtoId: rucula.id,
      produtoNome: rucula.nome,
      lojaId: loja1.id,
      lojaRotulo: loja1.rotulo,
      status: "Pendente",
      tipoPedido: "Normal",
      estoque: 6,
      qtdSolicitada: 12,
      corte: 3,
      avarias: 1,
      trocasSolicitadas: 4,
      corteTroca: 2,
      qtdeTransf: 0,
      bonificacao: 0,
      motivo: "",
    },
  ];
}

export const HISTORICO_PEDIDOS_MOCK = criarMockHistorico();
