"use client";

import { Loader2, Pencil, Plus, Search, Store } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { ExcelImportExportBar } from "@/components/admin/ExcelImportExportBar";
import { LojaCadastroPanel } from "@/components/admin/LojaCadastroPanel";
import { LojaEditPanel } from "@/components/admin/LojaEditPanel";
import { useDashboardHeader } from "@/components/dashboard/DashboardHeaderContext";
import {
  gradienteCabecalhoPainelAdmin,
  gradienteCardRegiao,
} from "@/lib/painel-aparencia";
import { exportarPlanilhaXls } from "@/lib/excel-io";
import {
  type FiltroCardLojas,
  paramsApiFiltroCardLojas,
  type LojaCadastroFormData,
  type LojaCatalogoItem,
  type LojaContadores,
  type LojaEdicaoFormData,
  type RegiaoCatalogo,
} from "@/lib/admin-lojas";
import {
  BRAND_MANAUS,
  BRAND_RIO_BRANCO,
  brandPorFiltroLoja,
  tituloGestaoLojas,
  tituloRegiaoHeader,
} from "@/lib/identidade-gestao-lojas";

type GestaoLojasCatalogoProps = {
  acessoGlobal?: boolean;
};

const contadoresVazios: LojaContadores = {
  total: 0,
  manaus: 0,
  rioBranco: 0,
  ativas: 0,
};

const classeCabecalhoLoja =
  "border-b border-slate-200 py-4 dark:border-slate-600";
const classeCelulaLoja =
  "border-b border-slate-100 py-4 dark:border-slate-700";

function BadgeStatusLoja({ ativo }: { ativo: boolean }) {
  if (ativo) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        Ativa
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
      Inativa
    </span>
  );
}

function CardContagemLoja({
  label,
  valor,
  cor,
  destacado = false,
  onClick,
}: {
  label: string;
  valor: number;
  cor: string;
  destacado?: boolean;
  onClick?: () => void;
}) {
  const className = `w-full rounded-2xl border px-3 py-2.5 text-left shadow-sm transition ${
    destacado ? "ring-2 ring-inset" : ""
  } ${onClick ? "cursor-pointer hover:brightness-[0.98] active:scale-[0.99]" : ""}`;

  const conteudo = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-bold tracking-tight"
        style={{ color: cor }}
      >
        {valor}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={destacado}
        className={className}
        style={{
          borderColor: `${cor}33`,
          background: gradienteCardRegiao(cor),
          ...(destacado ? { ringColor: `${cor}55` } : {}),
        }}
      >
        {conteudo}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={{
        borderColor: `${cor}33`,
        background: gradienteCardRegiao(cor),
        ...(destacado ? { ringColor: `${cor}55` } : {}),
      }}
    >
      {conteudo}
    </div>
  );
}

export function GestaoLojasCatalogo({
  acessoGlobal = false,
}: GestaoLojasCatalogoProps) {
  const headerContext = useDashboardHeader();
  const [lojas, setLojas] = useState<LojaCatalogoItem[]>([]);
  const [regioes, setRegioes] = useState<RegiaoCatalogo[]>([]);
  const [contadores, setContadores] = useState<LojaContadores>(contadoresVazios);
  const [filtroCard, setFiltroCard] = useState<FiltroCardLojas>("total");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [painelCadastroAberto, setPainelCadastroAberto] = useState(false);
  const [painelEdicaoAberto, setPainelEdicaoAberto] = useState(false);
  const [lojaEmEdicao, setLojaEmEdicao] = useState<LojaCatalogoItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [mensagemExcel, setMensagemExcel] = useState<string | null>(null);
  const [erroExcel, setErroExcel] = useState<string | null>(null);

  const { regiao: regiaoFiltro } = paramsApiFiltroCardLojas(filtroCard);

  const brand = useMemo(
    () => brandPorFiltroLoja(regiaoFiltro),
    [regiaoFiltro],
  );

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;
  const tituloPainel = tituloGestaoLojas(regiaoFiltro);

  useEffect(() => {
    if (!headerContext) {
      return;
    }

    headerContext.setHeaderState({
      brandAtivo: brand,
      tituloRegiao: tituloRegiaoHeader(regiaoFiltro),
    });
  }, [brand, headerContext, regiaoFiltro]);

  useEffect(() => {
    return () => {
      headerContext?.resetHeaderState();
    };
  }, [headerContext]);

  const carregarLojas = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);

    try {
      const { regiao, status } = paramsApiFiltroCardLojas(filtroCard);
      const params = new URLSearchParams({
        busca: buscaAplicada,
        regiao,
        status,
      });

      const response = await fetch(`/api/admin/lojas?${params.toString()}`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar as lojas.");
      }

      setLojas(Array.isArray(data.lojas) ? data.lojas : []);
      setRegioes(Array.isArray(data.regioes) ? data.regioes : []);
      setContadores(data.contadores ?? contadoresVazios);
    } catch (error) {
      setErroLista(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as lojas.",
      );
      setLojas([]);
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, filtroCard]);

  function alternarFiltroCard(filtro: FiltroCardLojas) {
    setFiltroCard((atual) => (atual === filtro ? "total" : filtro));
  }

  useEffect(() => {
    void carregarLojas();
  }, [carregarLojas]);

  function abrirCadastro() {
    setErroFormulario(null);
    setPainelCadastroAberto(true);
  }

  function abrirEdicao(loja: LojaCatalogoItem) {
    setLojaEmEdicao(loja);
    setErroFormulario(null);
    setPainelEdicaoAberto(true);
  }

  function fecharCadastro() {
    if (salvando) {
      return;
    }

    setPainelCadastroAberto(false);
    setErroFormulario(null);
  }

  function fecharEdicao() {
    if (salvando) {
      return;
    }

    setPainelEdicaoAberto(false);
    setLojaEmEdicao(null);
    setErroFormulario(null);
  }

  async function salvarCadastro(dados: LojaCadastroFormData) {
    setSalvando(true);
    setErroFormulario(null);

    try {
      const response = await fetch("/api/admin/lojas", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível cadastrar a loja.");
      }

      setPainelCadastroAberto(false);
      await carregarLojas();
    } catch (error) {
      setErroFormulario(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a loja.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(dados: LojaEdicaoFormData) {
    if (!lojaEmEdicao) {
      return;
    }

    setSalvando(true);
    setErroFormulario(null);

    try {
      const response = await fetch(`/api/admin/lojas/${lojaEmEdicao.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar a loja.");
      }

      setPainelEdicaoAberto(false);
      setLojaEmEdicao(null);
      await carregarLojas();
    } catch (error) {
      setErroFormulario(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a loja.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function aplicarBusca(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuscaAplicada(busca.trim());
  }

  async function exportarExcel() {
    setExportandoExcel(true);
    setErroExcel(null);
    setMensagemExcel(null);

    try {
      const response = await fetch("/api/admin/lojas?regiao=todos&busca=", {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível exportar as lojas.");
      }

      const itens = Array.isArray(data.lojas) ? data.lojas : [];

      exportarPlanilhaXls(
        itens.map((loja: LojaCatalogoItem) => ({
          "Código CISS": loja.codigo,
          Descrição: loja.nome,
          Região: loja.regiaoRotulo,
          CEP: loja.cep ?? "",
        })),
        "lojas.xls",
      );

      setMensagemExcel(`${itens.length} loja(s) exportada(s).`);
    } catch (error) {
      setErroExcel(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar as lojas.",
      );
    } finally {
      setExportandoExcel(false);
    }
  }

  async function importarExcel(arquivo: File) {
    setImportandoExcel(true);
    setErroExcel(null);
    setMensagemExcel(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const response = await fetch("/api/admin/lojas/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível importar a planilha.");
      }

      const avisos =
        Array.isArray(data.erros) && data.erros.length > 0
          ? ` Avisos: ${data.erros.slice(0, 3).join(" ")}`
          : "";

      setMensagemExcel(`${data.mensagem ?? "Importação concluída."}${avisos}`);
      await carregarLojas();
    } catch (error) {
      setErroExcel(
        error instanceof Error
          ? error.message
          : "Não foi possível importar a planilha.",
      );
    } finally {
      setImportandoExcel(false);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-6 py-3">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
          <div
            className="shrink-0 border-b px-8 py-8"
            style={{
              borderColor: brand.primaryLight,
              background: gradienteCabecalhoPainelAdmin(brand.primaryLight),
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div
                  className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm"
                  style={{ color: brand.primary }}
                >
                  <Store className="h-4 w-4" />
                  Administração
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                  {tituloPainel}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Cadastre, edite e organize as lojas por região, com localização
                  para cerca virtual e vínculo de produtos.
                  {acessoGlobal ? " Selecione a região para aplicar a identidade visual correspondente." : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={abrirCadastro}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                  style={{ backgroundColor: brand.primary }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar loja
                </button>

                <ExcelImportExportBar
                  brand={brand}
                  exportando={exportandoExcel}
                  importando={importandoExcel}
                  mensagem={mensagemExcel}
                  erro={erroExcel}
                  onExportar={exportarExcel}
                  onImportar={importarExcel}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-b border-slate-200 px-6 py-3 dark:border-slate-700 sm:px-8">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <CardContagemLoja
                label="Total de lojas"
                valor={contadores.total}
                cor={brand.primary}
                destacado={filtroCard === "total"}
                onClick={() => alternarFiltroCard("total")}
              />
              <CardContagemLoja
                label="Manaus - Viva"
                valor={contadores.manaus}
                cor={BRAND_MANAUS.primary}
                destacado={filtroCard === "manaus"}
                onClick={() => alternarFiltroCard("manaus")}
              />
              <CardContagemLoja
                label="Rio Branco - Buriti"
                valor={contadores.rioBranco}
                cor={BRAND_RIO_BRANCO.primary}
                destacado={filtroCard === "rio-branco"}
                onClick={() => alternarFiltroCard("rio-branco")}
              />
              <CardContagemLoja
                label="Ativas na listagem"
                valor={contadores.ativas}
                cor="#0f766e"
                destacado={filtroCard === "ativas"}
                onClick={() => alternarFiltroCard("ativas")}
              />
            </div>

            <form
              onSubmit={aplicarBusca}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por código CISS ou nome da loja..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  style={inputRingStyle}
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-3 px-8 py-16 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando lojas...
              </div>
            ) : erroLista ? (
              <div className="px-8 py-16 text-center">
                <p className="text-sm text-red-600">{erroLista}</p>
                <button
                  type="button"
                  onClick={() => void carregarLojas()}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Tentar novamente
                </button>
              </div>
            ) : lojas.length === 0 ? (
              <div className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                Nenhuma loja encontrada para os filtros selecionados.
              </div>
            ) : (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_1px_0_0_rgb(51_65_85)]">
                  <tr>
                    <th className={`px-8 ${classeCabecalhoLoja}`}>Código CISS</th>
                    <th className={`px-4 ${classeCabecalhoLoja}`}>Nome da Loja</th>
                    <th className={`px-4 ${classeCabecalhoLoja}`}>Região</th>
                    <th className={`px-4 ${classeCabecalhoLoja}`}>Status</th>
                    <th className={`px-8 text-right ${classeCabecalhoLoja}`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lojas.map((loja) => (
                    <tr
                      key={loja.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className={`px-8 font-mono font-semibold text-slate-800 dark:text-slate-100 ${classeCelulaLoja}`}>
                        {loja.codigo}
                      </td>
                      <td className={`px-4 font-medium text-slate-800 dark:text-slate-100 ${classeCelulaLoja}`}>
                        {loja.nome}
                      </td>
                      <td className={`px-4 text-slate-600 dark:text-slate-300 ${classeCelulaLoja}`}>
                        {loja.regiaoRotulo}
                      </td>
                      <td className={`px-4 ${classeCelulaLoja}`}>
                        <BadgeStatusLoja ativo={loja.ativo} />
                      </td>
                      <td className={`px-8 text-right ${classeCelulaLoja}`}>
                        <button
                          type="button"
                          onClick={() => abrirEdicao(loja)}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium transition hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                          style={{
                            borderColor: `${brand.primary}44`,
                            color: brand.primary,
                          }}
                          aria-label={`Editar ${loja.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <LojaCadastroPanel
        aberto={painelCadastroAberto}
        regioes={regioes}
        brand={brand}
        salvando={salvando}
        erro={erroFormulario}
        onFechar={fecharCadastro}
        onSalvar={salvarCadastro}
      />

      <LojaEditPanel
        aberto={painelEdicaoAberto}
        loja={lojaEmEdicao}
        regioes={regioes}
        brand={brand}
        salvando={salvando}
        erro={erroFormulario}
        onFechar={fecharEdicao}
        onSalvar={salvarEdicao}
      />
    </>
  );
}
