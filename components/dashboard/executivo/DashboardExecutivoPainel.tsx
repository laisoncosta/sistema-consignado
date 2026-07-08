"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  GitCompare,
  Loader2,
  Package,
  RefreshCw,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardChart } from "@/components/dashboard/executivo/DashboardChart";
import { InputDataBrasil } from "@/components/ui/InputDataBrasil";
import { useThemeAparencia } from "@/components/theme/ThemeProvider";
import {
  CORES_DASHBOARD,
  formatarDataCurta,
  opcoesBaseChart,
} from "@/components/dashboard/executivo/chart-theme";
import {
  DIAS_SEMANA,
  filtrosDashboardExecutivoIniciais,
  temaRegiaoExecutivo,
  type DashboardExecutivoPayload,
  type FiltrosDashboardExecutivo,
  type RegiaoDashboardExecutivo,
} from "@/lib/dashboard-executivo";
import {
  obterDataHojeBrasil,
  obterPrimeiroDiaMesBrasil,
} from "@/lib/data-brasil";

type AbaDashboard = "geral" | "tendencias" | "avarias";

const ABAS: Array<{ id: AbaDashboard; label: string; icon: typeof BarChart3 }> = [
  { id: "geral", label: "Visão Geral & Logística", icon: BarChart3 },
  { id: "tendencias", label: "Tendências & Estoque", icon: TrendingUp },
  { id: "avarias", label: "Análise Crítica de Avarias", icon: AlertTriangle },
];

const REGIOES: Array<{ value: RegiaoDashboardExecutivo; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "rio-branco", label: "Rio Branco" },
  { value: "manaus", label: "Manaus" },
];

function CardGrafico({
  titulo,
  subtitulo,
  children,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-sm ${className} border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {titulo}
        </h3>
        {subtitulo ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {subtitulo}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  titulo,
  valorPrincipal,
  valorSecundario,
  percentual,
  percentualDestaque,
  percentualCor = "text-slate-600 dark:text-slate-300",
  icone: Icone,
  accentClass,
  borderClass,
  barraProgresso,
}: {
  titulo: string;
  valorPrincipal: string | number;
  valorSecundario?: string;
  percentual?: string;
  percentualDestaque?: boolean;
  percentualCor?: string;
  icone: typeof Package;
  accentClass: string;
  borderClass: string;
  barraProgresso?: number;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm backdrop-blur-sm dark:bg-slate-900/70 dark:shadow-lg ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {titulo}
          </p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${accentClass}`}>
            {valorPrincipal}
          </p>
          {valorSecundario ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {valorSecundario}
            </p>
          ) : null}
          {percentual ? (
            <p
              className={`mt-2 text-lg font-bold tabular-nums ${
                percentualDestaque
                  ? "text-red-500 dark:text-red-400"
                  : percentualCor
              }`}
            >
              {percentual}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-50 dark:bg-slate-950/50 ${borderClass}`}
        >
          <Icone className={`h-5 w-5 ${accentClass}`} />
        </div>
      </div>
      {barraProgresso != null ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-rose-500 to-cyan-500 transition-all`}
            style={{ width: `${Math.min(100, Math.max(0, barraProgresso))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DashboardExecutivoPainel() {
  const hoje = obterDataHojeBrasil();
  const inicioMes = obterPrimeiroDiaMesBrasil();

  const [filtros, setFiltros] = useState<FiltrosDashboardExecutivo>(() =>
    filtrosDashboardExecutivoIniciais(inicioMes, hoje),
  );
  const [aba, setAba] = useState<AbaDashboard>("geral");
  const [dados, setDados] = useState<DashboardExecutivoPayload | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { theme: themeAparencia } = useThemeAparencia();
  const escuro = themeAparencia === "dark";

  const tema = useMemo(
    () => temaRegiaoExecutivo(filtros.regiao, filtros.compararRegioes),
    [filtros.regiao, filtros.compararRegioes],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams({
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        regiao: filtros.compararRegioes ? "todos" : filtros.regiao,
        compararRegioes: String(filtros.compararRegioes),
        ...(filtros.lojaId ? { lojaId: filtros.lojaId } : {}),
        ...(filtros.produtoId ? { produtoId: filtros.produtoId } : {}),
        ...(filtros.promotorId ? { promotorId: filtros.promotorId } : {}),
        ...(filtros.diaSemana ? { diaSemana: filtros.diaSemana } : {}),
      });

      const response = await fetch(`/api/dashboard/executivo?${params}`, {
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Erro ao carregar dashboard.");
      }

      setDados(json.dados as DashboardExecutivoPayload);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar dashboard.",
      );
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const baseChart = useMemo(() => opcoesBaseChart(escuro), [escuro]);
  const corPrimaria = tema.chartPrimary;
  const corSecundaria = tema.chartSecondary;

  const pctAtendimento =
    dados && dados.kpis.pedidosSolicitados > 0
      ? (dados.kpis.pedidosAtendidos / dados.kpis.pedidosSolicitados) * 100
      : 0;

  const pctTrocas =
    dados && dados.kpis.trocasSolicitadas > 0
      ? (dados.kpis.trocasAtendidas / dados.kpis.trocasSolicitadas) * 100
      : 0;

  return (
    <div className="min-h-full bg-[var(--background)] px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 2xl:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">
              Inteligência Comercial
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Dashboard Executivo de Pedidos Consignados
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${tema.border} bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800`}
          >
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </button>
        </div>

        {/* Região + Comparar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {REGIOES.map((regiao) => {
              const ativo =
                !filtros.compararRegioes && filtros.regiao === regiao.value;
              return (
                <button
                  key={regiao.value}
                  type="button"
                  onClick={() =>
                    setFiltros((atual) => ({
                      ...atual,
                      regiao: regiao.value,
                      compararRegioes: false,
                    }))
                  }
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                    ativo
                      ? `${tema.border} bg-slate-100 ${tema.accent} dark:bg-slate-800`
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {regiao.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setFiltros((atual) => ({
                ...atual,
                compararRegioes: !atual.compararRegioes,
                regiao: "todos",
              }))
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              filtros.compararRegioes
                ? "border-violet-400/40 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-400"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-slate-600"
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Comparar Regiões
          </button>
        </div>

        {/* Filtros segmentadores */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Data Início
              </span>
              <InputDataBrasil
                value={filtros.dataInicio}
                max={filtros.dataFim || hoje}
                onChange={(valor) =>
                  setFiltros((a) => ({ ...a, dataInicio: valor }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Data Fim
              </span>
              <InputDataBrasil
                value={filtros.dataFim}
                min={filtros.dataInicio}
                max={hoje}
                onChange={(valor) =>
                  setFiltros((a) => ({ ...a, dataFim: valor }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Dia da Semana
              </span>
              <select
                value={filtros.diaSemana}
                onChange={(e) =>
                  setFiltros((a) => ({ ...a, diaSemana: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {DIAS_SEMANA.map((dia) => (
                  <option key={dia.value || "todos"} value={dia.value}>
                    {dia.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Loja
              </span>
              <select
                value={filtros.lojaId}
                onChange={(e) =>
                  setFiltros((a) => ({ ...a, lojaId: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="">Todas</option>
                {dados?.opcoes.lojas.map((loja) => (
                  <option key={loja.id} value={String(loja.id)}>
                    {loja.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Produto
              </span>
              <select
                value={filtros.produtoId}
                onChange={(e) =>
                  setFiltros((a) => ({ ...a, produtoId: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="">Todos</option>
                {dados?.opcoes.produtos.map((produto) => (
                  <option key={produto.id} value={String(produto.id)}>
                    {produto.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Promotor
              </span>
              <select
                value={filtros.promotorId}
                onChange={(e) =>
                  setFiltros((a) => ({ ...a, promotorId: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="">Todos</option>
                {dados?.opcoes.promotores.map((promotor) => (
                  <option key={promotor.id} value={String(promotor.id)}>
                    {promotor.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {erro ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
            {erro}
          </div>
        ) : null}

        {carregando && !dados ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            Carregando indicadores...
          </div>
        ) : dados ? (
          <div key={themeAparencia}>
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                titulo="Pedidos Solicitados vs Atendidos"
                valorPrincipal={dados.kpis.pedidosSolicitados.toLocaleString("pt-BR")}
                valorSecundario={`Atendidos: ${dados.kpis.pedidosAtendidos.toLocaleString("pt-BR")}`}
                icone={Package}
                accentClass={tema.accent}
                borderClass={tema.border}
                barraProgresso={pctAtendimento}
              />
              <KpiCard
                titulo="Cortes & Taxa de Corte"
                valorPrincipal={dados.kpis.cortes.toLocaleString("pt-BR")}
                percentual={`${dados.kpis.taxaCorte.toFixed(1)}%`}
                icone={Scissors}
                accentClass={tema.accentMuted}
                borderClass={tema.border}
              />
              <KpiCard
                titulo="Avarias & Índice"
                valorPrincipal={dados.kpis.avarias.toLocaleString("pt-BR")}
                percentual={`${dados.kpis.indiceAvaria.toFixed(1)}%`}
                percentualDestaque
                icone={AlertTriangle}
                accentClass="text-red-400"
                borderClass="border-red-500/30"
              />
              <KpiCard
                titulo="Trocas Solicitadas vs Atendidas"
                valorPrincipal={dados.kpis.trocasSolicitadas.toLocaleString("pt-BR")}
                valorSecundario={`Atendidas: ${dados.kpis.trocasAtendidas.toLocaleString("pt-BR")}`}
                icone={RefreshCw}
                accentClass={tema.accent}
                borderClass={tema.border}
                barraProgresso={pctTrocas}
              />
              <KpiCard
                titulo="Taxa Trocas Atendidas"
                valorPrincipal={`${dados.kpis.taxaTrocasAtendidas.toFixed(1)}%`}
                icone={Activity}
                accentClass={tema.accent}
                borderClass={tema.border}
              />
            </div>

            {/* Abas */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 dark:border-slate-800">
              {ABAS.map((item) => {
                const Icone = item.icon;
                const ativo = aba === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAba(item.id)}
                    className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-semibold transition ${
                      ativo
                        ? `${tema.accent} border-b-2 border-current bg-slate-100 dark:bg-slate-900/60`
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                    }`}
                  >
                    <Icone className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {aba === "geral" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <CardGrafico titulo="Pedidos por Loja" subtitulo="Solicitado vs Atendido">
                  <DashboardChart
                    type="bar"
                    height={300}
                    series={[
                      { name: "Solicitado", data: dados.pedidosPorLoja.map((i) => i.valor) },
                      { name: "Atendido", data: dados.pedidosPorLoja.map((i) => i.valor2 ?? 0) },
                    ]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      plotOptions: { bar: { horizontal: true, barHeight: "65%" } },
                      colors: [corPrimaria, corSecundaria],
                      xaxis: { categories: dados.pedidosPorLoja.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Pedidos por Produto" subtitulo="Solicitado vs Atendido">
                  <DashboardChart
                    type="bar"
                    height={300}
                    series={[
                      { name: "Solicitado", data: dados.pedidosPorProduto.map((i) => i.valor) },
                      { name: "Atendido", data: dados.pedidosPorProduto.map((i) => i.valor2 ?? 0) },
                    ]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      plotOptions: { bar: { horizontal: true, barHeight: "65%" } },
                      colors: [corPrimaria, corSecundaria],
                      xaxis: { categories: dados.pedidosPorProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Cortes por Loja" subtitulo="Cortes vs Atendido">
                  <DashboardChart
                    type="bar"
                    height={280}
                    series={[
                      { name: "Cortes", data: dados.cortesPorLoja.map((i) => i.cortes) },
                      { name: "Atendido", data: dados.cortesPorLoja.map((i) => i.atendido) },
                    ]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar", stacked: false },
                      colors: ["#f59e0b", corSecundaria],
                      xaxis: { categories: dados.cortesPorLoja.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Cortes por Produto" subtitulo="Cortes vs Atendido">
                  <DashboardChart
                    type="bar"
                    height={280}
                    series={[
                      { name: "Cortes", data: dados.cortesPorProduto.map((i) => i.cortes) },
                      { name: "Atendido", data: dados.cortesPorProduto.map((i) => i.atendido) },
                    ]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      colors: ["#f59e0b", corSecundaria],
                      xaxis: { categories: dados.cortesPorProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Taxa de Cortes por Loja" subtitulo="% de perda">
                  <DashboardChart
                    type="bar"
                    height={260}
                    series={[{ name: "% Corte", data: dados.taxaCortePorLoja.map((i) => Number(i.percentual.toFixed(1))) }]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      plotOptions: { bar: { horizontal: true, barHeight: "60%" } },
                      colors: [corPrimaria],
                      xaxis: { categories: dados.taxaCortePorLoja.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Taxa de Cortes por Produto" subtitulo="% de perda">
                  <DashboardChart
                    type="bar"
                    height={260}
                    series={[{ name: "% Corte", data: dados.taxaCortePorProduto.map((i) => Number(i.percentual.toFixed(1))) }]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      plotOptions: { bar: { horizontal: true, barHeight: "60%" } },
                      colors: [corPrimaria],
                      xaxis: { categories: dados.taxaCortePorProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
              </div>
            ) : null}

            {aba === "tendencias" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <CardGrafico
                  titulo="Evolução Diária de Pedidos"
                  subtitulo={
                    filtros.compararRegioes
                      ? "Rio Branco vs Manaus"
                      : "Pedidos atendidos no período"
                  }
                  className="lg:col-span-2"
                >
                  <DashboardChart
                    type="area"
                    height={320}
                    series={
                      filtros.compararRegioes
                        ? [
                            {
                              name: "Rio Branco",
                              data: dados.evolucaoDiariaPedidosComparativo.map((i) => i.rioBranco),
                            },
                            {
                              name: "Manaus",
                              data: dados.evolucaoDiariaPedidosComparativo.map((i) => i.manaus),
                            },
                          ]
                        : [
                            {
                              name: "Solicitado",
                              data: dados.evolucaoDiariaPedidos.map((i) => i.valor),
                            },
                            {
                              name: "Atendido",
                              data: dados.evolucaoDiariaPedidos.map((i) => i.valor2 ?? 0),
                            },
                          ]
                    }
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "area" },
                      stroke: { curve: "smooth", width: 2 },
                      fill: {
                        type: "gradient",
                        gradient: {
                          shadeIntensity: 1,
                          opacityFrom: 0.45,
                          opacityTo: 0.05,
                        },
                      },
                      colors: filtros.compararRegioes
                        ? [CORES_DASHBOARD.rose, CORES_DASHBOARD.cyan]
                        : [corPrimaria, corSecundaria],
                      xaxis: {
                        categories: (filtros.compararRegioes
                          ? dados.evolucaoDiariaPedidosComparativo
                          : dados.evolucaoDiariaPedidos
                        ).map((i) => formatarDataCurta(i.data)),
                      },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Saída por Origem" subtitulo="Distribuição logística">
                  <DashboardChart
                    type="donut"
                    height={300}
                    series={dados.saidaPorOrigem.map((i) => i.valor)}
                    options={{
                      ...baseChart,
                      labels: dados.saidaPorOrigem.map((i) => i.label),
                      colors: [
                        corPrimaria,
                        corSecundaria,
                        CORES_DASHBOARD.violet,
                        CORES_DASHBOARD.emerald,
                        CORES_DASHBOARD.slate500,
                      ],
                      plotOptions: {
                        pie: { donut: { size: "68%" } },
                      },
                      legend: { position: "bottom" },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Pedidos por Dia da Semana">
                  <DashboardChart
                    type="bar"
                    height={300}
                    series={[{ name: "Pedidos", data: dados.pedidosPorDiaSemana.map((i) => i.valor) }]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      colors: [corPrimaria],
                      xaxis: { categories: dados.pedidosPorDiaSemana.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Estoque por Produto" className="lg:col-span-2">
                  <DashboardChart
                    type="bar"
                    height={280}
                    series={[{ name: "Estoque", data: dados.estoquePorProduto.map((i) => i.valor) }]}
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "bar" },
                      plotOptions: { bar: { horizontal: true, barHeight: "65%" } },
                      colors: [corSecundaria],
                      xaxis: { categories: dados.estoquePorProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
              </div>
            ) : null}

            {aba === "avarias" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <CardGrafico
                  titulo="Evolução Diária de Avarias"
                  className="lg:col-span-2"
                  subtitulo={
                    filtros.compararRegioes ? "Comparativo regional" : "Tendência no período"
                  }
                >
                  <DashboardChart
                    type="line"
                    height={300}
                    series={
                      filtros.compararRegioes
                        ? [
                            {
                              name: "Rio Branco",
                              data: dados.evolucaoDiariaAvariasComparativo.map((i) => i.rioBranco),
                            },
                            {
                              name: "Manaus",
                              data: dados.evolucaoDiariaAvariasComparativo.map((i) => i.manaus),
                            },
                          ]
                        : [
                            {
                              name: "Avarias",
                              data: dados.evolucaoDiariaAvarias.map((i) => i.valor),
                            },
                          ]
                    }
                    options={{
                      ...baseChart,
                      chart: { ...baseChart.chart, type: "line" },
                      stroke: { curve: "smooth", width: 3 },
                      colors: filtros.compararRegioes
                        ? [CORES_DASHBOARD.rose, CORES_DASHBOARD.cyan]
                        : [CORES_DASHBOARD.redNeon],
                      xaxis: {
                        categories: (filtros.compararRegioes
                          ? dados.evolucaoDiariaAvariasComparativo
                          : dados.evolucaoDiariaAvarias
                        ).map((i) => formatarDataCurta(i.data)),
                      },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Avarias por Loja">
                  <DashboardChart
                    type="bar"
                    height={280}
                    series={[{ name: "Avarias", data: dados.avariasPorLoja.map((i) => i.valor) }]}
                    options={{
                      ...baseChart,
                      plotOptions: { bar: { horizontal: true, barHeight: "60%" } },
                      colors: [CORES_DASHBOARD.redNeon],
                      xaxis: { categories: dados.avariasPorLoja.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Avarias por Produto">
                  <DashboardChart
                    type="bar"
                    height={280}
                    series={[{ name: "Avarias", data: dados.avariasPorProduto.map((i) => i.valor) }]}
                    options={{
                      ...baseChart,
                      plotOptions: { bar: { horizontal: true, barHeight: "60%" } },
                      colors: [CORES_DASHBOARD.redNeon],
                      xaxis: { categories: dados.avariasPorProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Top 5 — Índice de Avaria por Loja" subtitulo="Piores indicadores (%)">
                  <DashboardChart
                    type="bar"
                    height={260}
                    series={[{ name: "% Avaria", data: dados.top5IndiceAvariaLoja.map((i) => Number(i.percentual.toFixed(1))) }]}
                    options={{
                      ...baseChart,
                      plotOptions: { bar: { horizontal: true } },
                      colors: [CORES_DASHBOARD.rose],
                      xaxis: { categories: dados.top5IndiceAvariaLoja.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico titulo="Top 5 — Índice de Avaria por Produto" subtitulo="Piores indicadores (%)">
                  <DashboardChart
                    type="bar"
                    height={260}
                    series={[{ name: "% Avaria", data: dados.top5IndiceAvariaProduto.map((i) => Number(i.percentual.toFixed(1))) }]}
                    options={{
                      ...baseChart,
                      plotOptions: { bar: { horizontal: true } },
                      colors: [CORES_DASHBOARD.rose],
                      xaxis: { categories: dados.top5IndiceAvariaProduto.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
                <CardGrafico
                  titulo="Top 3 — Participação de Avarias por Promotor"
                  subtitulo="Ranking de performance crítica"
                  className="lg:col-span-2"
                >
                  <DashboardChart
                    type="bar"
                    height={240}
                    series={[{ name: "% Participação", data: dados.top3AvariaPromotor.map((i) => Number(i.percentual.toFixed(1))) }]}
                    options={{
                      ...baseChart,
                      colors: [CORES_DASHBOARD.roseLight],
                      xaxis: { categories: dados.top3AvariaPromotor.map((i) => i.label) },
                    }}
                  />
                </CardGrafico>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
