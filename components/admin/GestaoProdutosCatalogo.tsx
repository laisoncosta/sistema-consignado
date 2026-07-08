"use client";

import { Loader2, PackageSearch, Pencil, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { ExcelImportExportBar } from "@/components/admin/ExcelImportExportBar";
import { ProdutoFormPanel } from "@/components/admin/ProdutoFormPanel";
import type { BrandTheme } from "@/lib/brands";
import { exportarPlanilhaXls } from "@/lib/excel-io";
import {
  formatarMoedaBrl,
  type FiltroCardProdutos,
  paramsApiFiltroCardProdutos,
  type ProdutoCatalogoItem,
  type ProdutoContadores,
  type ProdutoFormData,
  type RegiaoCatalogo,
} from "@/lib/admin-produtos";
import { gradienteCabecalhoPainelAdmin, gradienteCardRegiao } from "@/lib/painel-aparencia";
import { BRAND_MANAUS, BRAND_RIO_BRANCO } from "@/lib/identidade-gestao-lojas";

type GestaoProdutosCatalogoProps = {
  brand: BrandTheme;
};

const contadoresVazios: ProdutoContadores = {
  listados: 0,
  manaus: 0,
  rioBranco: 0,
  ativos: 0,
  inativos: 0,
};

const classeCabecalhoProduto =
  "border-b border-slate-200 px-6 py-3 dark:border-slate-600";
const classeCelulaProduto =
  "border-b border-slate-100 px-6 py-3 dark:border-slate-700";

function BadgeStatusProduto({ ativo }: { ativo: boolean }) {
  if (ativo) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
        Ativo
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      Inativo
    </span>
  );
}

function CardContagemProduto({
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

export function GestaoProdutosCatalogo({ brand }: GestaoProdutosCatalogoProps) {
  const [produtos, setProdutos] = useState<ProdutoCatalogoItem[]>([]);
  const [regioes, setRegioes] = useState<RegiaoCatalogo[]>([]);
  const [contadores, setContadores] = useState<ProdutoContadores>(contadoresVazios);
  const [filtroCard, setFiltroCard] = useState<FiltroCardProdutos>("listados");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [modoPainel, setModoPainel] = useState<"criar" | "editar">("criar");
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<ProdutoCatalogoItem | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [mensagemExcel, setMensagemExcel] = useState<string | null>(null);
  const [erroExcel, setErroExcel] = useState<string | null>(null);

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);

    try {
      const { regiao, status } = paramsApiFiltroCardProdutos(filtroCard);
      const params = new URLSearchParams({
        busca: buscaAplicada,
        regiao,
        status,
      });

      const response = await fetch(`/api/admin/produtos?${params.toString()}`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar os produtos.");
      }

      setProdutos(Array.isArray(data.produtos) ? data.produtos : []);
      setRegioes(Array.isArray(data.regioes) ? data.regioes : []);
      setContadores(data.contadores ?? contadoresVazios);
    } catch (error) {
      setErroLista(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os produtos.",
      );
      setProdutos([]);
      setContadores(contadoresVazios);
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, filtroCard]);

  function alternarFiltroCard(filtro: FiltroCardProdutos) {
    setFiltroCard((atual) => (atual === filtro ? "listados" : filtro));
  }

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  function abrirCadastro() {
    setModoPainel("criar");
    setProdutoEmEdicao(null);
    setErroFormulario(null);
    setPainelAberto(true);
  }

  function abrirEdicao(produto: ProdutoCatalogoItem) {
    setModoPainel("editar");
    setProdutoEmEdicao(produto);
    setErroFormulario(null);
    setPainelAberto(true);
  }

  function fecharPainel() {
    if (salvando) {
      return;
    }

    setPainelAberto(false);
    setProdutoEmEdicao(null);
    setErroFormulario(null);
  }

  async function salvarProduto(dados: ProdutoFormData) {
    setSalvando(true);
    setErroFormulario(null);

    try {
      const url =
        modoPainel === "editar" && produtoEmEdicao
          ? `/api/admin/produtos/${produtoEmEdicao.id}`
          : "/api/admin/produtos";

      const response = await fetch(url, {
        method: modoPainel === "editar" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o produto.");
      }

      setPainelAberto(false);
      setProdutoEmEdicao(null);
      await carregarProdutos();
    } catch (error) {
      setErroFormulario(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o produto.",
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
      const response = await fetch("/api/admin/produtos?regiao=todos&status=todos&busca=", {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível exportar os produtos.");
      }

      const itens = Array.isArray(data.produtos) ? data.produtos : [];

      exportarPlanilhaXls(
        itens.map((produto: ProdutoCatalogoItem) => ({
          "Código CISS": produto.codigo,
          Descrição: produto.descricao,
          Região: produto.regiaoRotulo,
          "Preço Unitário": produto.precoUnitario || "",
        })),
        "produtos.xls",
      );

      setMensagemExcel(`${itens.length} produto(s) exportado(s).`);
    } catch (error) {
      setErroExcel(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar os produtos.",
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

      const response = await fetch("/api/admin/produtos/import", {
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
      await carregarProdutos();
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
      <main className="mx-auto flex h-[calc(100svh-5.5rem)] w-full max-w-7xl flex-col px-6 py-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
          <div
            className="shrink-0 border-b px-6 py-3 sm:px-8"
            style={{
              borderColor: brand.primaryLight,
              background: gradienteCabecalhoPainelAdmin(brand.primaryLight),
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm dark:bg-slate-800/90">
                  <PackageSearch
                    className="h-3.5 w-3.5"
                    style={{ color: brand.primary }}
                  />
                  Administração
                </div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  Gestão do Catálogo de Produtos
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Cadastre, edite e organize o catálogo por região com controle de
                  status e preços unitários.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={abrirCadastro}
                  className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                  style={{ backgroundColor: brand.primary }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar
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
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <CardContagemProduto
                label="Produtos listados"
                valor={contadores.listados}
                cor={brand.primary}
                destacado={filtroCard === "listados"}
                onClick={() => alternarFiltroCard("listados")}
              />
              <CardContagemProduto
                label="Manaus - Viva"
                valor={contadores.manaus}
                cor={BRAND_MANAUS.primary}
                destacado={filtroCard === "manaus"}
                onClick={() => alternarFiltroCard("manaus")}
              />
              <CardContagemProduto
                label="Rio Branco - Buriti"
                valor={contadores.rioBranco}
                cor={BRAND_RIO_BRANCO.primary}
                destacado={filtroCard === "rio-branco"}
                onClick={() => alternarFiltroCard("rio-branco")}
              />
              <CardContagemProduto
                label="Produtos ativos"
                valor={contadores.ativos}
                cor="#059669"
                destacado={filtroCard === "ativos"}
                onClick={() => alternarFiltroCard("ativos")}
              />
              <CardContagemProduto
                label="Produtos inativos"
                valor={contadores.inativos}
                cor="#64748b"
                destacado={filtroCard === "inativos"}
                onClick={() => alternarFiltroCard("inativos")}
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
                  placeholder="Buscar por código ou nome do produto..."
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

          <div className="min-h-0 flex-1 overflow-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-3 px-8 py-16 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando catálogo...
              </div>
            ) : erroLista ? (
              <div className="px-8 py-16 text-center">
                <p className="text-sm text-red-600">{erroLista}</p>
                <button
                  type="button"
                  onClick={() => void carregarProdutos()}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Tentar novamente
                </button>
              </div>
            ) : produtos.length === 0 ? (
              <div className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                Nenhum produto encontrado para os filtros selecionados.
              </div>
            ) : (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_1px_0_0_rgb(51_65_85)]">
                  <tr>
                    <th className={`px-8 ${classeCabecalhoProduto}`}>Código / SKU</th>
                    <th className={`px-4 ${classeCabecalhoProduto}`}>Nome</th>
                    <th className={`px-4 ${classeCabecalhoProduto}`}>Região</th>
                    <th className={`px-4 ${classeCabecalhoProduto}`}>Preço Unitário</th>
                    <th className={`px-4 ${classeCabecalhoProduto}`}>Status</th>
                    <th className={`px-8 text-right ${classeCabecalhoProduto}`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((produto) => (
                    <tr
                      key={produto.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className={`px-8 font-semibold text-slate-800 dark:text-slate-100 ${classeCelulaProduto}`}>
                        {produto.codigo}
                      </td>
                      <td className={`px-4 text-slate-700 dark:text-slate-200 ${classeCelulaProduto}`}>
                        {produto.descricao}
                      </td>
                      <td className={`px-4 text-slate-600 dark:text-slate-300 ${classeCelulaProduto}`}>
                        {produto.regiaoRotulo}
                      </td>
                      <td className={`px-4 font-medium tabular-nums text-slate-800 dark:text-slate-100 ${classeCelulaProduto}`}>
                        {formatarMoedaBrl(produto.precoUnitario)}
                      </td>
                      <td className={`px-4 ${classeCelulaProduto}`}>
                        <BadgeStatusProduto ativo={produto.ativo} />
                      </td>
                      <td className={`px-8 text-right ${classeCelulaProduto}`}>
                        <button
                          type="button"
                          onClick={() => abrirEdicao(produto)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          aria-label={`Editar ${produto.descricao}`}
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

      <ProdutoFormPanel
        aberto={painelAberto}
        modo={modoPainel}
        produto={produtoEmEdicao}
        regioes={regioes}
        brand={brand}
        salvando={salvando}
        erro={erroFormulario}
        onFechar={fecharPainel}
        onSalvar={salvarProduto}
      />
    </>
  );
}
