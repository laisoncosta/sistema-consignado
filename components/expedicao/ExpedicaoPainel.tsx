"use client";

import {
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Truck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { AprovacaoPedidoModal } from "@/components/expedicao/AprovacaoPedidoModal";
import {
  TransferenciaAvulsaModal,
  type TransferenciaAvulsaEdicao,
} from "@/components/expedicao/TransferenciaAvulsaModal";
import { InputDataBrasil } from "@/components/ui/InputDataBrasil";
import { getBrandByRegiao, type BrandTheme } from "@/lib/brands";
import { exportarExpedicaoExcel, exportarExpedicaoPdf } from "@/lib/expedicao-export";
import { gradienteCabecalhoPainel } from "@/lib/painel-aparencia";
import {
  calcularTotaisExpedicao,
  calcularPedidoTotalLinha,
  construirOpcoesFiltrosExpedicao,
  filtrarLancamentosExpedicao,
  filtrosExpedicaoIniciais,
  formatarDataBr,
  isStatusPendenteExpedicao,
  itemSemSolicitacaoExpedicao,
  obterDataHojeIso,
  obterQtdeAvulsaExibicao,
  rotuloTipoPedidoExpedicao,
  type FiltrosExpedicao,
  type LancamentoExpedicao,
  type OpcaoFiltroExpedicao,
} from "@/lib/expedicao";
import type { UserRole } from "@/lib/rbac";
import { ROLES } from "@/lib/rbac";

const classeCabecalhoColunaDestaque =
  "border-b border-slate-200 bg-slate-200 px-1.5 py-2 text-right font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200";
const classeCabecalhoPadrao =
  "border-b border-slate-200 px-1.5 py-2 dark:border-slate-600";
const classeCelulaColunaDestaque =
  "border-b border-slate-100 bg-slate-100 px-1.5 py-2 text-right tabular-nums font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100";
const classeCelulaPadrao =
  "border-b border-slate-100 px-1.5 py-2 dark:border-slate-700";
const classeTotalColunaDestaque =
  "border-t border-slate-200 bg-slate-200 px-1.5 py-2 text-right tabular-nums font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100";
const classeTotalPadrao =
  "border-t border-slate-200 px-1.5 py-2 dark:border-slate-600";

function subtrairDiasIso(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() - dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

type ExpedicaoPainelProps = {
  brand: BrandTheme;
  role: UserRole;
  usuarioNome: string;
  regiaoNome?: string;
};

function BadgeStatus({ status }: { status: LancamentoExpedicao["status"] }) {
  if (status === "Aprovado") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        Aprovado
      </span>
    );
  }

  if (status === "Reprovado") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
        Reprovado
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
      Pendente
    </span>
  );
}

function chaveRegiaoAlerta(nome: string): "rio-branco" | "manaus" | null {
  const normalizado = nome.trim().toLowerCase();

  if (normalizado.includes("manaus")) {
    return "manaus";
  }

  if (normalizado.includes("rio") && normalizado.includes("branco")) {
    return "rio-branco";
  }

  return null;
}

type AlertaRegionalPendentes = {
  chave: "rio-branco" | "manaus";
  nomeRegiao: string;
  lojasDistintas: number;
  produtosDistintos: number;
  datasPendentes: Array<{ data: string; produtosDistintos: number }>;
};

const IDENTIDADE_REGIAO_DIRETOR = {
  "rio-branco": {
    titulo: "Expedição Rio Branco",
    destaque: "#dc2626",
    destaqueLight: "rgba(220, 38, 38, 0.12)",
    botaoAtivo: "bg-red-600",
  },
  manaus: {
    titulo: "Expedição Manaus",
    destaque: "#047857",
    destaqueLight: "rgba(4, 120, 87, 0.12)",
    botaoAtivo: "bg-emerald-700",
  },
  todos: {
    titulo: "Expedição Todas as Regiões",
    destaque: "#dc2626",
    destaqueLight: "rgba(220, 38, 38, 0.12)",
    botaoAtivo: "bg-red-600",
  },
} as const;

function rotuloQuantidade(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function CardAlertaRegional({
  alerta,
  dataSelecionada,
  onClicarData,
}: {
  alerta: AlertaRegionalPendentes;
  dataSelecionada?: string | null;
  onClicarData?: (data: string, chave: AlertaRegionalPendentes["chave"]) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-amber-200/60 border-t-[3px] border-t-amber-500 bg-amber-50/80 shadow-sm dark:border-amber-600/45 dark:border-t-amber-400 dark:bg-slate-800">
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              {alerta.nomeRegiao}
            </h3>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-200/90">
              Pendências aguardando aprovação
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/70 px-2.5 py-1.5 dark:bg-slate-900/70">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-300/85">
              Lojas
            </p>
            <p className="mt-0.5 text-xs font-bold text-amber-900 dark:text-amber-50">
              {rotuloQuantidade(alerta.lojasDistintas, "Loja Pendente", "Lojas Pendentes")}
            </p>
          </div>
          <div className="rounded-lg bg-white/70 px-2.5 py-1.5 dark:bg-slate-900/70">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-300/85">
              Produtos
            </p>
            <p className="mt-0.5 text-xs font-bold text-amber-900 dark:text-amber-50">
              {rotuloQuantidade(alerta.produtosDistintos, "Produto", "Produtos")}
            </p>
          </div>
        </div>

        {alerta.datasPendentes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-amber-200/60 pt-2 dark:border-amber-600/40">
            {alerta.datasPendentes.map((item) => {
              const ativo = dataSelecionada === item.data;

              return (
                <button
                  key={item.data}
                  type="button"
                  onClick={() => onClicarData?.(item.data, alerta.chave)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    ativo
                      ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1 dark:bg-amber-500 dark:text-amber-950 dark:ring-amber-300"
                      : "bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-500/25 dark:text-amber-100 dark:hover:bg-amber-500/40"
                  }`}
                >
                  {formatarDataBr(item.data)} · {item.produtosDistintos}{" "}
                  {item.produtosDistintos === 1 ? "produto" : "produtos"}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function calcularAlertaRegional(
  pendentesAnteriores: LancamentoExpedicao[],
  chave: "rio-branco" | "manaus",
  nomeRegiao: string,
): AlertaRegionalPendentes | null {
  const linhasRegiao = pendentesAnteriores.filter(
    (linha) => chaveRegiaoAlerta(linha.regiao) === chave,
  );

  if (linhasRegiao.length === 0) {
    return null;
  }

  const produtosPorData = new Map<string, Set<string>>();

  for (const linha of linhasRegiao) {
    const produtos = produtosPorData.get(linha.dataLancamento) ?? new Set<string>();
    produtos.add(linha.codProduto || linha.produto);
    produtosPorData.set(linha.dataLancamento, produtos);
  }

  return {
    chave,
    nomeRegiao,
    lojasDistintas: new Set(
      linhasRegiao.map((linha) => linha.codLoja || linha.loja),
    ).size,
    produtosDistintos: new Set(
      linhasRegiao.map((linha) => linha.codProduto || linha.produto),
    ).size,
    datasPendentes: Array.from(produtosPorData.entries())
      .map(([data, produtos]) => ({
        data,
        produtosDistintos: produtos.size,
      }))
      .sort((a, b) => b.data.localeCompare(a.data)),
  };
}

function linhaPedidoExtraPendente(linha: LancamentoExpedicao): boolean {
  return (
    !linha.avulso &&
    linha.tipoPedido === "Extra" &&
    isStatusPendenteExpedicao(linha.status)
  );
}

export function ExpedicaoPainel({
  brand,
  role,
  usuarioNome,
  regiaoNome,
}: ExpedicaoPainelProps) {
  const [filtros, setFiltros] = useState<FiltrosExpedicao>(() =>
    filtrosExpedicaoIniciais(regiaoNome),
  );
  const [todosLancamentos, setTodosLancamentos] = useState<LancamentoExpedicao[]>(
    [],
  );
  const [lancamentosOriginais, setLancamentosOriginais] = useState<
    LancamentoExpedicao[]
  >([]);
  const [lojasTransferencia, setLojasTransferencia] = useState<
    OpcaoFiltroExpedicao[]
  >([]);
  const [produtosModal, setProdutosModal] = useState<OpcaoFiltroExpedicao[]>([]);
  const [origensModal, setOrigensModal] = useState<OpcaoFiltroExpedicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAvulso, setModalAvulso] = useState(false);
  const [transferenciaEdicao, setTransferenciaEdicao] =
    useState<TransferenciaAvulsaEdicao | null>(null);
  const [salvandoAvulso, setSalvandoAvulso] = useState(false);
  const [erroAvulso, setErroAvulso] = useState<string | null>(null);
  const [itemAprovacaoId, setItemAprovacaoId] = useState<number | null>(null);
  const [toastAprovacao, setToastAprovacao] = useState<string | null>(null);
  const [filtroRapidoExtra, setFiltroRapidoExtra] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({
    total: 0,
    totalPaginas: 1,
    temProxima: false,
    temAnterior: false,
    limite: 30,
  });

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;
  const exibirFiltroRegiao = role === ROLES.DIRETOR;
  const dataHoje = obterDataHojeIso(regiaoNome);

  function limitarDataAoHoje(valor: string): string {
    if (!valor || valor > dataHoje) {
      return dataHoje;
    }
    return valor;
  }

  function handleDataInicioChange(valor: string) {
    const dataInicio = limitarDataAoHoje(valor);

    setFiltros((atual) => {
      const dataFim = limitarDataAoHoje(atual.dataFim);
      return {
        ...atual,
        dataInicio,
        dataFim: dataFim < dataInicio ? dataInicio : dataFim,
      };
    });
  }

  function handleDataFimChange(valor: string) {
    setFiltros((atual) => {
      const dataFim = limitarDataAoHoje(valor);
      return {
        ...atual,
        dataFim: dataFim < atual.dataInicio ? atual.dataInicio : dataFim,
      };
    });
  }

  function handleRegiaoChange(regiao: FiltrosExpedicao["regiao"]) {
    setFiltros((atual) => ({
      ...atual,
      regiao,
      promotorId: "",
      lojaId: "",
      produtoId: "",
      origemId: "",
    }));
  }

  function aplicarFiltroPendenciaData(
    data: string,
    chaveRegiao: AlertaRegionalPendentes["chave"],
  ) {
    setFiltroRapidoExtra(false);
    setFiltros((atual) => {
      const filtroPendenciaAtivo =
        atual.status === "pendente" &&
        atual.dataInicio === atual.dataFim &&
        atual.dataInicio === data &&
        (!exibirFiltroRegiao || atual.regiao === chaveRegiao);

      if (filtroPendenciaAtivo) {
        return {
          ...atual,
          dataInicio: dataHoje,
          dataFim: dataHoje,
          status: "todos",
          promotorId: "",
          lojaId: "",
          produtoId: "",
          origemId: "",
          tipoPedido: "todos",
          ...(exibirFiltroRegiao ? { regiao: "todos" as const } : {}),
        };
      }

      return {
        ...atual,
        dataInicio: data,
        dataFim: data,
        status: "pendente",
        promotorId: "",
        lojaId: "",
        produtoId: "",
        origemId: "",
        tipoPedido: "todos",
        ...(exibirFiltroRegiao ? { regiao: chaveRegiao } : {}),
      };
    });
  }

  const carregarOpcoesModal = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        ...(exibirFiltroRegiao && filtros.regiao !== "todos"
          ? { regiao: filtros.regiao }
          : {}),
      });

      const response = await fetch(`/api/expedicao/opcoes?${params}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar filtros.");
      }

      setLojasTransferencia(data.lojasTransferencia ?? data.lojas ?? []);
      setProdutosModal(data.produtos ?? []);
      setOrigensModal(data.origens ?? []);
    } catch (error) {
      console.error(error);
    }
  }, [filtros.dataInicio, filtros.dataFim, filtros.regiao, exibirFiltroRegiao]);

  const carregarTodosLancamentos = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams({
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        tipoPedido: "todos",
        status: "todos",
        pagina: String(pagina),
        limite: "30",
        ...(exibirFiltroRegiao && filtros.regiao !== "todos"
          ? { regiao: filtros.regiao }
          : {}),
      });

      const response = await fetch(`/api/expedicao/lancamentos?${params}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar os lançamentos.");
      }

      setTodosLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
      if (data.paginacao) {
        setPaginacao({
          total: Number(data.paginacao.total ?? 0),
          totalPaginas: Number(data.paginacao.totalPaginas ?? 1),
          temProxima: Boolean(data.paginacao.temProxima),
          temAnterior: Boolean(data.paginacao.temAnterior),
          limite: Number(data.paginacao.limite ?? 30),
        });
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os lançamentos.",
      );
      setTodosLancamentos([]);
    } finally {
      setCarregando(false);
    }
  }, [
    filtros.dataInicio,
    filtros.dataFim,
    filtros.regiao,
    exibirFiltroRegiao,
    pagina,
  ]);

  const carregarLancamentosOriginais = useCallback(async () => {
    const dataOntem = subtrairDiasIso(dataHoje, 1);
    const dataInicioAlerta = subtrairDiasIso(dataHoje, 90);

    if (dataOntem < dataInicioAlerta) {
      setLancamentosOriginais([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        dataInicio: dataInicioAlerta,
        dataFim: dataOntem,
        status: "todos",
        tipoPedido: "todos",
      });

      const response = await fetch(`/api/expedicao/lancamentos?${params}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar pendências anteriores.");
      }

      setLancamentosOriginais(
        Array.isArray(data.lancamentos) ? data.lancamentos : [],
      );
    } catch (error) {
      console.error(error);
      setLancamentosOriginais([]);
    }
  }, [dataHoje]);

  useEffect(() => {
    void carregarOpcoesModal();
  }, [carregarOpcoesModal]);

  useEffect(() => {
    setPagina(1);
  }, [filtros.dataInicio, filtros.dataFim, filtros.regiao]);

  useEffect(() => {
    void carregarTodosLancamentos();
  }, [carregarTodosLancamentos]);

  useEffect(() => {
    void carregarLancamentosOriginais();
  }, [carregarLancamentosOriginais]);

  const opcoesFiltros = useMemo(
    () => construirOpcoesFiltrosExpedicao(todosLancamentos),
    [todosLancamentos],
  );

  const lancamentos = useMemo(
    () => filtrarLancamentosExpedicao(todosLancamentos, filtros),
    [todosLancamentos, filtros],
  );

  const possuiPedidoExtraPendente = useMemo(
    () => lancamentos.some(linhaPedidoExtraPendente),
    [lancamentos],
  );

  const lancamentosTabela = useMemo(
    () =>
      filtroRapidoExtra
        ? lancamentos.filter(linhaPedidoExtraPendente)
        : lancamentos,
    [lancamentos, filtroRapidoExtra],
  );

  useEffect(() => {
    if (!possuiPedidoExtraPendente) {
      setFiltroRapidoExtra(false);
    }
  }, [possuiPedidoExtraPendente]);

  useEffect(() => {
    setFiltros((atual) => {
      let proximo = atual;
      let alterou = false;

      if (
        atual.promotorId &&
        !opcoesFiltros.promotores.some((opcao) => opcao.value === atual.promotorId)
      ) {
        proximo = { ...proximo, promotorId: "" };
        alterou = true;
      }

      if (
        atual.lojaId &&
        !opcoesFiltros.lojas.some((opcao) => opcao.value === atual.lojaId)
      ) {
        proximo = { ...proximo, lojaId: "" };
        alterou = true;
      }

      if (
        atual.produtoId &&
        !opcoesFiltros.produtos.some((opcao) => opcao.value === atual.produtoId)
      ) {
        proximo = { ...proximo, produtoId: "" };
        alterou = true;
      }

      if (
        atual.origemId &&
        !opcoesFiltros.origens.some((opcao) => opcao.value === atual.origemId)
      ) {
        proximo = { ...proximo, origemId: "" };
        alterou = true;
      }

      if (
        atual.tipoPedido !== "todos" &&
        !opcoesFiltros.tiposPedido.some((opcao) => opcao.value === atual.tipoPedido)
      ) {
        proximo = { ...proximo, tipoPedido: "todos" };
        alterou = true;
      }

      return alterou ? proximo : atual;
    });
  }, [opcoesFiltros]);

  useEffect(() => {
    if (!toastAprovacao) {
      return;
    }

    const timer = setTimeout(() => setToastAprovacao(null), 3500);
    return () => clearTimeout(timer);
  }, [toastAprovacao]);

  const totais = useMemo(
    () => calcularTotaisExpedicao(lancamentosTabela),
    [lancamentosTabela],
  );

  const totalBonificacoes = useMemo(
    () => lancamentosTabela.reduce((acc, linha) => acc + linha.bonificacao, 0),
    [lancamentosTabela],
  );

  const totalQtdeAvulsa = useMemo(
    () =>
      lancamentosTabela.reduce(
        (acc, linha) => acc + obterQtdeAvulsaExibicao(linha),
        0,
      ),
    [lancamentosTabela],
  );

  const totalPedidoTotal = useMemo(
    () =>
      lancamentosTabela.reduce(
        (acc, linha) => acc + calcularPedidoTotalLinha(linha),
        0,
      ),
    [lancamentosTabela],
  );

  const alertasRegionais = useMemo(() => {
    const pendentesAnteriores = lancamentosOriginais.filter(
      (linha) =>
        linha.status === "Pendente" && linha.dataLancamento < dataHoje,
    );

    if (exibirFiltroRegiao) {
      const alertas: AlertaRegionalPendentes[] = [];

      const exibirRioBranco =
        filtros.regiao === "todos" || filtros.regiao === "rio-branco";
      const exibirManaus =
        filtros.regiao === "todos" || filtros.regiao === "manaus";

      if (exibirRioBranco) {
        const alertaRio = calcularAlertaRegional(
          pendentesAnteriores,
          "rio-branco",
          "Rio Branco",
        );

        if (alertaRio) {
          alertas.push(alertaRio);
        }
      }

      if (exibirManaus) {
        const alertaManaus = calcularAlertaRegional(
          pendentesAnteriores,
          "manaus",
          "Manaus",
        );

        if (alertaManaus) {
          alertas.push(alertaManaus);
        }
      }

      return alertas.length > 0 ? alertas : null;
    }

    if (role === ROLES.EXPEDICAO && regiaoNome) {
      const chave = chaveRegiaoAlerta(regiaoNome);

      if (!chave) {
        return null;
      }

      const nomeRegiao = chave === "manaus" ? "Manaus" : "Rio Branco";
      const alerta = calcularAlertaRegional(
        pendentesAnteriores,
        chave,
        nomeRegiao,
      );

      return alerta ? [alerta] : null;
    }

    return null;
  }, [
    lancamentosOriginais,
    dataHoje,
    exibirFiltroRegiao,
    filtros.regiao,
    role,
    regiaoNome,
  ]);

  const dataPendenciaSelecionada =
    filtros.status === "pendente" && filtros.dataInicio === filtros.dataFim
      ? filtros.dataInicio
      : null;

  const identidadeExpedicaoDiretor = exibirFiltroRegiao
    ? IDENTIDADE_REGIAO_DIRETOR[filtros.regiao]
    : null;

  const tituloExpedicao =
    identidadeExpedicaoDiretor?.titulo ?? "Expedição";

  const corDestaquePainel =
    identidadeExpedicaoDiretor?.destaque ?? brand.primary;

  const corDestaqueLightPainel =
    identidadeExpedicaoDiretor?.destaqueLight ?? brand.primaryLight;

  function handlePromotorChange(promotorId: string) {
    setFiltros((atual) => ({
      ...atual,
      promotorId,
      lojaId: "",
    }));
  }

  function handleCliqueLinha(linha: LancamentoExpedicao) {
    if (linha.avulso && linha.transferenciaId) {
      abrirEdicaoTransferencia(linha);
      return;
    }

    if (linha.itemPedidoId) {
      abrirAprovacao(linha);
    }
  }

  function linhaClicavel(linha: LancamentoExpedicao): boolean {
    return (
      (linha.avulso && linha.transferenciaId != null) || linha.itemPedidoId != null
    );
  }

  function abrirAprovacao(linha: LancamentoExpedicao) {
    if (!linha.itemPedidoId) {
      return;
    }

    if (role === ROLES.EXPEDICAO) {
      if (
        linha.status !== "Pendente" &&
        itemSemSolicitacaoExpedicao(linha.pedidoSolicitado, linha.trocaSolicitada)
      ) {
        setToastAprovacao("Não há solicitações de pedidos para esse item");
        return;
      }
    }

    setItemAprovacaoId(linha.itemPedidoId);
  }

  function abrirEdicaoTransferencia(linha: LancamentoExpedicao) {
    if (
      !linha.avulso ||
      !linha.transferenciaId ||
      linha.lojaId == null ||
      linha.produtoId == null ||
      linha.origemId == null
    ) {
      return;
    }

    setTransferenciaEdicao({
      id: linha.transferenciaId,
      lojaId: linha.lojaId,
      produtoId: linha.produtoId,
      origemId: linha.origemId,
      quantidade: linha.pedidoSolicitado,
      bonificacao: linha.bonificacao,
      motivo: linha.motivoAvulso ?? "",
    });
    setErroAvulso(null);
    setModalAvulso(true);
  }

  async function salvarTransferenciaAvulsa(dados: {
    id?: number;
    lojaId: number;
    produtoId: number;
    origemId: number;
    quantidade: number;
    bonificacao: number;
    motivo: string;
  }) {
    setSalvandoAvulso(true);
    setErroAvulso(null);

    const editando = dados.id != null;

    try {
      const response = await fetch(
        editando
          ? `/api/expedicao/transferencias/${dados.id}`
          : "/api/expedicao/transferencias",
        {
          method: editando ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            (editando
              ? "Não foi possível salvar a transferência."
              : "Não foi possível lançar a transferência."),
        );
      }

      setModalAvulso(false);
      setTransferenciaEdicao(null);
      await carregarTodosLancamentos();
      await carregarLancamentosOriginais();
      await carregarOpcoesModal();
    } catch (error) {
      setErroAvulso(
        error instanceof Error
          ? error.message
          : editando
            ? "Não foi possível salvar a transferência."
            : "Não foi possível lançar a transferência.",
      );
    } finally {
      setSalvandoAvulso(false);
    }
  }

  function exportarPdf() {
    const lojaSelecionada = opcoesFiltros.lojas.find(
      (l) => l.value === filtros.lojaId,
    );
    const promotorSelecionado = opcoesFiltros.promotores.find(
      (p) => p.value === filtros.promotorId,
    );

    const tipoSelecionado = opcoesFiltros.tiposPedido.find(
      (tipo) => tipo.value === filtros.tipoPedido,
    );

    const marcaPdf = getBrandByRegiao(regiaoNome ?? "");

    exportarExpedicaoPdf(lancamentos, {
      usuarioNome,
      lojaNome: lojaSelecionada?.label ?? "Todas",
      promotorNome: promotorSelecionado?.label ?? "Todos",
      logoUrl: marcaPdf.logo,
      tipoNome:
        filtros.tipoPedido === "todos"
          ? "Todos"
          : tipoSelecionado?.label ?? "Todos",
    });
  }

  return (
    <>
      {toastAprovacao ? (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900 shadow-lg">
          {toastAprovacao}
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[95%] px-4 py-3 2xl:max-w-[1600px] lg:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className="border-b px-6 py-3 sm:px-8"
            style={{
              borderColor: corDestaqueLightPainel,
              background: gradienteCabecalhoPainel(corDestaqueLightPainel),
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <Truck
                    className="h-3.5 w-3.5"
                    style={{ color: corDestaquePainel }}
                  />
                  Operação
                </div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {tituloExpedicao}
                </h2>
                <p className="text-xs text-slate-600">
                  Filtre, autorize e exporte os pedidos do portal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErroAvulso(null);
                  setTransferenciaEdicao(null);
                  setModalAvulso(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-md"
                style={{ backgroundColor: corDestaquePainel }}
              >
                <Plus className="h-4 w-4" />
                Transferência Avulsa
              </button>
            </div>
          </div>

          {alertasRegionais ? (
            <div className="border-b border-slate-200 bg-slate-50/40 px-6 py-2.5 dark:border-slate-700 dark:bg-slate-900/50 sm:px-8">
              <div
                className={
                  alertasRegionais.length > 1
                    ? "grid gap-2 md:grid-cols-2"
                    : "grid grid-cols-1 gap-2"
                }
              >
                {alertasRegionais.map((alerta) => (
                  <CardAlertaRegional
                    key={alerta.chave}
                    alerta={alerta}
                    dataSelecionada={dataPendenciaSelecionada}
                    onClicarData={aplicarFiltroPendenciaData}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 border-b border-slate-200 px-6 py-3">
            {exibirFiltroRegiao ? (
              <div className="flex flex-wrap items-center gap-3">
                {(
                  [
                    { value: "rio-branco", label: "Rio Branco" },
                    { value: "manaus", label: "Manaus" },
                    { value: "todos", label: "Todas" },
                  ] as const
                ).map((opcao) => {
                  const ativo = filtros.regiao === opcao.value;
                  const botaoAtivoClasse =
                    opcao.value === "manaus"
                      ? IDENTIDADE_REGIAO_DIRETOR.manaus.botaoAtivo
                      : IDENTIDADE_REGIAO_DIRETOR["rio-branco"].botaoAtivo;

                  return (
                    <button
                      key={opcao.value}
                      type="button"
                      onClick={() => handleRegiaoChange(opcao.value)}
                      className={
                        ativo
                          ? `rounded-lg px-4 py-2 font-bold text-white shadow ${botaoAtivoClasse}`
                          : "rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }
                    >
                      {opcao.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-3">
              <label className="w-[9.5rem] shrink-0 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Data Início</span>
                <InputDataBrasil
                  value={filtros.dataInicio}
                  max={dataHoje}
                  onChange={handleDataInicioChange}
                  className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                  style={inputRingStyle}
                />
              </label>
              <label className="w-[9.5rem] shrink-0 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Data Fim</span>
                <InputDataBrasil
                  value={filtros.dataFim}
                  min={filtros.dataInicio}
                  max={dataHoje}
                  onChange={handleDataFimChange}
                  className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                  style={inputRingStyle}
                />
              </label>

              <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Promotor</span>
                <select
                  value={filtros.promotorId}
                  onChange={(e) => handlePromotorChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="">Todos</option>
                  {opcoesFiltros.promotores.map((promotor) => (
                    <option key={promotor.value} value={promotor.value}>
                      {promotor.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Loja</span>
                <select
                  value={filtros.lojaId}
                  onChange={(e) =>
                    setFiltros((a) => ({ ...a, lojaId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="">Todas</option>
                  {opcoesFiltros.lojas.map((loja) => (
                    <option key={loja.value} value={loja.value}>
                      {loja.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Produto</span>
                <select
                  value={filtros.produtoId}
                  onChange={(e) =>
                    setFiltros((a) => ({ ...a, produtoId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="">Todos</option>
                  {opcoesFiltros.produtos.map((produto) => (
                    <option key={produto.value} value={produto.value}>
                      {produto.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="w-40 shrink-0 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Origem</span>
                <select
                  value={filtros.origemId}
                  onChange={(e) =>
                    setFiltros((a) => ({ ...a, origemId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="">Todas</option>
                  {opcoesFiltros.origens.map((origem) => (
                    <option key={origem.value} value={origem.value}>
                      {origem.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-44 shrink-0 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Tipo de Pedidos</span>
                <select
                  value={filtros.tipoPedido}
                  onChange={(e) =>
                    setFiltros((a) => ({
                      ...a,
                      tipoPedido: e.target.value as FiltrosExpedicao["tipoPedido"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="todos">Todos</option>
                  {opcoesFiltros.tiposPedido.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-36 shrink-0 space-y-1 text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <select
                  value={filtros.status}
                  onChange={(e) =>
                    setFiltros((a) => ({
                      ...a,
                      status: e.target.value as FiltrosExpedicao["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  style={inputRingStyle}
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                </select>
              </label>

              {possuiPedidoExtraPendente ? (
                <button
                  type="button"
                  onClick={() => setFiltroRapidoExtra((ativo) => !ativo)}
                  aria-pressed={filtroRapidoExtra}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 ${
                    filtroRapidoExtra
                      ? "border-emerald-800 bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1"
                      : "border-emerald-600 bg-emerald-600"
                  }`}
                >
                  Existe um ou mais pedidos Extras
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportarPdf}
                disabled={lancamentos.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={() => exportarExpedicaoExcel(lancamentos)}
                disabled={lancamentos.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando lançamentos...
              </div>
            ) : erro ? (
              <div className="px-6 py-16 text-center text-sm text-red-600">
                {erro}
              </div>
            ) : lancamentosTabela.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
                {filtros.dataInicio === filtros.dataFim ? (
                  <p className="mt-2 text-xs text-slate-400">
                    O período está restrito a um único dia. Amplie a{" "}
                    <strong>Data Início</strong> para incluir pedidos de dias
                    anteriores.
                  </p>
                ) : null}
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_1px_0_0_rgb(51_65_85)]">
                  <tr>
                    <th className={`whitespace-nowrap ${classeCabecalhoPadrao}`}>Pedido</th>
                    <th className={`min-w-[200px] whitespace-nowrap ${classeCabecalhoPadrao}`}>
                      Produto
                    </th>
                    <th className={`min-w-[200px] whitespace-nowrap ${classeCabecalhoPadrao}`}>
                      Loja
                    </th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Estoque</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Avarias</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Pedido Solicitado</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Corte do Pedido</th>
                    <th className={classeCabecalhoColunaDestaque}>Pedido Aprovado</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Troca Solicitada</th>
                    <th className={classeCabecalhoColunaDestaque}>Troca Atendida</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Qtde Avulsa</th>
                    <th className={`text-right ${classeCabecalhoPadrao}`}>Bonificação</th>
                    <th className={classeCabecalhoColunaDestaque}>Pedido Total</th>
                    <th className={classeCabecalhoPadrao}>Data</th>
                    <th className={classeCabecalhoPadrao}>Tipo de Pedido</th>
                    <th className={`${classeCabecalhoPadrao} px-2`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosTabela.map((linha) => (
                    <tr
                      key={linha.id}
                      onClick={() => handleCliqueLinha(linha)}
                      className={`transition ${
                        linhaClicavel(linha)
                          ? "cursor-pointer hover:bg-slate-50"
                          : ""
                      }`}
                    >
                      <td className={`whitespace-nowrap font-semibold text-slate-800 dark:text-slate-100 ${classeCelulaPadrao}`}>
                        {linha.numeroAmigavelRotulo ??
                          (linha.avulso ? "Avulso" : "—")}
                      </td>
                      <td className={`min-w-[200px] whitespace-nowrap text-slate-800 dark:text-slate-100 ${classeCelulaPadrao}`}>
                        {linha.produto}
                      </td>
                      <td className={`min-w-[200px] whitespace-nowrap dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.loja}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.estoque}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.avarias}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.pedidoSolicitado}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.cortePedido}
                      </td>
                      <td className={classeCelulaColunaDestaque}>
                        {linha.pedidoAprovado}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.trocaSolicitada}
                      </td>
                      <td className={classeCelulaColunaDestaque}>
                        {linha.trocaAtendida}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {obterQtdeAvulsaExibicao(linha)}
                      </td>
                      <td className={`text-right tabular-nums dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {linha.bonificacao}
                      </td>
                      <td className={classeCelulaColunaDestaque}>
                        {calcularPedidoTotalLinha(linha)}
                      </td>
                      <td className={`whitespace-nowrap dark:text-slate-200 ${classeCelulaPadrao}`}>
                        {formatarDataBr(linha.dataLancamento)}
                      </td>
                      <td className={`whitespace-nowrap text-slate-700 dark:text-slate-300 ${classeCelulaPadrao}`}>
                        {rotuloTipoPedidoExpedicao(linha)}
                      </td>
                      <td className={`${classeCelulaPadrao} px-2`}>
                        <BadgeStatus status={linha.status} />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    <td className={classeTotalPadrao} colSpan={3}>
                      Totais
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totais.estoque}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totais.avarias}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totais.pedidoSolicitado}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totais.cortePedido}
                    </td>
                    <td className={classeTotalColunaDestaque}>
                      {totais.pedidoAprovado}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totais.trocaSolicitada}
                    </td>
                    <td className={classeTotalColunaDestaque}>
                      {totais.trocaAtendida}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totalQtdeAvulsa}
                    </td>
                    <td className={`text-right tabular-nums ${classeTotalPadrao}`}>
                      {totalBonificacoes}
                    </td>
                    <td className={classeTotalColunaDestaque}>
                      {totalPedidoTotal}
                    </td>
                    <td className={classeTotalPadrao} colSpan={3} />
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {!carregando && paginacao.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-2.5 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Página {pagina} de {paginacao.totalPaginas} · {paginacao.total}{" "}
                lançamento(s)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!paginacao.temAnterior || carregando}
                  onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={!paginacao.temProxima || carregando}
                  onClick={() => setPagina((atual) => atual + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <TransferenciaAvulsaModal
        aberto={modalAvulso}
        brand={brand}
        lojas={lojasTransferencia}
        produtos={produtosModal}
        origens={origensModal}
        salvando={salvandoAvulso}
        erro={erroAvulso}
        editando={transferenciaEdicao}
        onFechar={() => {
          setModalAvulso(false);
          setTransferenciaEdicao(null);
        }}
        onSalvar={salvarTransferenciaAvulsa}
      />

      <AprovacaoPedidoModal
        aberto={itemAprovacaoId != null}
        brand={brand}
        role={role}
        regiaoNome={regiaoNome}
        itemPedidoId={itemAprovacaoId}
        origens={origensModal}
        onFechar={() => setItemAprovacaoId(null)}
        onFinalizado={async () => {
          await carregarTodosLancamentos();
          await carregarLancamentosOriginais();
        }}
      />
    </>
  );
}
