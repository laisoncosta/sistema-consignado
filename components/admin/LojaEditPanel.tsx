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
  classeBotaoFecharPainel,
  classeBotaoMarcarTodos,
  classeBotaoSecundario,
  classeCabecalhoPainel,
  classeErroFormulario,
  classeInput,
  classeInputDesabilitado,
  classeItemCheckbox,
  classeLabelCampo,
  classePainelLateral,
  classeRodapePainel,
  classeSecaoFormulario,
  classeSecaoFormularioCompacta,
  classeSubtituloPainel,
  classeTextoAuxiliar,
  classeTextoItemCheckbox,
  classeTituloPainel,
  classeTituloSecao,
  classeVazioTracejado,
} from "@/lib/form-aparencia";
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
  const classeCampoCerca = cercaAtiva ? classeInput : classeInputDesabilitado;
  const classeCampoCercaMono = `${classeCampoCerca} font-mono`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      <aside className={classePainelLateral}>
        <div
          className={classeCabecalhoPainel}
          style={{ borderColor: brand.primaryLight }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={classeSubtituloPainel}>
                Edição
              </p>
              <h2 className={classeTituloPainel}>
                Editar Loja
              </h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className={classeBotaoFecharPainel}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className={classeSecaoFormulario}>
              <h3 className={classeTituloSecao}>
                Dados da Loja
              </h3>

              <div>
                <label
                  htmlFor="editar-loja-codigo"
                  className={classeLabelCampo}
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
                  className={`${classeInput} font-mono`}
                  style={inputRingStyle}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="editar-loja-nome"
                  className={classeLabelCampo}
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
                  className={classeInput}
                  style={inputRingStyle}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="editar-loja-regiao"
                    className={classeLabelCampo}
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
                    className={classeInput}
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
                    className={classeLabelCampo}
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
                    className={classeInput}
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

            <div className={classeSecaoFormularioCompacta}>
              <h3 className={`${classeTituloSecao} mb-4`}>
                Parâmetro Cerca Virtual
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="editar-loja-cerca-status"
                    className={classeLabelCampo}
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
                    className={classeInput}
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
                      className={classeLabelCampo}
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
                      className={classeLabelCampo}
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
                    className={classeLabelCampo}
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

            <div className={`${classeSecaoFormularioCompacta} bg-[var(--surface)]`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" style={{ color: brand.primary }} />
                  <h3 className={classeTituloSecao}>
                    Ativar Produtos nesta Loja
                  </h3>
                </div>
                {produtos.length > 0 ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => marcarTodosProdutos(true)}
                      className={classeBotaoMarcarTodos}
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodosProdutos(false)}
                      className={classeBotaoMarcarTodos}
                    >
                      Desmarcar todos
                    </button>
                  </div>
                ) : null}
              </div>
              <p className={`mb-4 ${classeTextoAuxiliar}`}>
                Produtos disponíveis para a região selecionada. Marque os itens
                que devem estar ativos nesta loja.
              </p>

              {carregandoProdutos ? (
                <div className={`flex items-center justify-center gap-2 py-10 text-sm ${classeTextoAuxiliar}`}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando produtos da região...
                </div>
              ) : erroProdutos ? (
                <div className={classeErroFormulario}>
                  {erroProdutos}
                </div>
              ) : produtos.length === 0 ? (
                <div className={classeVazioTracejado}>
                  Nenhum produto cadastrado para esta região.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {produtos.map((produto) => (
                    <label
                      key={produto.id}
                      className={classeItemCheckbox}
                    >
                      <input
                        type="checkbox"
                        checked={produto.ativoNaLoja}
                        onChange={() => alternarProduto(produto.id)}
                        className="h-4 w-4 rounded border-[var(--border)]"
                        style={{ accentColor: brand.primary }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={classeTextoItemCheckbox}>
                          {produto.descricao}
                        </p>
                        <p className={`font-mono text-xs ${classeTextoAuxiliar}`}>
                          {produto.codigo}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {erro ? (
              <div className={classeErroFormulario}>
                {erro}
              </div>
            ) : null}
          </div>

          <div className={classeRodapePainel}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onFechar}
                disabled={salvando}
                className={classeBotaoSecundario}
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
