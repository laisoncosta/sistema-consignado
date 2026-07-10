"use client";

import { ChevronDown, ChevronLeft, Store } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { apiFetch } from "@/lib/api-client";
import type { BrandTheme } from "@/lib/brands";
import { portalSelectMobile } from "@/lib/portal-mobile-ui";
import {
  agruparHistoricoPedidos,
  calcularPedidoTotalHistorico,
  calcularTotaisHistorico,
  filtrarLancamentosHistorico,
  filtrarLancamentosHistoricoMesclado,
  filtrarPedidosPendentesHistorico,
  filtrarPedidosPendentesHistoricoMesclado,
  obterDataHojeIso,
  obterPrimeiroDiaMesAtual,
  resolverStatusExibicaoMobile,
  statusExibicaoMobileAtendeFiltro,
  linhaHistoricoPendenteMobile,
  type LancamentoHistoricoAgrupado,
  type StatusHistoricoExibicaoMobile,
  type StatusHistoricoFiltro,
  type StatusHistoricoFiltroMobile,
  type TotaisHistoricoAgrupado,
} from "@/lib/historico-pedidos";
import { formatarDataBrasil, obterDataHojeBrasil } from "@/lib/data-brasil";
import { InputDataBrasil } from "@/components/ui/InputDataBrasil";

type LojaHistorico = {
  id: string;
  rotulo: string;
};

type HistoricoPedidosProps = {
  brand: BrandTheme;
  usuarioEmail: string;
  regiaoNome?: string;
  lojas?: LojaHistorico[];
  otimizadoMobile?: boolean;
};

function BadgeStatus({
  status,
}: {
  status: StatusHistoricoExibicaoMobile;
}) {
  if (status === "Aprovado") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Aprovado
      </span>
    );
  }

  if (status === "Aprovado Parcialmente") {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
        Aprovado Parcialmente
      </span>
    );
  }

  if (status === "Reprovado") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
        Reprovado
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
      Pendente
    </span>
  );
}

function CelulaNumerica({ valor }: { valor: number }) {
  return <span className="tabular-nums">{valor}</span>;
}

const classeCelulaHistoricoMobile =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800";
const classeLabelHistoricoMobile =
  "font-medium text-slate-500 dark:text-slate-400";
const classeValorHistoricoMobile =
  "mt-1 text-base font-semibold text-slate-900 dark:text-slate-100";
const classePainelTotalHistoricoMobile =
  "rounded-lg bg-slate-100 px-3 py-2 text-center dark:bg-slate-800";

function valorResumoHistorico(valor: number | null | undefined): number {
  if (valor == null || !Number.isFinite(valor)) {
    return 0;
  }

  return valor;
}

function ResumoPeriodoMobile({
  titulo,
  totais,
}: {
  titulo: string;
  totais: TotaisHistoricoAgrupado;
}) {
  const pedidoAtendido = valorResumoHistorico(totais.qtdAtendida);
  const trocasAtendidas = valorResumoHistorico(totais.trocasAtendidas);
  const bonificacao = valorResumoHistorico(totais.bonificacao);
  const qtdeTransf = valorResumoHistorico(totais.qtdeTransf);
  const pedidoTotal = calcularPedidoTotalHistorico({
    qtdAtendida: pedidoAtendido,
    trocasAtendidas,
    pedidoExtraAtendido: valorResumoHistorico(totais.pedidoExtraAtendido),
    qtdeTransf,
    bonificacao,
  });

  const camposResumo = [
    { label: "Estoque", valor: valorResumoHistorico(totais.contagemEstoque) },
    { label: "Pedido Solicitado", valor: valorResumoHistorico(totais.qtdSolicitada) },
    { label: "Pedido Atendido", valor: pedidoAtendido },
    { label: "Trocas Atendidas", valor: trocasAtendidas },
    { label: "Bonificação", valor: bonificacao },
    { label: "Qtde Avulsa", valor: qtdeTransf },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titulo}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {camposResumo.map((campo) => (
          <div key={campo.label} className={classeCelulaHistoricoMobile}>
            <p className={classeLabelHistoricoMobile}>{campo.label}</p>
            <p className={classeValorHistoricoMobile}>
              <CelulaNumerica valor={campo.valor} />
            </p>
          </div>
        ))}
      </div>
      <div className={`mt-3 ${classePainelTotalHistoricoMobile}`}>
        <p className={`text-xs font-medium ${classeLabelHistoricoMobile}`}>
          Pedido Total
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          <CelulaNumerica valor={pedidoTotal} />
        </p>
      </div>
    </div>
  );
}

function ValorPedidoTotalHistorico({
  status,
  pedidoTotal,
  className = "text-lg font-bold",
}: {
  status: StatusHistoricoExibicaoMobile;
  pedidoTotal: number;
  className?: string;
}) {
  if (status === "Aprovado" || status === "Aprovado Parcialmente") {
    return (
      <p className={`${className} text-slate-900 dark:text-slate-100`}>
        <CelulaNumerica valor={pedidoTotal} />
      </p>
    );
  }

  if (status === "Reprovado") {
    return (
      <p className={`${className} text-rose-700 dark:text-rose-400`}>Reprovado</p>
    );
  }

  return (
    <p className={`${className} text-amber-900 dark:text-amber-300`}>
      Aguardando Aprovação
    </p>
  );
}

export function HistoricoPedidos({
  brand,
  usuarioEmail,
  regiaoNome,
  lojas = [],
  otimizadoMobile = false,
}: HistoricoPedidosProps) {
  const [lojaId, setLojaId] = useState("");
  const [dataInicial, setDataInicial] = useState(() =>
    obterPrimeiroDiaMesAtual(regiaoNome),
  );
  const [dataFinal, setDataFinal] = useState(() =>
    obterDataHojeIso(regiaoNome),
  );
  const [statusFiltro, setStatusFiltro] =
    useState<StatusHistoricoFiltro>("todos");
  const [statusFiltroMobile, setStatusFiltroMobile] =
    useState<StatusHistoricoFiltroMobile>("todos");
  const [produtoFiltro, setProdutoFiltro] = useState("");
  const [modoPendentes, setModoPendentes] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [lancamentos, setLancamentos] = useState<
    import("@/lib/historico-pedidos").LancamentoHistoricoRaw[]
  >([]);

  const dataHoje = obterDataHojeBrasil(regiaoNome);

  function limitarDataAoHoje(valor: string): string {
    if (!valor || valor > dataHoje) {
      return dataHoje;
    }
    return valor;
  }

  function handleDataInicialChange(valor: string) {
    const inicial = limitarDataAoHoje(valor);
    setDataInicial(inicial);
    setDataFinal((atual) => {
      const final = limitarDataAoHoje(atual);
      return final < inicial ? inicial : final;
    });
  }

  function handleDataFinalChange(valor: string) {
    const final = limitarDataAoHoje(valor);
    setDataFinal(final < dataInicial ? dataInicial : final);
  }

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;
  const classeSelect = otimizadoMobile
    ? `${portalSelectMobile} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100`
    : "w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2";
  const classeSelectStatus = otimizadoMobile
    ? `${portalSelectMobile.replace("pl-10", "px-2")} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100`
    : "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2";
  const classeSelectCompactoMobile =
    "min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none transition focus:border-transparent focus:ring-2 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const classeData = otimizadoMobile
    ? "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-base text-slate-800 outline-none transition focus:border-transparent focus:ring-2 sm:min-h-11 sm:py-3 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2";

  useEffect(() => {
    let cancelado = false;

    async function carregarHistorico() {
      setCarregando(true);

      try {
        const response = await apiFetch("/api/pedidos/historico", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar histórico.");
        }

        const data = await response.json();
        const remotos = Array.isArray(data.lancamentos) ? data.lancamentos : [];

        if (!cancelado) {
          setLancamentos(remotos);
        }
      } catch {
        if (!cancelado) {
          setLancamentos([]);
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void carregarHistorico();

    const recarregarAoVoltar = () => {
      if (document.visibilityState === "visible") {
        void carregarHistorico();
      }
    };

    window.addEventListener("focus", recarregarAoVoltar);
    document.addEventListener("visibilitychange", recarregarAoVoltar);

    return () => {
      cancelado = true;
      window.removeEventListener("focus", recarregarAoVoltar);
      document.removeEventListener("visibilitychange", recarregarAoVoltar);
    };
  }, [usuarioEmail]);

  const produtosDisponiveis = useMemo(() => {
    const filtrados = modoPendentes
      ? filtrarPedidosPendentesHistorico(lancamentos, {
          lojaId,
          dataMaxima: dataHoje,
        })
      : filtrarLancamentosHistorico(lancamentos, {
          lojaId,
          dataInicial,
          dataFinal,
          status: statusFiltro,
        });

    const mapa = new Map<string, string>();

    for (const item of filtrados) {
      if (!mapa.has(item.produtoId)) {
        mapa.set(item.produtoId, item.produtoNome);
      }
    }

    return Array.from(mapa.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [
    lancamentos,
    lojaId,
    dataInicial,
    dataFinal,
    statusFiltro,
    dataHoje,
    modoPendentes,
  ]);

  const linhasAgrupadas = useMemo(() => {
    const filtrados = filtrarLancamentosHistorico(lancamentos, {
      lojaId,
      dataInicial,
      dataFinal,
      status: statusFiltro,
      produtoId: produtoFiltro || undefined,
    });

    return agruparHistoricoPedidos(filtrados);
  }, [
    lancamentos,
    lojaId,
    dataInicial,
    dataFinal,
    statusFiltro,
    produtoFiltro,
  ]);

  const linhasPendentesAgrupadas = useMemo(() => {
    const filtrados = filtrarPedidosPendentesHistorico(lancamentos, {
      lojaId,
      produtoId: produtoFiltro || undefined,
      dataMaxima: dataHoje,
    });

    return agruparHistoricoPedidos(filtrados);
  }, [lancamentos, lojaId, produtoFiltro, dataHoje]);

  const linhasAgrupadasMobile = useMemo(() => {
    const filtrados = filtrarLancamentosHistoricoMesclado(lancamentos, {
      lojaId,
      dataInicial,
      dataFinal,
      status: "todos",
      produtoId: produtoFiltro || undefined,
    });

    const agrupados = agruparHistoricoPedidos(filtrados, {
      mesclarPedidoExtra: true,
    });

    return agrupados.filter((linha) =>
      statusExibicaoMobileAtendeFiltro(linha, statusFiltroMobile),
    );
  }, [
    lancamentos,
    lojaId,
    dataInicial,
    dataFinal,
    statusFiltroMobile,
    produtoFiltro,
  ]);

  const linhasPendentesAgrupadasMobile = useMemo(() => {
    const filtrados = filtrarPedidosPendentesHistoricoMesclado(lancamentos, {
      lojaId,
      produtoId: produtoFiltro || undefined,
      dataMaxima: dataHoje,
    });

    const agrupados = agruparHistoricoPedidos(filtrados, {
      mesclarPedidoExtra: true,
    });

    return agrupados.filter(linhaHistoricoPendenteMobile);
  }, [lancamentos, lojaId, produtoFiltro, dataHoje]);

  const linhasMobile = otimizadoMobile
    ? modoPendentes
      ? linhasPendentesAgrupadasMobile
      : linhasAgrupadasMobile
    : modoPendentes
      ? linhasPendentesAgrupadas
      : linhasAgrupadas;

  const totais = useMemo(
    () => calcularTotaisHistorico(linhasAgrupadas),
    [linhasAgrupadas],
  );

  const totaisMobileResumo = useMemo(
    () => calcularTotaisHistorico(linhasAgrupadasMobile),
    [linhasAgrupadasMobile],
  );

  const totaisPendentesMobileResumo = useMemo(
    () => calcularTotaisHistorico(linhasPendentesAgrupadasMobile),
    [linhasPendentesAgrupadasMobile],
  );

  const quantidadeProdutosPendentes = useMemo(() => {
    if (!otimizadoMobile) {
      return linhasPendentesAgrupadas.length;
    }

    const filtrados = filtrarPedidosPendentesHistoricoMesclado(lancamentos, {
      lojaId,
      dataMaxima: dataHoje,
    });

    const agrupados = agruparHistoricoPedidos(filtrados, {
      mesclarPedidoExtra: true,
    });

    return agrupados.filter(linhaHistoricoPendenteMobile).length;
  }, [
    otimizadoMobile,
    linhasPendentesAgrupadas.length,
    lancamentos,
    lojaId,
    dataHoje,
  ]);

  return (
    <div
      className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
      style={{ borderColor: brand.primaryLight }}
    >
      <div className="border-b border-slate-100 pb-5 dark:border-slate-800">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Histórico Consolidado de Lançamentos
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Visualização agrupada por produto, loja e status no período selecionado.
        </p>

        {otimizadoMobile ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="historico-loja-mobile"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Loja
              </label>
              <select
                id="historico-loja-mobile"
                value={lojaId}
                onChange={(event) => setLojaId(event.target.value)}
                className={classeSelectCompactoMobile}
                style={inputRingStyle}
              >
                <option value="">Todas</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="historico-status-mobile"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Status
              </label>
              <select
                id="historico-status-mobile"
                value={statusFiltroMobile}
                onChange={(event) =>
                  setStatusFiltroMobile(
                    event.target.value as StatusHistoricoFiltroMobile,
                  )
                }
                className={classeSelectCompactoMobile}
                style={inputRingStyle}
                disabled={modoPendentes}
              >
                <option value="todos">Todos</option>
                <option value="aprovado">Aprovados</option>
                <option value="aprovado_parcialmente">Aprovados Parcialmente</option>
                <option value="reprovado">Reprovados</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="historico-produto-mobile"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Produto
              </label>
              <select
                id="historico-produto-mobile"
                value={produtoFiltro}
                onChange={(event) => setProdutoFiltro(event.target.value)}
                className={classeSelectCompactoMobile}
                style={inputRingStyle}
              >
                <option value="">Todos</option>
                {produtosDisponiveis.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {otimizadoMobile ? (
          <div className="mt-3 md:hidden">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Período
            </span>
            <div className="grid grid-cols-2 gap-2">
              <InputDataBrasil
                id="historico-data-inicial-mobile"
                value={dataInicial}
                max={dataHoje}
                onChange={handleDataInicialChange}
                className={classeSelectCompactoMobile}
                style={inputRingStyle}
                aria-label="Data inicial"
              />
              <InputDataBrasil
                id="historico-data-final-mobile"
                value={dataFinal}
                min={dataInicial}
                max={dataHoje}
                onChange={handleDataFinalChange}
                className={classeSelectCompactoMobile}
                style={inputRingStyle}
                aria-label="Data final"
              />
            </div>
          </div>
        ) : null}

        <div
          className={`mt-5 grid gap-4 lg:grid-cols-3 ${otimizadoMobile ? "hidden md:grid" : ""}`}
        >
          <div>
            <label
              htmlFor="historico-loja"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Loja
            </label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="historico-loja"
                value={lojaId}
                onChange={(event) => setLojaId(event.target.value)}
                className={classeSelect}
                style={inputRingStyle}
              >
                <option value="">Todas as lojas</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.rotulo}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Período
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="historico-data-inicial" className="sr-only">
                  Data Inicial
                </label>
                <InputDataBrasil
                  id="historico-data-inicial"
                  value={dataInicial}
                  max={dataHoje}
                  onChange={handleDataInicialChange}
                  className={classeData}
                  style={inputRingStyle}
                />
              </div>
              <div>
                <label htmlFor="historico-data-final" className="sr-only">
                  Data Final
                </label>
                <InputDataBrasil
                  id="historico-data-final"
                  value={dataFinal}
                  min={dataInicial}
                  max={dataHoje}
                  onChange={handleDataFinalChange}
                  className={classeData}
                  style={inputRingStyle}
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="historico-status"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Status
            </label>
            <div className="relative">
              <select
                id="historico-status"
                value={statusFiltro}
                onChange={(event) =>
                  setStatusFiltro(event.target.value as StatusHistoricoFiltro)
                }
                className={classeSelectStatus}
                style={inputRingStyle}
              >
                <option value="todos">Todos</option>
                <option value="aprovado">Aprovado</option>
                <option value="pendente">Pendente</option>
                <option value="reprovado">Reprovado</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead>
            <tr
              className="border-b text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              style={{ backgroundColor: brand.primaryLight }}
            >
              <th className="px-3 py-3">Pedido</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Produto</th>
              <th className="px-3 py-3">Loja</th>
              <th className="px-3 py-3 text-center">Contagem Estoque</th>
              <th className="px-3 py-3 text-center">Pedido Solicitado</th>
              <th className="px-3 py-3 text-center">Corte</th>
              <th className="px-3 py-3 text-center">Pedido Atendido</th>
              <th className="px-3 py-3 text-center">Avarias</th>
              <th className="px-3 py-3 text-center">Trocas Solicitadas</th>
              <th className="px-3 py-3 text-center">Corte Troca</th>
              <th className="px-3 py-3 text-center">Trocas Atendidas</th>
              <th
                className="px-3 py-3 text-center font-bold"
                style={{ backgroundColor: "#E2E8F0" }}
              >
                Pedido Total
              </th>
              <th className="px-3 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Carregando histórico...
                </td>
              </tr>
            ) : null}

            {!carregando && linhasAgrupadas.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : null}

            {!carregando
              ? linhasAgrupadas.map((linha) => (
                  <LinhaHistorico key={linha.chave} linha={linha} />
                ))
              : null}
          </tbody>
          {!carregando && linhasAgrupadas.length > 0 ? (
            <tfoot>
              <tr
                className="border-t-2 bg-slate-50 font-semibold text-slate-800"
                style={{ borderColor: brand.primaryLight }}
              >
                <td className="px-3 py-3" colSpan={3}>
                  Totais
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.contagemEstoque} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.qtdSolicitada} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.corte} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.qtdAtendida} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.avarias} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.trocasSolicitadas} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.corteTroca} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CelulaNumerica valor={totais.trocasAtendidas} />
                </td>
                <td
                  className="px-3 py-3 text-center font-bold"
                  style={{ backgroundColor: "#F1F5F9" }}
                >
                  <CelulaNumerica valor={totais.pedidoTotal} />
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="mt-5 space-y-3 md:hidden">
        {modoPendentes ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModoPendentes(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Pedidos Pendentes
            </h3>
          </div>
        ) : null}

        {otimizadoMobile &&
        !modoPendentes &&
        !carregando &&
        quantidadeProdutosPendentes > 0 ? (
          <button
            type="button"
            onClick={() => setModoPendentes(true)}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition active:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:active:bg-amber-950/60"
          >
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              {quantidadeProdutosPendentes}{" "}
              {quantidadeProdutosPendentes === 1 ? "produto" : "produtos"}{" "}
              aguardando aprovação
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-400">
              Inclui dias anteriores não aprovados. Toque para ver.
            </p>
          </button>
        ) : null}

        {carregando ? (
          <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Carregando histórico...
          </p>
        ) : null}

        {!carregando && linhasMobile.length === 0 ? (
          <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {modoPendentes
              ? "Nenhum pedido pendente aguardando aprovação."
              : "Nenhum lançamento encontrado para os filtros selecionados."}
          </p>
        ) : null}

        {!carregando
          ? linhasMobile.map((linha) => {
              const statusExibicao = resolverStatusExibicaoMobile(linha);

              return (
              <article
                key={linha.chave}
                className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {linha.numeroAmigavelRotulo ? (
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {linha.numeroAmigavelRotulo}
                        {linha.statusPedido
                          ? ` · ${linha.statusPedido.replaceAll("_", " ")}`
                          : ""}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatarDataBrasil(linha.data)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {linha.produtoNome}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{linha.loja}</p>
                  </div>
                  <BadgeStatus status={statusExibicao} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Estoque", valor: linha.contagemEstoque },
                    { label: "Avaria", valor: linha.avarias },
                    { label: "Pedido Solicitado", valor: linha.qtdSolicitada },
                    { label: "Pedido Atendido", valor: linha.qtdAtendida },
                    {
                      label: "Trocas Solicitadas",
                      valor: linha.trocasSolicitadas,
                    },
                    {
                      label: "Trocas Atendidas",
                      valor: linha.trocasAtendidas,
                    },
                    {
                      label: "Corte Pedido",
                      valor: linha.corte,
                    },
                    {
                      label: "Corte Troca",
                      valor: linha.corteTroca,
                    },
                  ].map((campo) => (
                    <div
                      key={campo.label}
                      className={classeCelulaHistoricoMobile}
                    >
                      <p className={classeLabelHistoricoMobile}>{campo.label}</p>
                      <p
                        className={`mt-1 text-base font-semibold ${
                          (campo.label === "Corte Pedido" ||
                            campo.label === "Corte Troca") &&
                          campo.valor > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        <CelulaNumerica valor={campo.valor} />
                      </p>
                    </div>
                  ))}
                </div>

                {linha.pedidoExtraSolicitado > 0 ? (
                  <div className="mt-4 rounded-xl border-2 border-green-500 bg-green-50/20 p-4 dark:border-green-600 dark:bg-green-950/30">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Pedido Extra
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={classeCelulaHistoricoMobile}>
                        <p className={classeLabelHistoricoMobile}>
                          Pedido Extra Solicitado
                        </p>
                        <p className={classeValorHistoricoMobile}>
                          <CelulaNumerica valor={linha.pedidoExtraSolicitado} />
                        </p>
                      </div>
                      <div className={classeCelulaHistoricoMobile}>
                        <p className={classeLabelHistoricoMobile}>
                          Pedido Extra Atendido
                        </p>
                        <p className={classeValorHistoricoMobile}>
                          <CelulaNumerica valor={linha.pedidoExtraAtendido} />
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {linha.qtdeTransf > 0 || linha.bonificacao > 0 ? (
                  <div className="mt-4 rounded-xl border-2 border-amber-600 bg-amber-50/20 p-4 dark:border-amber-500 dark:bg-amber-950/30">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Transferência Avulsa
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={classeCelulaHistoricoMobile}>
                        <p className={classeLabelHistoricoMobile}>Qtde Avulsa</p>
                        <p className={classeValorHistoricoMobile}>
                          <CelulaNumerica valor={linha.qtdeTransf} />
                        </p>
                      </div>
                      <div className={classeCelulaHistoricoMobile}>
                        <p className={classeLabelHistoricoMobile}>Bonificação</p>
                        <p className={classeValorHistoricoMobile}>
                          <CelulaNumerica valor={linha.bonificacao} />
                        </p>
                      </div>
                    </div>
                    {linha.motivo.trim() ? (
                      <div className={`mt-2 ${classeCelulaHistoricoMobile} text-xs`}>
                        <p className={classeLabelHistoricoMobile}>Motivo</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                          {linha.motivo}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={`mt-3 ${classePainelTotalHistoricoMobile}`}>
                  <p className={`text-xs font-medium ${classeLabelHistoricoMobile}`}>
                    Pedido Total
                  </p>
                  <ValorPedidoTotalHistorico
                    status={statusExibicao}
                    pedidoTotal={linha.pedidoTotal}
                  />
                </div>
              </article>
            );
            })
          : null}

        {!carregando && linhasMobile.length > 0 ? (
          <ResumoPeriodoMobile
            titulo={
              modoPendentes ? "Resumo dos Pendentes" : "Resumo do Período"
            }
            totais={
              modoPendentes
                ? otimizadoMobile
                  ? totaisPendentesMobileResumo
                  : calcularTotaisHistorico(linhasPendentesAgrupadas)
                : otimizadoMobile
                  ? totaisMobileResumo
                  : totais
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function LinhaHistorico({ linha }: { linha: LancamentoHistoricoAgrupado }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-3 py-3">
        <div className="font-semibold text-slate-800">
          {linha.numeroAmigavelRotulo ?? "—"}
        </div>
        {linha.statusPedido ? (
          <div className="text-xs text-slate-500">
            {linha.statusPedido.replaceAll("_", " ")}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-slate-700">
        {formatarDataBrasil(linha.data)}
      </td>
      <td className="px-3 py-3 font-medium text-slate-800">{linha.produtoNome}</td>
      <td className="px-3 py-3 text-slate-700">{linha.loja}</td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.contagemEstoque} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.qtdSolicitada} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.corte} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.qtdAtendida} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.avarias} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.trocasSolicitadas} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.corteTroca} />
      </td>
      <td className="px-3 py-3 text-center">
        <CelulaNumerica valor={linha.trocasAtendidas} />
      </td>
      <td
        className="px-3 py-3 text-center font-bold"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        {linha.status === "Aprovado" ? (
          <CelulaNumerica valor={linha.pedidoTotal} />
        ) : (
          <span className="font-bold text-amber-900">Aguardando Aprovação</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <BadgeStatus status={linha.status} />
      </td>
    </tr>
  );
}
