"use client";

import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { PedidoRaioXModal } from "@/components/admin/PedidoRaioXModal";
import { DashboardChart } from "@/components/dashboard/executivo/DashboardChart";
import { InputDataBrasil } from "@/components/ui/InputDataBrasil";
import { useThemeAparencia } from "@/components/theme/ThemeProvider";
import { apiFetch } from "@/lib/api-client";
import { opcoesGraficoLinhaPainel } from "@/lib/chart-aparencia";
import { gradienteCabecalhoPainel } from "@/lib/painel-aparencia";
import { getBrandByRegiao, type BrandTheme } from "@/lib/brands";
import { obterDataHojeBrasil } from "@/lib/data-brasil";
import {
  pedidoEstaExcluido,
  rotuloStatusPedidoVisita,
} from "@/lib/pedido-numero-amigavel";
import {
  calcularSerieTempoPermanenciaPorDia,
  calcularTotaisRelatorioVisitas,
  filtrarRegistrosRelatorioVisitas,
  type AlertaCancelamentoVisita,
  type FiltroIntegridadeRelatorio,
  type FiltroRegiaoRelatorio,
  type RegistroRelatorioVisita,
} from "@/lib/relatorio-visitas";
import { ROLES, type UserRole } from "@/lib/rbac";

const ALERTAS_CANCELAMENTO: Record<
  AlertaCancelamentoVisita,
  { mensagem: string; usaIconeAlerta: boolean }
> = {
  nenhum: {
    mensagem: "Tem certeza que deseja excluir o Pedido {pedido}?",
    usaIconeAlerta: false,
  },
  parcial: {
    mensagem:
      "Esse pedido possuí um ou mais produtos aprovado na expedição, deseja continuar e cancelar o pedido ?",
    usaIconeAlerta: true,
  },
  critico: {
    mensagem:
      "Esse pedido ja foi 100% aprovado, certifique que os produtos não estão em rota de entrega, deseja continuar ?",
    usaIconeAlerta: true,
  },
};

type RelatorioVisitasPainelProps = {
  brand: BrandTheme;
  role: UserRole;
  regiaoUsuario?: string;
};

const IDENTIDADE_REGIAO_DIRETOR = {
  "rio-branco": {
    titulo: "Relatório de Visita Rio Branco",
    destaque: "#dc2626",
    destaqueLight: "rgba(220, 38, 38, 0.12)",
    botaoAtivo: "bg-red-600",
  },
  manaus: {
    titulo: "Relatório de Visita Manaus",
    destaque: "#047857",
    destaqueLight: "rgba(4, 120, 87, 0.12)",
    botaoAtivo: "bg-emerald-700",
  },
  todos: {
    titulo: "Relatório de Visita Todas as Regiões",
    destaque: "#dc2626",
    destaqueLight: "rgba(220, 38, 38, 0.12)",
    botaoAtivo: "bg-red-600",
  },
} as const;

const BOTOES_REGIAO_DIRETOR: Array<{
  value: FiltroRegiaoRelatorio;
  label: string;
}> = [
  { value: "rio-branco", label: "Rio Branco" },
  { value: "manaus", label: "Manaus" },
  { value: "todos", label: "Todas" },
];

function obterPrimeiroDiaMesAtual(): string {
  const hoje = obterDataHojeBrasil();
  const [ano, mes] = hoje.split("-");
  return `${ano}-${mes}-01`;
}

function FarolIntegridade({
  farol,
}: {
  farol: RegistroRelatorioVisita["farolIntegridade"];
}) {
  if (farol === "conforme") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <span aria-hidden="true">🟢</span>
        Conforme
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700">
      <span aria-hidden="true">🔴</span>
      Não Conforme
    </span>
  );
}

function montarOpcoesPromotor(registros: RegistroRelatorioVisita[]) {
  const mapa = new Map<string, string>();

  for (const registro of registros) {
    mapa.set(String(registro.promotorId), registro.promotorNome);
  }

  return [...mapa.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function montarOpcoesLoja(registros: RegistroRelatorioVisita[]) {
  const mapa = new Map<string, string>();

  for (const registro of registros) {
    mapa.set(String(registro.lojaId), registro.lojaRotulo);
  }

  return [...mapa.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function montarOpcoesIntegridade(registros: RegistroRelatorioVisita[]) {
  const opcoes: Array<{ value: FiltroIntegridadeRelatorio; label: string }> =
    [];

  if (registros.some((item) => item.farolIntegridade === "conforme")) {
    opcoes.push({ value: "conforme", label: "Conforme" });
  }

  if (registros.some((item) => item.farolIntegridade === "inconforme")) {
    opcoes.push({ value: "inconforme", label: "Não Conforme" });
  }

  return opcoes;
}

export function RelatorioVisitasPainel({
  brand,
  role,
  regiaoUsuario = "",
}: RelatorioVisitasPainelProps) {
  const exibirFiltroRegiao = role === ROLES.DIRETOR;
  const [dataInicial, setDataInicial] = useState(obterPrimeiroDiaMesAtual);
  const [dataFinal, setDataFinal] = useState(obterDataHojeBrasil);
  const [regiaoFiltro, setRegiaoFiltro] =
    useState<FiltroRegiaoRelatorio>("todos");
  const [promotorFiltro, setPromotorFiltro] = useState("");
  const [lojaFiltro, setLojaFiltro] = useState("");
  const [integridadeFiltro, setIntegridadeFiltro] =
    useState<FiltroIntegridadeRelatorio>("todos");
  const [registros, setRegistros] = useState<RegistroRelatorioVisita[]>([]);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({
    total: 0,
    totalPaginas: 1,
    temProxima: false,
    temAnterior: false,
    limite: 30,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [buscaPedido, setBuscaPedido] = useState("");
  const [buscaPedidoAberta, setBuscaPedidoAberta] = useState(false);
  const buscaPedidoRef = useRef<HTMLDivElement | null>(null);
  const [pedidoExclusao, setPedidoExclusao] =
    useState<RegistroRelatorioVisita | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [pedidoRestauracao, setPedidoRestauracao] =
    useState<RegistroRelatorioVisita | null>(null);
  const [motivoRestauracao, setMotivoRestauracao] = useState("");
  const [restaurando, setRestaurando] = useState(false);
  const [erroRestauracao, setErroRestauracao] = useState<string | null>(null);
  const [pedidoRaioXId, setPedidoRaioXId] = useState<number | null>(null);
  const podeGerenciarPedidos = role === ROLES.DIRETOR;
  const { theme: themeAparencia } = useThemeAparencia();
  const escuro = themeAparencia === "dark";

  const brandAtivo = useMemo(() => {
    if (!exibirFiltroRegiao) {
      return brand;
    }

    if (regiaoFiltro === "manaus") {
      return getBrandByRegiao("Manaus");
    }

    return getBrandByRegiao("Rio Branco");
  }, [brand, exibirFiltroRegiao, regiaoFiltro]);

  const identidadeRegiao = exibirFiltroRegiao
    ? IDENTIDADE_REGIAO_DIRETOR[regiaoFiltro]
    : null;

  const tituloPainel = identidadeRegiao?.titulo ?? "Relatório de Visita";
  const corDestaquePainel = identidadeRegiao?.destaque ?? brand.primary;
  const corDestaqueLightPainel =
    identidadeRegiao?.destaqueLight ?? brand.primaryLight;

  const inputRingStyle = {
    "--tw-ring-color": brandAtivo.primary,
  } as CSSProperties;
  const classeSelect =
    "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2";
  const classeLabel =
    "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  async function carregarRelatorio(paginaAlvo = pagina) {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams({
        dataInicial,
        dataFinal,
        pagina: String(paginaAlvo),
        limite: "30",
      });

      const response = await apiFetch(`/api/admin/relatorio-visitas?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao carregar relatório.");
      }

      setRegistros(Array.isArray(data.registros) ? data.registros : []);
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
      setRegistros([]);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o relatório de visitas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setPagina(1);
  }, [dataInicial, dataFinal]);

  useEffect(() => {
    void carregarRelatorio(pagina);
  }, [dataInicial, dataFinal, pagina]);

  const registrosNaTela = useMemo(
    () =>
      filtrarRegistrosRelatorioVisitas(registros, {
        regiao: exibirFiltroRegiao ? regiaoFiltro : undefined,
      }),
    [exibirFiltroRegiao, regiaoFiltro, registros],
  );

  const opcoesPromotor = useMemo(
    () => montarOpcoesPromotor(registrosNaTela),
    [registrosNaTela],
  );

  const opcoesLoja = useMemo(
    () => montarOpcoesLoja(registrosNaTela),
    [registrosNaTela],
  );

  const opcoesIntegridade = useMemo(
    () => montarOpcoesIntegridade(registrosNaTela),
    [registrosNaTela],
  );

  useEffect(() => {
    setPromotorFiltro("");
    setLojaFiltro("");
    setIntegridadeFiltro("todos");
  }, [regiaoFiltro, dataInicial, dataFinal]);

  useEffect(() => {
    if (
      promotorFiltro &&
      !opcoesPromotor.some((item) => item.value === promotorFiltro)
    ) {
      setPromotorFiltro("");
    }
  }, [opcoesPromotor, promotorFiltro]);

  useEffect(() => {
    if (lojaFiltro && !opcoesLoja.some((item) => item.value === lojaFiltro)) {
      setLojaFiltro("");
    }
  }, [lojaFiltro, opcoesLoja]);

  useEffect(() => {
    if (
      integridadeFiltro !== "todos" &&
      !opcoesIntegridade.some((item) => item.value === integridadeFiltro)
    ) {
      setIntegridadeFiltro("todos");
    }
  }, [integridadeFiltro, opcoesIntegridade]);

  const registrosFiltrados = useMemo(
    () =>
      filtrarRegistrosRelatorioVisitas(registrosNaTela, {
        promotorId: promotorFiltro || undefined,
        lojaId: lojaFiltro || undefined,
        integridade: integridadeFiltro,
        buscaPedido,
      }),
    [buscaPedido, integridadeFiltro, lojaFiltro, promotorFiltro, registrosNaTela],
  );

  const opcoesBuscaPedido = useMemo(() => {
    const termo = buscaPedido.trim().toLowerCase().replace(/^#/, "");

    return registrosNaTela
      .filter((registro) => {
        if (!termo) {
          return true;
        }

        const rotulo = registro.numeroAmigavelRotulo.toLowerCase().replace(/^#/, "");
        const numero = String(registro.numeroAmigavel);
        const loja = registro.lojaRotulo.toLowerCase();
        const promotor = registro.promotorNome.toLowerCase();

        return (
          rotulo.includes(termo) ||
          numero.includes(termo.replace(/\D/g, "")) ||
          loja.includes(termo) ||
          promotor.includes(termo)
        );
      })
      .slice(0, 30)
      .map((registro) => {
        const statusVisita = rotuloStatusPedidoVisita(registro.status);
        return {
          id: registro.id,
          numeroAmigavel: registro.numeroAmigavel,
          rotulo: registro.numeroAmigavelRotulo,
          detalhe: `${statusVisita.texto} · ${registro.lojaRotulo} · ${registro.promotorNome}`,
        };
      });
  }, [buscaPedido, registrosNaTela]);

  useEffect(() => {
    function fecharBuscaPedido(event: MouseEvent) {
      if (
        buscaPedidoRef.current &&
        !buscaPedidoRef.current.contains(event.target as Node)
      ) {
        setBuscaPedidoAberta(false);
      }
    }

    document.addEventListener("mousedown", fecharBuscaPedido);
    return () => document.removeEventListener("mousedown", fecharBuscaPedido);
  }, []);

  const totais = useMemo(
    () => calcularTotaisRelatorioVisitas(registrosFiltrados),
    [registrosFiltrados],
  );

  const serieTempoPorDia = useMemo(
    () =>
      calcularSerieTempoPermanenciaPorDia(
        registrosFiltrados,
        dataInicial,
        dataFinal,
      ),
    [dataFinal, dataInicial, registrosFiltrados],
  );

  function abrirExclusao(registro: RegistroRelatorioVisita) {
    setPedidoExclusao(registro);
    setMotivoExclusao("");
    setErroExclusao(null);
  }

  function fecharExclusao() {
    if (excluindo) {
      return;
    }

    setPedidoExclusao(null);
    setMotivoExclusao("");
    setErroExclusao(null);
  }

  const alertaExclusao = pedidoExclusao
    ? ALERTAS_CANCELAMENTO[pedidoExclusao.alertaCancelamento ?? "nenhum"]
    : null;

  const mensagemExclusao = alertaExclusao
    ? alertaExclusao.mensagem.replace(
        "{pedido}",
        pedidoExclusao?.numeroAmigavelRotulo ?? "",
      )
    : "";

  async function confirmarExclusao() {
    if (!pedidoExclusao || !motivoExclusao.trim()) {
      return;
    }

    setExcluindo(true);
    setErroExclusao(null);

    try {
      const response = await apiFetch(
        `/api/admin/pedidos/${pedidoExclusao.id}/excluir`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivoExclusao.trim() }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível excluir o pedido.");
      }

      setRegistros((atual) =>
        atual.map((item) =>
          item.id === pedidoExclusao.id
            ? {
                ...item,
                status: data.pedido?.status ?? "excluido",
              }
            : item,
        ),
      );
      setPedidoExclusao(null);
      setMotivoExclusao("");
    } catch (error) {
      setErroExclusao(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o pedido.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  function abrirRestauracao(registro: RegistroRelatorioVisita) {
    setPedidoRestauracao(registro);
    setMotivoRestauracao("");
    setErroRestauracao(null);
  }

  function fecharRestauracao() {
    if (restaurando) {
      return;
    }

    setPedidoRestauracao(null);
    setMotivoRestauracao("");
    setErroRestauracao(null);
  }

  async function confirmarRestauracao() {
    if (!pedidoRestauracao) {
      return;
    }

    setRestaurando(true);
    setErroRestauracao(null);

    try {
      const response = await apiFetch(
        `/api/admin/pedidos/${pedidoRestauracao.id}/restaurar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivoRestauracao.trim() }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível restaurar o pedido.");
      }

      setRegistros((atual) =>
        atual.map((item) =>
          item.id === pedidoRestauracao.id
            ? {
                ...item,
                status: data.pedido?.status ?? "AGUARDANDO_APROVACAO",
              }
            : item,
        ),
      );
      setPedidoRestauracao(null);
      setMotivoRestauracao("");
    } catch (error) {
      setErroRestauracao(
        error instanceof Error
          ? error.message
          : "Não foi possível restaurar o pedido.",
      );
    } finally {
      setRestaurando(false);
    }
  }

  const chartOptions = useMemo(
    () =>
      opcoesGraficoLinhaPainel({
        corPrimaria: brandAtivo.primary,
        categorias: serieTempoPorDia.map((ponto) => ponto.rotulo),
        escuro,
        formatarTooltip: (valor) => `${valor} min`,
      }),
    [brandAtivo.primary, escuro, serieTempoPorDia],
  );

  return (
    <main className="mx-auto w-full max-w-[95%] px-4 py-6 2xl:max-w-[1600px] lg:px-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className="border-b px-6 py-5 sm:px-8"
          style={{
            borderColor: corDestaqueLightPainel,
            background: gradienteCabecalhoPainel(corDestaqueLightPainel),
          }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <ClipboardList
              className="h-4 w-4"
              style={{ color: corDestaquePainel }}
            />
            Auditoria
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">{tituloPainel}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Auditoria de visita em loja
          </p>
          {!exibirFiltroRegiao && regiaoUsuario ? (
            <p
              className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: corDestaqueLightPainel,
                color: corDestaquePainel,
              }}
            >
              Região: {regiaoUsuario}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 p-3 sm:p-4">
        {exibirFiltroRegiao ? (
          <div className="flex flex-wrap items-center gap-3">
            {BOTOES_REGIAO_DIRETOR.map((opcao) => {
              const ativo = regiaoFiltro === opcao.value;
              const botaoAtivoClasse =
                opcao.value === "manaus"
                  ? IDENTIDADE_REGIAO_DIRETOR.manaus.botaoAtivo
                  : IDENTIDADE_REGIAO_DIRETOR["rio-branco"].botaoAtivo;

              return (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => setRegiaoFiltro(opcao.value)}
                  className={
                    ativo
                      ? `rounded-lg px-4 py-2 text-sm font-bold text-white shadow ${botaoAtivoClasse}`
                      : "rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }
                >
                  {opcao.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:items-end">
          <div>
            <label htmlFor="relatorio-data-inicial" className={classeLabel}>
              Data inicial
            </label>
            <InputDataBrasil
              id="relatorio-data-inicial"
              value={dataInicial}
              onChange={setDataInicial}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:ring-2"
              style={inputRingStyle}
            />
          </div>

          <div>
            <label htmlFor="relatorio-data-final" className={classeLabel}>
              Data final
            </label>
            <InputDataBrasil
              id="relatorio-data-final"
              value={dataFinal}
              onChange={setDataFinal}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:ring-2"
              style={inputRingStyle}
            />
          </div>

          {opcoesLoja.length > 0 ? (
            <div>
              <label htmlFor="relatorio-loja" className={classeLabel}>
                Loja
              </label>
              <select
                id="relatorio-loja"
                value={lojaFiltro}
                onChange={(event) => setLojaFiltro(event.target.value)}
                className={classeSelect}
                style={inputRingStyle}
              >
                <option value="">Todas</option>
                {opcoesLoja.map((loja) => (
                  <option key={loja.value} value={loja.value}>
                    {loja.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {opcoesPromotor.length > 0 ? (
            <div>
              <label htmlFor="relatorio-promotor" className={classeLabel}>
                Promotor
              </label>
              <select
                id="relatorio-promotor"
                value={promotorFiltro}
                onChange={(event) => setPromotorFiltro(event.target.value)}
                className={classeSelect}
                style={inputRingStyle}
              >
                <option value="">Todos</option>
                {opcoesPromotor.map((promotor) => (
                  <option key={promotor.value} value={promotor.value}>
                    {promotor.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {opcoesIntegridade.length > 0 ? (
            <div>
              <label htmlFor="relatorio-integridade" className={classeLabel}>
                Integridade
              </label>
              <select
                id="relatorio-integridade"
                value={integridadeFiltro}
                onChange={(event) =>
                  setIntegridadeFiltro(
                    event.target.value as FiltroIntegridadeRelatorio,
                  )
                }
                className={classeSelect}
                style={inputRingStyle}
              >
                <option value="todos">Todos</option>
                {opcoesIntegridade.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div ref={buscaPedidoRef} className="relative">
            <label htmlFor="relatorio-buscar-pedido" className={classeLabel}>
              Buscar Pedido
            </label>
            <div className="relative">
              <input
                id="relatorio-buscar-pedido"
                type="text"
                value={buscaPedido}
                onChange={(event) => {
                  setBuscaPedido(event.target.value);
                  setBuscaPedidoAberta(true);
                }}
                onFocus={() => setBuscaPedidoAberta(true)}
                placeholder="Digite ou selecione #0009"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-2.5 pr-8 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
              />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {buscaPedidoAberta ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setBuscaPedido("");
                    setBuscaPedidoAberta(false);
                  }}
                  className="flex w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  Todos os pedidos
                </button>
                {opcoesBuscaPedido.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    Nenhum pedido encontrado.
                  </p>
                ) : (
                  opcoesBuscaPedido.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => {
                        setBuscaPedido(opcao.rotulo);
                        setBuscaPedidoAberta(false);
                      }}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {opcao.rotulo}
                      </span>
                      <span className="text-xs text-slate-500">
                        {opcao.detalhe}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              onClick={() => void carregarRelatorio()}
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: corDestaquePainel }}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Total de Visitas
            </p>
            <p className="text-xl font-bold text-slate-900">{totais.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Conformes
            </p>
            <p className="text-xl font-bold text-emerald-800">
              {totais.conformes}
            </p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
              Inconformes
            </p>
            <p className="text-xl font-bold text-rose-800">
              {totais.inconformes}
            </p>
          </div>
        </div>

      {erro ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Tempo de Permanência em Loja por dia
        </h3>
        <div className="mt-1">
          {carregando ? (
            <div className="flex h-[140px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando gráfico...
            </div>
          ) : (
            <DashboardChart
              key={escuro ? "chart-escuro" : "chart-claro"}
              type="line"
              height={140}
              series={[
                {
                  name: "Tempo médio (min)",
                  data: serieTempoPorDia.map((ponto) => ponto.minutosMedios),
                },
              ]}
              options={chartOptions}
            />
          )}
        </div>
      </div>

      <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {carregando ? (
          <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando relatório...
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <p className="px-4 py-20 text-center text-sm text-slate-500">
            Nenhum atendimento encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">Pedido</th>
                  <th className="px-3 py-2.5">Data / Hora</th>
                  <th className="px-3 py-2.5">Promotor</th>
                  <th className="px-3 py-2.5">Loja</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Tempo em Loja</th>
                  <th className="px-3 py-2.5">Distância (m)</th>
                  <th className="px-3 py-2.5">Integridade</th>
                  {podeGerenciarPedidos ? (
                    <th className="px-3 py-2.5 text-right">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.map((registro) => {
                  const statusVisita = rotuloStatusPedidoVisita(registro.status);
                  const cancelado = pedidoEstaExcluido(registro.status);

                  return (
                  <tr
                    key={registro.id}
                    onClick={() => setPedidoRaioXId(registro.id)}
                    className={`cursor-pointer text-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800/80 ${cancelado ? "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">
                        {registro.numeroAmigavelRotulo}
                      </div>
                      <div
                        className={
                          statusVisita.cancelado
                            ? "text-xs font-bold uppercase tracking-wide text-rose-700"
                            : "text-xs text-slate-500"
                        }
                      >
                        {statusVisita.texto}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">
                        {registro.data}
                      </div>
                      <div className="text-xs text-slate-500">
                        {registro.horaEnvio}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">
                        {registro.promotorNome}
                      </div>
                      <div className="text-xs text-slate-500">
                        {registro.promotorEmail}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{registro.lojaRotulo}</div>
                      <div className="text-xs text-slate-500">
                        {registro.regiaoNome}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{registro.tipoLancamento}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {registro.tempoEmLoja}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {registro.distanciaLojaMetros != null
                        ? `${Math.round(registro.distanciaLojaMetros)} m`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <FarolIntegridade farol={registro.farolIntegridade} />
                    </td>
                    {podeGerenciarPedidos ? (
                      <td className="px-3 py-2.5 text-right">
                        {cancelado ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirRestauracao(registro);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                            aria-label={`Reativar pedido ${registro.numeroAmigavelRotulo}`}
                            title="Reativar pedido"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirExclusao(registro);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                            aria-label={`Excluir pedido ${registro.numeroAmigavelRotulo}`}
                            title="Excluir pedido"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!carregando && paginacao.total > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 pt-4 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Página {pagina} de {paginacao.totalPaginas} · {paginacao.total}{" "}
              registro(s)
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
      </div>
        </div>
      </section>

      {pedidoExclusao && alertaExclusao ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl ${
              pedidoExclusao.alertaCancelamento === "critico"
                ? "border-rose-300"
                : pedidoExclusao.alertaCancelamento === "parcial"
                  ? "border-amber-300"
                  : "border-slate-200"
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {alertaExclusao.usaIconeAlerta ? (
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                        pedidoExclusao.alertaCancelamento === "critico"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                      aria-hidden="true"
                    >
                      <AlertTriangle className="h-7 w-7" strokeWidth={2.25} />
                    </div>
                    <span
                      className={`text-lg font-bold uppercase tracking-wide ${
                        pedidoExclusao.alertaCancelamento === "critico"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}
                    >
                      ATENÇÃO
                    </span>
                  </div>
                ) : (
                  <h3 className="text-lg font-semibold text-slate-900">
                    Excluir pedido
                  </h3>
                )}
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {mensagemExclusao}
                </p>
                {pedidoExclusao.alertaCancelamento !== "nenhum" ? (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Pedido {pedidoExclusao.numeroAmigavelRotulo}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={fecharExclusao}
                disabled={excluindo}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="motivo-exclusao-pedido"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Motivo da Exclusão
            </label>
            <textarea
              id="motivo-exclusao-pedido"
              value={motivoExclusao}
              onChange={(event) => setMotivoExclusao(event.target.value)}
              rows={4}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
              style={inputRingStyle}
              disabled={excluindo}
            />

            {erroExclusao ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {erroExclusao}
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fecharExclusao}
                disabled={excluindo}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarExclusao()}
                disabled={excluindo || !motivoExclusao.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {excluindo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Confirmar exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PedidoRaioXModal
        pedidoId={pedidoRaioXId}
        brand={brandAtivo}
        onFechar={() => setPedidoRaioXId(null)}
      />

      {pedidoRestauracao ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Reativar pedido
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Deseja reativar o Pedido{" "}
                  {pedidoRestauracao.numeroAmigavelRotulo} e devolvê-lo para a
                  operação?
                </p>
              </div>
              <button
                type="button"
                onClick={fecharRestauracao}
                disabled={restaurando}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="motivo-restauracao-pedido"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Motivo da Reativação
            </label>
            <textarea
              id="motivo-restauracao-pedido"
              value={motivoRestauracao}
              onChange={(event) => setMotivoRestauracao(event.target.value)}
              rows={4}
              placeholder="Descreva o motivo da reativação..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
              style={inputRingStyle}
              disabled={restaurando}
            />

            {erroRestauracao ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {erroRestauracao}
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fecharRestauracao}
                disabled={restaurando}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarRestauracao()}
                disabled={restaurando || !motivoRestauracao.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {restaurando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reativando...
                  </>
                ) : (
                  "Confirmar reativação"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
