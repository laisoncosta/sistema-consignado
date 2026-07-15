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
  status: OpcaoFiltroDinamico[];
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
  /** Extra | Normal (principal) */
  tipoPedido: "Normal" | "Extra";
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

const ROTULO_STATUS_FILTRO: Record<
  Exclude<StatusExpedicaoFiltro, "todos">,
  string
> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

function valorFiltroStatusExpedicao(
  status: StatusExpedicaoExibicao,
): Exclude<StatusExpedicaoFiltro, "todos"> {
  if (status === "Aprovado") {
    return "aprovado";
  }

  if (status === "Reprovado") {
    return "reprovado";
  }

  return "pendente";
}

function coletarOpcoesMapa(
  linhas: LancamentoExpedicao[],
  extrair: (linha: LancamentoExpedicao) => [string, string] | null,
): OpcaoFiltroDinamico[] {
  const mapa = new Map<string, string>();

  for (const linha of linhas) {
    const entrada = extrair(linha);
    if (entrada) {
      mapa.set(entrada[0], entrada[1]);
    }
  }

  return Array.from(mapa.entries())
    .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
    .map(([value, label]) => ({ value, label }));
}

export function construirOpcoesFiltrosExpedicao(
  lancamentos: LancamentoExpedicao[],
  filtros?: FiltrosExpedicao,
): OpcoesFiltrosExpedicaoDinamicas {
  const filtrosAtivos = filtros ?? filtrosExpedicaoIniciais();

  const promotores = Array.from(
    new Set(
      lancamentos
        .map((linha) => linha.promotorNome.trim())
        .filter((nome) => nome && nome !== "—"),
    ),
  )
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ value: nome, label: nome }));

  // Lojas do promotor selecionado (pedidos dele no período); sem promotor = todas.
  const linhasParaLojas = filtrosAtivos.promotorId
    ? lancamentos.filter(
        (linha) =>
          !linha.avulso && linha.promotorNome === filtrosAtivos.promotorId,
      )
    : lancamentos;

  const lojas = coletarOpcoesMapa(linhasParaLojas, (linha) =>
    linha.codLoja && linha.loja ? [linha.codLoja, linha.loja] : null,
  );

  // Produtos/status: só o que aparece na tela com os demais filtros aplicados.
  const linhasParaProdutos = filtrarLancamentosExpedicao(lancamentos, {
    ...filtrosAtivos,
    produtoId: "",
  });

  const produtos = coletarOpcoesMapa(linhasParaProdutos, (linha) =>
    linha.codProduto && linha.produto
      ? [linha.codProduto, linha.produto]
      : null,
  );

  const linhasParaStatus = filtrarLancamentosExpedicao(lancamentos, {
    ...filtrosAtivos,
    status: "todos",
  });

  const statusPresentes = new Set(
    linhasParaStatus.map((linha) => valorFiltroStatusExpedicao(linha.status)),
  );

  const status: OpcaoFiltroDinamico[] = (
    ["pendente", "aprovado", "reprovado"] as const
  )
    .filter((valor) => statusPresentes.has(valor))
    .map((valor) => ({
      value: valor,
      label: ROTULO_STATUS_FILTRO[valor],
    }));

  const origens = coletarOpcoesMapa(lancamentos, (linha) => {
    const origemChave = chaveOrigemExpedicao(linha);
    return origemChave && linha.origem ? [origemChave, linha.origem] : null;
  });

  const tiposPedido: OpcaoFiltroDinamico[] = [];

  if (lancamentos.some((linha) => !linha.avulso && linha.tipoPedido === "Normal")) {
    tiposPedido.push({ value: "normal", label: "Pedido Principal" });
  }

  if (lancamentos.some((linha) => !linha.avulso && linha.tipoPedido === "Extra")) {
    tiposPedido.push({ value: "extra", label: "Pedido Extra" });
  }

  if (lancamentos.some((linha) => linha.avulso)) {
    tiposPedido.push({ value: "avulsa", label: "Pedido Avulso" });
  }

  return {
    promotores,
    lojas,
    produtos,
    origens,
    tiposPedido,
    status,
  };
}

export function rotuloTipoPedidoExpedicao(
  linha: LancamentoExpedicao,
): string {
  if (linha.avulso) {
    return "Pedido Avulso";
  }

  return linha.tipoPedido === "Extra" ? "Pedido Extra" : "Pedido Principal";
}

export function rotuloTipoPedidoDetalheExpedicao(
  tipoPedido: "Normal" | "Extra" | null | undefined,
): string {
  if (tipoPedido === "Extra") {
    return "Pedido Extra";
  }

  return "Pedido Principal";
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

export function obterQtdeAvulsaExibicao(linha: LancamentoExpedicao): number {
  return linha.avulso ? linha.pedidoSolicitado : 0;
}

export function obterPedidoAprovadoParaCalculo(linha: LancamentoExpedicao): number {
  return linha.avulso ? 0 : linha.pedidoAprovado;
}

export function calcularPedidoCiss(
  pedidoAprovado: number,
  qtdeAvulsa: number,
): number {
  return pedidoAprovado + qtdeAvulsa;
}

export function calcularPedidoTotal(
  pedidoAprovado: number,
  trocaAtendida: number,
  qtdeAvulsa: number,
  bonificacao: number,
): number {
  return pedidoAprovado + trocaAtendida + qtdeAvulsa + bonificacao;
}

export function calcularPedidoCissLinha(linha: LancamentoExpedicao): number {
  return calcularPedidoCiss(
    obterPedidoAprovadoParaCalculo(linha),
    obterQtdeAvulsaExibicao(linha),
  );
}

export function calcularPedidoTotalLinha(linha: LancamentoExpedicao): number {
  return calcularPedidoTotal(
    obterPedidoAprovadoParaCalculo(linha),
    linha.trocaAtendida,
    obterQtdeAvulsaExibicao(linha),
    linha.bonificacao,
  );
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
