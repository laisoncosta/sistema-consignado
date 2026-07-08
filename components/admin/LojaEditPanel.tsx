"use client";

import { Loader2, Package, X } from "lucide-react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { LojaLocalizacaoCampos } from "@/components/admin/LojaLocalizacaoCampos";
import type { BrandTheme } from "@/lib/brands";
import {
  booleanParaStatusCercaLoja,
  type LojaCatalogoItem,
  type LojaEdicaoFormData,
  type ProdutoLojaVinculo,
  type RegiaoCatalogo,
} from "@/lib/admin-lojas";
import { ufPorNomeRegiao } from "@/lib/uf-regiao";

type LojaEditPanelProps = {
  aberto: boolean;
  loja: LojaCatalogoItem | null;
  regioes: RegiaoCatalogo[];
  brand: BrandTheme;
  salvando: boolean;
  erro: string | null;
  onFechar: () => void;
  onSalvar: (dados: LojaEdicaoFormData) => Promise<void>;
};

function dadosIniciais(loja: LojaCatalogoItem): LojaEdicaoFormData {
  return {
    codigo: loja.codigo,
    nome: loja.nome,
    regiaoId: loja.regiaoId,
    ativo: loja.ativo,
    cep: loja.cep ?? "",
    rua: loja.rua ?? "",
    numero: loja.numero ?? "",
    bairro: loja.bairro ?? "",
    cidade: loja.cidade ?? "",
    uf: ufPorNomeRegiao(loja.regiaoNome),
    latitude:
      loja.latitude !== null && loja.latitude !== undefined
        ? String(loja.latitude)
        : "",
    longitude:
      loja.longitude !== null && loja.longitude !== undefined
        ? String(loja.longitude)
        : "",
    cercaVirtualStatus: booleanParaStatusCercaLoja(loja.cercaVirtualAtiva),
    perimetro:
      loja.perimetroCerca > 0 ? String(loja.perimetroCerca) : "",
    produtosAtivos: [],
  };
}

export function LojaEditPanel({
  aberto,
  loja,
  regioes,
  brand,
  salvando,
  erro,
  onFechar,
  onSalvar,
}: LojaEditPanelProps) {
  const [formulario, setFormulario] = useState<LojaEdicaoFormData | null>(null);
  const [produtos, setProdutos] = useState<ProdutoLojaVinculo[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  useEffect(() => {
    if (!aberto || !loja) {
      setFormulario(null);
      return;
    }

    setFormulario(dadosIniciais(loja));
    setErroProdutos(null);
  }, [aberto, loja]);

  useEffect(() => {
    if (!aberto || !loja || !formulario) {
      return;
    }

    async function carregarProdutos() {
      if (!loja || !formulario) {
        return;
      }

      const regiaoFormularioId = formulario.regiaoId;

      setCarregandoProdutos(true);
      setErroProdutos(null);

      try {
        const response = await fetch(`/api/admin/lojas/${loja.id}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar os produtos.");
        }

        if (data.loja) {
          setFormulario((atual) =>
            atual ? { ...atual, ...dadosIniciais(data.loja) } : atual,
          );
        }

        const produtosCarregados = Array.isArray(data.produtos) ? data.produtos : [];
        const regiaoAtual = Number(data.loja?.regiaoId ?? regiaoFormularioId);

        if (regiaoAtual === regiaoFormularioId) {
          setProdutos(produtosCarregados);
          return;
        }

        const filtroRegiao =
          regioes.find((regiao) => regiao.id === regiaoFormularioId)?.nome ?? "";
        const slugRegiao = filtroRegiao.toLowerCase().includes("rio branco")
          ? "rio-branco"
          : "manaus";

        const produtosResponse = await fetch(
          `/api/admin/produtos?regiao=${slugRegiao}`,
          { credentials: "include" },
        );
        const produtosData = await produtosResponse.json();

        if (!produtosResponse.ok) {
          throw new Error(
            produtosData.error ?? "Não foi possível carregar os produtos.",
          );
        }

        setProdutos(
          (Array.isArray(produtosData.produtos) ? produtosData.produtos : []).map(
            (produto: { id: number; codigo: string; descricao: string }) => ({
              id: produto.id,
              codigo: produto.codigo,
              descricao: produto.descricao,
              ativoNaLoja: false,
            }),
          ),
        );
      } catch (error) {
        setProdutos([]);
        setErroProdutos(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os produtos.",
        );
      } finally {
        setCarregandoProdutos(false);
      }
    }

    void carregarProdutos();
  }, [aberto, loja, formulario?.regiaoId, regioes]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  function alternarProduto(produtoId: number) {
    setProdutos((atual) =>
      atual.map((produto) =>
        produto.id === produtoId
          ? { ...produto, ativoNaLoja: !produto.ativoNaLoja }
          : produto,
      ),
    );
  }

  function marcarTodosProdutos(ativo: boolean) {
    setProdutos((atual) =>
      atual.map((produto) => ({ ...produto, ativoNaLoja: ativo })),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formulario) {
      return;
    }

    await onSalvar({
      ...formulario,
      produtosAtivos: produtos
        .filter((produto) => produto.ativoNaLoja)
        .map((produto) => produto.id),
    });
  }

  if (!aberto || !loja || !formulario) {
    return null;
  }

  const cercaAtiva = formulario.cercaVirtualStatus === "ativar";
  const classeCampoCerca = cercaAtiva
    ? "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
    : "w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500";
  const classeCampoCercaMono = `${classeCampoCerca} font-mono`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: brand.primaryLight }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Edição
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-800">
                Editar Loja
              </h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-sm font-semibold text-slate-800">
                Dados da Loja
              </h3>

              <div>
                <label
                  htmlFor="editar-loja-codigo"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Código CISS
                </label>
                <input
                  id="editar-loja-codigo"
                  value={formulario.codigo}
                  onChange={(event) =>
                    setFormulario((atual) =>
                      atual ? { ...atual, codigo: event.target.value } : atual,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                  style={inputRingStyle}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="editar-loja-nome"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Nome da Loja
                </label>
                <input
                  id="editar-loja-nome"
                  value={formulario.nome}
                  onChange={(event) =>
                    setFormulario((atual) =>
                      atual ? { ...atual, nome: event.target.value } : atual,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                  style={inputRingStyle}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="editar-loja-regiao"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Região
                  </label>
                  <select
                    id="editar-loja-regiao"
                    value={formulario.regiaoId}
                    onChange={(event) =>
                      setFormulario((atual) =>
                        atual
                          ? { ...atual, regiaoId: Number(event.target.value) }
                          : atual,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                    style={inputRingStyle}
                    required
                  >
                    {regioes.map((regiao) => (
                      <option key={regiao.id} value={regiao.id}>
                        {regiao.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="editar-loja-status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Status
                  </label>
                  <select
                    id="editar-loja-status"
                    value={formulario.ativo ? "ativa" : "inativa"}
                    onChange={(event) =>
                      setFormulario((atual) =>
                        atual
                          ? { ...atual, ativo: event.target.value === "ativa" }
                          : atual,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                    style={inputRingStyle}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>
              </div>
            </div>

            <LojaLocalizacaoCampos
              idPrefix="editar-loja"
              brand={brand}
              regiaoNome={
                regioes.find((item) => item.id === formulario.regiaoId)?.nome ??
                loja.regiaoNome
              }
              valores={{
                cep: formulario.cep,
                rua: formulario.rua,
                numero: formulario.numero,
                bairro: formulario.bairro,
                cidade: formulario.cidade,
                uf: formulario.uf,
                latitude: formulario.latitude,
                longitude: formulario.longitude,
              }}
              onChange={(patch) =>
                setFormulario((atual) => (atual ? { ...atual, ...patch } : atual))
              }
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Parâmetro Cerca Virtual
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="editar-loja-cerca-status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Status da Cerca
                  </label>
                  <select
                    id="editar-loja-cerca-status"
                    value={formulario.cercaVirtualStatus}
                    onChange={(event) =>
                      setFormulario((atual) =>
                        atual
                          ? {
                              ...atual,
                              cercaVirtualStatus:
                                event.target.value === "ativar"
                                  ? "ativar"
                                  : "desativar",
                            }
                          : atual,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                    style={inputRingStyle}
                  >
                    <option value="desativar">Desativar</option>
                    <option value="ativar">Ativar</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="editar-loja-latitude"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Latitude
                    </label>
                    <input
                      id="editar-loja-latitude"
                      value={formulario.latitude}
                      disabled={!cercaAtiva}
                      onChange={(event) =>
                        setFormulario((atual) =>
                          atual
                            ? { ...atual, latitude: event.target.value }
                            : atual,
                        )
                      }
                      className={classeCampoCercaMono}
                      style={cercaAtiva ? inputRingStyle : undefined}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="editar-loja-longitude"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Longitude
                    </label>
                    <input
                      id="editar-loja-longitude"
                      value={formulario.longitude}
                      disabled={!cercaAtiva}
                      onChange={(event) =>
                        setFormulario((atual) =>
                          atual
                            ? { ...atual, longitude: event.target.value }
                            : atual,
                        )
                      }
                      className={classeCampoCercaMono}
                      style={cercaAtiva ? inputRingStyle : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="editar-loja-perimetro"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Perímetro (metros)
                  </label>
                  <input
                    id="editar-loja-perimetro"
                    type="number"
                    min={0}
                    step={1}
                    value={formulario.perimetro}
                    disabled={!cercaAtiva}
                    onChange={(event) =>
                      setFormulario((atual) =>
                        atual
                          ? { ...atual, perimetro: event.target.value }
                          : atual,
                      )
                    }
                    placeholder="Ex.: 100"
                    className={classeCampoCerca}
                    style={cercaAtiva ? inputRingStyle : undefined}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" style={{ color: brand.primary }} />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Ativar Produtos nesta Loja
                  </h3>
                </div>
                {produtos.length > 0 ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => marcarTodosProdutos(true)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodosProdutos(false)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Produtos disponíveis para a região selecionada. Marque os itens
                que devem estar ativos nesta loja.
              </p>

              {carregandoProdutos ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando produtos da região...
                </div>
              ) : erroProdutos ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroProdutos}
                </div>
              ) : produtos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum produto cadastrado para esta região.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {produtos.map((produto) => (
                    <label
                      key={produto.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={produto.ativoNaLoja}
                        onChange={() => alternarProduto(produto.id)}
                        className="h-4 w-4 rounded border-slate-300"
                        style={{ accentColor: brand.primary }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {produto.descricao}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {produto.codigo}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {erro ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onFechar}
                disabled={salvando}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-70"
                style={{ backgroundColor: brand.primary }}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar e Sair"
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
