"use client";

import { Loader2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { OrigemFormPanel } from "@/components/admin/OrigemFormPanel";
import type { BrandTheme } from "@/lib/brands";
import {
  ABAS_REGIAO_ORIGEM,
  type FiltroRegiaoProduto,
  type OrigemCatalogoItem,
  type OrigemFormData,
  type RegiaoCatalogo,
} from "@/lib/admin-origens";
import { gradienteCabecalhoPainelAdmin } from "@/lib/painel-aparencia";

type GestaoOrigensCatalogoProps = {
  brand: BrandTheme;
};

export function GestaoOrigensCatalogo({ brand }: GestaoOrigensCatalogoProps) {
  const [origens, setOrigens] = useState<OrigemCatalogoItem[]>([]);
  const [regioes, setRegioes] = useState<RegiaoCatalogo[]>([]);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [regiaoFiltro, setRegiaoFiltro] = useState<FiltroRegiaoProduto>("todos");
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [modoPainel, setModoPainel] = useState<"criar" | "editar">("criar");
  const [origemEmEdicao, setOrigemEmEdicao] = useState<OrigemCatalogoItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  const carregarOrigens = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);

    try {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        regiao: regiaoFiltro,
      });

      const response = await fetch(`/api/admin/origens?${params.toString()}`, {
        credentials: "include",
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "Resposta inválida do servidor. Reinicie o servidor de desenvolvimento.",
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar as origens.");
      }

      setOrigens(Array.isArray(data.origens) ? data.origens : []);
      setRegioes(Array.isArray(data.regioes) ? data.regioes : []);
    } catch (error) {
      setErroLista(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as origens.",
      );
      setOrigens([]);
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, regiaoFiltro]);

  useEffect(() => {
    void carregarOrigens();
  }, [carregarOrigens]);

  const contadores = useMemo(() => {
    const manaus = origens.filter((origem) =>
      origem.regiaoNome.toLowerCase().includes("manaus"),
    ).length;
    const rioBranco = origens.filter((origem) =>
      origem.regiaoNome.toLowerCase().includes("rio branco"),
    ).length;

    return { total: origens.length, manaus, rioBranco };
  }, [origens]);

  function abrirCadastro() {
    if (regioes.length === 0) {
      setErroLista("Aguarde o carregamento das regiões para cadastrar.");
      return;
    }

    setModoPainel("criar");
    setOrigemEmEdicao(null);
    setErroFormulario(null);
    setPainelAberto(true);
  }

  function abrirEdicao(origem: OrigemCatalogoItem) {
    setModoPainel("editar");
    setOrigemEmEdicao(origem);
    setErroFormulario(null);
    setPainelAberto(true);
  }

  function fecharPainel() {
    if (salvando) {
      return;
    }

    setPainelAberto(false);
    setOrigemEmEdicao(null);
    setErroFormulario(null);
  }

  async function salvarOrigem(dados: OrigemFormData) {
    setSalvando(true);
    setErroFormulario(null);

    try {
      const url =
        modoPainel === "editar" && origemEmEdicao
          ? `/api/admin/origens/${origemEmEdicao.id}`
          : "/api/admin/origens";

      const response = await fetch(url, {
        method: modoPainel === "editar" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar a origem.");
      }

      setPainelAberto(false);
      setOrigemEmEdicao(null);
      await carregarOrigens();
    } catch (error) {
      setErroFormulario(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a origem.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirOrigem(origem: OrigemCatalogoItem) {
    const confirmado = window.confirm(
      `Deseja excluir a origem "${origem.nome}" (${origem.regiaoRotulo})?`,
    );

    if (!confirmado) {
      return;
    }

    setExcluindoId(origem.id);
    setErroExclusao(null);

    try {
      const response = await fetch(`/api/admin/origens/${origem.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível excluir a origem.");
      }

      await carregarOrigens();
    } catch (error) {
      setErroExclusao(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a origem.",
      );
    } finally {
      setExcluindoId(null);
    }
  }

  function aplicarBusca(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuscaAplicada(busca.trim());
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div
            className="border-b px-8 py-8"
            style={{
              borderColor: brand.primaryLight,
              background: gradienteCabecalhoPainelAdmin(brand.primaryLight),
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                  <MapPin className="h-4 w-4" style={{ color: brand.primary }} />
                  Administração
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-800">
                  Cadastro de Origens
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Gerencie as origens de produtos por região, utilizadas nas
                  transferências e movimentações do sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={abrirCadastro}
                disabled={carregando || regioes.length === 0}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: brand.primary }}
              >
                <Plus className="h-4 w-4" />
                Cadastrar origem
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                {contadores.total} origem(ns) listada(s)
              </span>
              <span className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                {contadores.manaus} em Manaus
              </span>
              <span className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                {contadores.rioBranco} em Rio Branco
              </span>
            </div>
          </div>

          <div className="space-y-5 border-b border-slate-200 px-8 py-6">
            <form
              onSubmit={aplicarBusca}
              className="flex flex-col gap-3 lg:flex-row lg:items-center"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por nome da origem..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                  style={inputRingStyle}
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {ABAS_REGIAO_ORIGEM.map((aba) => {
                const ativa = regiaoFiltro === aba.id;

                return (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setRegiaoFiltro(aba.id)}
                    className="rounded-full px-4 py-2 text-sm font-medium transition"
                    style={
                      ativa
                        ? { backgroundColor: brand.primary, color: "#fff" }
                        : { backgroundColor: "#f8fafc", color: "#475569" }
                    }
                  >
                    {aba.label}
                  </button>
                );
              })}
            </div>
          </div>

          {erroExclusao ? (
            <div className="border-b border-red-100 bg-red-50 px-8 py-3 text-sm text-red-700">
              {erroExclusao}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-3 px-8 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando origens...
              </div>
            ) : erroLista ? (
              <div className="px-8 py-16 text-center">
                <p className="text-sm text-red-600">{erroLista}</p>
                <button
                  type="button"
                  onClick={() => void carregarOrigens()}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Tentar novamente
                </button>
              </div>
            ) : origens.length === 0 ? (
              <div className="px-8 py-16 text-center text-slate-500">
                Nenhuma origem encontrada para os filtros selecionados.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-8 py-4">Nome</th>
                    <th className="px-4 py-4">Região</th>
                    <th className="px-8 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {origens.map((origem) => (
                    <tr
                      key={origem.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-8 py-4 font-semibold text-slate-800">
                        {origem.nome}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {origem.regiaoRotulo}
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(origem)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            aria-label={`Editar ${origem.nome}`}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void excluirOrigem(origem)}
                            disabled={excluindoId === origem.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                            aria-label={`Excluir ${origem.nome}`}
                          >
                            {excluindoId === origem.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <OrigemFormPanel
        aberto={painelAberto}
        modo={modoPainel}
        origem={origemEmEdicao}
        regioes={regioes}
        brand={brand}
        salvando={salvando}
        erro={erroFormulario}
        onFechar={fecharPainel}
        onSalvar={salvarOrigem}
      />
    </>
  );
}
