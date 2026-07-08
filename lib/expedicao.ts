import type { FiltroRegiaoScope } from "@/lib/regiao-scope";
import { ROLES, isGestaoRole, type UserRole } from "@/lib/rbac";
import {
  formatarDataBrasil,
  obterDataHojeBrasil,
  obterPrimeiroDiaMesBrasil,
} from "@/lib/data-brasil";

export type StatusExpedicaoFiltro =
  | "todos"
  | "aprovado"
  | "pendente"
  | "reprovado";
export type TipoPedidoFiltro = "todos" | "normal" | "extra" | "avulsa";
export type TipoPedidoExibicao = "Normal" | "Extra";
export type StatusExpedicaoExibicao = "Pendente" | "Aprovado" | "Reprovado";

export type FiltrosExpedicao = {
  dataInicio: string;
  dataFim: string;
  regiao: FiltroRegiaoScope;
  promotorId: string;
  lojaId: string;
  produtoId: string;
  origemId: string;
  tipoPedido: TipoPedidoFiltro;
  status: StatusExpedicaoFiltro;
};

export type LancamentoExpedicao = {
  id: string;
  tipo: "pedido" | "avulso";
  itemPedidoId: number | null;
  transferenciaId: number | null;
  codProduto: string;
  produto: string;
  codLoja: string;
  loja: string;
  estoque: number;
  avarias: number;
  pedidoSolicitado: number;
  cortePedido: number;
  pedidoAprovado: number;
  trocaSolicitada: number;
  trocaAtendida: number;
  bonificacao: number;
  dataLancamento: string;
  status: StatusExpedicaoExibicao;
  origem: string;
  origemId: number | null;
  avulso: boolean;
  tipoPedido: TipoPedidoExibicao | null;
  promotorNome: string;
  promotorPerfil: string;
  regiao: string;
  pedidoId: number | null;
  numeroAmigavel: number | null;
  numeroAmigavelRotulo: string | null;
  lojaId: number | null;
  produtoId: number | null;
  motivoAvulso: string | null;
};

export type TotaisExpedicao = {
  estoque: number;
  avarias: number;
  pedidoSolicitado: number;
  cortePedido: number;
  pedidoAprovado: number;
  trocaSolicitada: number;
  trocaAtendida: number;
};

export type OpcaoFiltroExpedicao = {
  id: number;
  label: string;
};

export type OpcaoFiltroDinamico = {
  value: string;
  label: string;
};

export type OpcoesFiltrosExpedicaoDinamicas = {
  promotores: OpcaoFiltroDinamico[];
  lojas: OpcaoFiltroDinamico[];
  produtos: OpcaoFiltroDinamico[];
  origens: OpcaoFiltroDinamico[];
  tiposPedido: OpcaoFiltroDinamico[];
};

export type LogExpedicaoItem = {
  id: number;
  acao: string;
  detalhes: string | null;
  usuarioNome: string;
  createdAt: string;
};

export type ItemPedidoExpedicaoDetalhe = {
  itemPedidoId: number;
  pedidoId: number;
  promotorNome: string;
  lojaNome: string;
  produtoNome: string;
  dataPedido: string;
  estoque: number;
  pedidoSolicitado: number;
  cortePedido: number;
  pedidoAprovado: number;
  trocaSolicitada: number;
  corteTroca: number;
  trocaAtendida: number;
  bonificacao: number;
  origemId: number | null;
  origemSaida: string | null;
  status: StatusExpedicaoExibicao;
  logs: LogExpedicaoItem[];
};

export function obterPrimeiroDiaMesAtual(regiaoNome?: string | null): string {
  return obterPrimeiroDiaMesBrasil(regiaoNome);
}

export function obterDataHojeIso(regiaoNome?: string | null): string {
  return obterDataHojeBrasil(regiaoNome);
}

export function filtrosExpedicaoIniciais(regiaoNome?: string | null): FiltrosExpedicao {
  const hoje = obterDataHojeBrasil(regiaoNome);

  return {
    dataInicio: hoje,
    dataFim: hoje,
    regiao: "todos",
    promotorId: "",
    lojaId: "",
    produtoId: "",
    origemId: "",
    tipoPedido: "todos",
    status: "todos",
  };
}

export function chaveOrigemExpedicao(linha: LancamentoExpedicao): string {
  if (linha.origemId != null) {
    return String(linha.origemId);
  }

  return linha.origem.trim();
}

export function linhaPassaFiltroPromotorExpedicao(
  linha: LancamentoExpedicao,
  promotorFiltro: string,
): boolean {
  if (!promotorFiltro) {
    return true;
  }

  if (linha.avulso) {
    return true;
  }

  return linha.promotorNome === promotorFiltro;
}

export function filtrarLancamentosExpedicao(
  lancamentos: LancamentoExpedicao[],
  filtros: FiltrosExpedicao,
): LancamentoExpedicao[] {
  return lancamentos.filter((linha) => {
    if (!linhaPassaFiltroPromotorExpedicao(linha, filtros.promotorId)) {
      return false;
    }

    if (filtros.lojaId && linha.codLoja !== filtros.lojaId) {
      return false;
    }

    if (filtros.produtoId && linha.codProduto !== filtros.produtoId) {
      return false;
    }

    if (filtros.origemId && chaveOrigemExpedicao(linha) !== filtros.origemId) {
      return false;
    }

    if (filtros.status === "aprovado" && linha.status !== "Aprovado") {
      return false;
    }

    if (filtros.status === "pendente" && linha.status !== "Pendente") {
      return false;
    }

    if (filtros.status === "reprovado" && linha.status !== "Reprovado") {
      return false;
    }

    if (filtros.tipoPedido === "normal") {
      return !linha.avulso && linha.tipoPedido === "Normal";
    }

    if (filtros.tipoPedido === "extra") {
      return !linha.avulso && linha.tipoPedido === "Extra";
    }

    if (filtros.tipoPedido === "avulsa") {
      return linha.avulso;
    }

    return true;
  });
}

export function construirOpcoesFiltrosExpedicao(
  lancamentos: LancamentoExpedicao[],
): OpcoesFiltrosExpedicaoDinamicas {
  const promotores = Array.from(
    new Set(
      lancamentos
        .map((linha) => linha.promotorNome.trim())
        .filter((nome) => nome && nome !== "—"),
    ),
  )
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ value: nome, label: nome }));

  const lojasMap = new Map<string, string>();
  const produtosMap = new Map<string, string>();
  const origensMap = new Map<string, string>();

  for (const linha of lancamentos) {
    if (linha.codLoja && linha.loja) {
      lojasMap.set(linha.codLoja, linha.loja);
    }

    if (linha.codProduto && linha.produto) {
      produtosMap.set(linha.codProduto, linha.produto);
    }

    const origemChave = chaveOrigemExpedicao(linha);
    if (origemChave && linha.origem) {
      origensMap.set(origemChave, linha.origem);
    }
  }

  const lojas = Array.from(lojasMap.entries())
    .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
    .map(([value, label]) => ({ value, label }));

  const produtos = Array.from(produtosMap.entries())
    .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
    .map(([value, label]) => ({ value, label }));

  const origens = Array.from(origensMap.entries())
    .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
    .map(([value, label]) => ({ value, label }));

  const tiposPedido: OpcaoFiltroDinamico[] = [];

  if (lancamentos.some((linha) => !linha.avulso && linha.tipoPedido === "Normal")) {
    tiposPedido.push({ value: "normal", label: "Pedido Normal" });
  }

  if (lancamentos.some((linha) => !linha.avulso && linha.tipoPedido === "Extra")) {
    tiposPedido.push({ value: "extra", label: "Pedido Extra" });
  }

  if (lancamentos.some((linha) => linha.avulso)) {
    tiposPedido.push({ value: "avulsa", label: "Transf Avulsa" });
  }

  return {
    promotores,
    lojas,
    produtos,
    origens,
    tiposPedido,
  };
}

export function rotuloTipoPedidoExpedicao(
  linha: LancamentoExpedicao,
): string {
  if (linha.avulso) {
    return "Transf Avulsa";
  }

  return linha.tipoPedido === "Extra" ? "Pedido Extra" : "Pedido Normal";
}

export function isStatusAprovadoExpedicao(status: string): boolean {
  const upper = status.toUpperCase();

  if (upper.includes("REPROV") || upper.includes("AGUARDANDO")) {
    return false;
  }

  return upper.includes("APROV");
}

export function isStatusReprovadoExpedicao(status: string): boolean {
  return status.toUpperCase().includes("REPROV");
}

export function isStatusPendenteExpedicao(status: string): boolean {
  return (
    !isStatusAprovadoExpedicao(status) && !isStatusReprovadoExpedicao(status)
  );
}

export function itemPedidoFinalizadoExpedicao(status: string): boolean {
  return (
    isStatusAprovadoExpedicao(status) || isStatusReprovadoExpedicao(status)
  );
}

export function podeExpedicaoAlterarItemPorData(
  role: UserRole,
  dataPedidoIso: string,
  regiaoNome?: string | null,
): boolean {
  if (isGestaoRole(role)) {
    return true;
  }

  if (role !== ROLES.EXPEDICAO) {
    return false;
  }

  return dataPedidoIso === obterDataHojeBrasil(regiaoNome);
}

export function filtroPrismaStatusItemExpedicao(
  status: StatusExpedicaoFiltro,
): Record<string, unknown> {
  if (status === "aprovado") {
    return { status: { contains: "APROV", mode: "insensitive" as const } };
  }

  if (status === "reprovado") {
    return { status: { contains: "REPROV", mode: "insensitive" as const } };
  }

  if (status === "pendente") {
    return {
      AND: [
        { NOT: { status: { contains: "APROV", mode: "insensitive" as const } } },
        { NOT: { status: { contains: "REPROV", mode: "insensitive" as const } } },
      ],
    };
  }

  return {};
}

export function calcularStatusPedidoExpedicao(
  statusItens: string[],
): "APROVADO" | "REPROVADO" | "AGUARDANDO_APROVACAO" {
  if (statusItens.length === 0) {
    return "AGUARDANDO_APROVACAO";
  }

  // Enquanto qualquer produto estiver pendente, o pedido pai permanece aguardando.
  if (statusItens.some(isStatusPendenteExpedicao)) {
    return "AGUARDANDO_APROVACAO";
  }

  // Só fica APROVADO quando todos os produtos foram aprovados individualmente.
  if (statusItens.every(isStatusAprovadoExpedicao)) {
    return "APROVADO";
  }

  if (statusItens.every(isStatusReprovadoExpedicao)) {
    return "REPROVADO";
  }

  return "AGUARDANDO_APROVACAO";
}

export type AlertaCancelamentoPedido = "nenhum" | "parcial" | "critico";

/** Classifica o alerta de cancelamento conforme progresso de aprovação dos itens. */
export function classificarAlertaCancelamentoPedido(
  statusItens: string[],
): AlertaCancelamentoPedido {
  if (statusItens.length === 0) {
    return "nenhum";
  }

  const aprovados = statusItens.filter(isStatusAprovadoExpedicao).length;

  if (aprovados === 0) {
    return "nenhum";
  }

  if (aprovados === statusItens.length) {
    return "critico";
  }

  return "parcial";
}

export function normalizarStatusExpedicao(status: string): StatusExpedicaoExibicao {
  if (isStatusReprovadoExpedicao(status)) {
    return "Reprovado";
  }

  if (isStatusAprovadoExpedicao(status)) {
    return "Aprovado";
  }

  return "Pendente";
}

export function itemSemSolicitacaoExpedicao(
  pedidoSolicitado: number,
  trocaSolicitada: number,
): boolean {
  return pedidoSolicitado <= 0 && trocaSolicitada <= 0;
}

/** Respeita Pendente/Reprovado do banco mesmo sem qtde de pedido/troca. */
export function resolverStatusItemExpedicao(
  statusBruto: string,
  pedidoSolicitado: number,
  trocaSolicitada: number,
): StatusExpedicaoExibicao {
  const statusDb = normalizarStatusExpedicao(statusBruto);

  if (statusDb === "Pendente" || statusDb === "Reprovado") {
    return statusDb;
  }

  if (itemSemSolicitacaoExpedicao(pedidoSolicitado, trocaSolicitada)) {
    return "Aprovado";
  }

  return statusDb;
}

export function origemObrigatoriaExpedicao(
  pedidoSolicitado: number,
  trocaSolicitada: number,
  cortePedido: number,
  corteTroca: number,
): boolean {
  const pedidoAprovado = Math.max(0, pedidoSolicitado - cortePedido);
  const trocaAtendida = Math.max(0, trocaSolicitada - corteTroca);

  return pedidoAprovado > 0 || trocaAtendida > 0;
}

export function calcularPedidoAprovado(
  pedidoSolicitado: number,
  cortePedido: number,
  pedidoAtendido?: number | null,
): number {
  if (pedidoAtendido != null && pedidoAtendido >= 0) {
    return pedidoAtendido;
  }
  return Math.max(0, pedidoSolicitado - cortePedido);
}

export function calcularTrocaAtendida(
  trocaSolicitada: number,
  corteTroca: number,
  trocaAtendida?: number | null,
): number {
  if (trocaAtendida != null && trocaAtendida >= 0) {
    return trocaAtendida;
  }
  return Math.max(0, trocaSolicitada - corteTroca);
}

export function quantidadesAprovadasParaExibicao(
  status: StatusExpedicaoExibicao,
  pedidoAprovado: number,
  trocaAtendida: number,
): { pedidoAprovado: number; trocaAtendida: number } {
  if (status === "Pendente" || status === "Reprovado") {
    return { pedidoAprovado: 0, trocaAtendida: 0 };
  }

  return { pedidoAprovado, trocaAtendida };
}

export function calcularPedidoCiss(
  pedidoAprovado: number,
  trocaAtendida: number,
  bonificacao: number,
): number {
  return Math.max(0, pedidoAprovado - trocaAtendida - bonificacao);
}

export function calcularPedidoTotal(
  pedidoAprovado: number,
  trocaAtendida: number,
  bonificacao: number,
): number {
  return pedidoAprovado + trocaAtendida + bonificacao;
}

export function calcularTotaisExpedicao(
  linhas: LancamentoExpedicao[],
): TotaisExpedicao {
  return linhas.reduce(
    (acc, linha) => ({
      estoque: acc.estoque + linha.estoque,
      avarias: acc.avarias + linha.avarias,
      pedidoSolicitado: acc.pedidoSolicitado + linha.pedidoSolicitado,
      cortePedido: acc.cortePedido + linha.cortePedido,
      pedidoAprovado: acc.pedidoAprovado + linha.pedidoAprovado,
      trocaSolicitada: acc.trocaSolicitada + linha.trocaSolicitada,
      trocaAtendida: acc.trocaAtendida + linha.trocaAtendida,
    }),
    {
      estoque: 0,
      avarias: 0,
      pedidoSolicitado: 0,
      cortePedido: 0,
      pedidoAprovado: 0,
      trocaSolicitada: 0,
      trocaAtendida: 0,
    },
  );
}

export function formatarDataBr(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return formatarDataBrasil(iso);
}

export function formatarDataHoraBr(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
