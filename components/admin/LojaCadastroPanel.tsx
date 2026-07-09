"use client";

import { Loader2, Package, X } from "lucide-react";
import {
  useCallback,
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
  type LojaCadastroFormData,
  type ProdutoLojaVinculo,
  type RegiaoCatalogo,
} from "@/lib/admin-lojas";

type LojaCadastroPanelProps = {
  aberto: boolean;
  regioes: RegiaoCatalogo[];
  brand: BrandTheme;
  salvando: boolean;
  erro: string | null;
  onFechar: () => void;
  onSalvar: (dados: LojaCadastroFormData) => Promise<void>;
};

const formularioVazio = (regioes: RegiaoCatalogo[]): LojaCadastroFormData => ({
  codigo: "",
  nome: "",
  regiaoId: regioes[0]?.id ?? 0,
  ativo: true,
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  latitude: "",
  longitude: "",
  cercaVirtualStatus: "desativar",
  perimetro: "",
  produtosAtivos: [],
});

function slugRegiaoPorNome(nome: string): string {
  return nome.toLowerCase().includes("rio branco") ? "rio-branco" : "manaus";
}

export function LojaCadastroPanel({
  aberto,
  regioes,
  brand,
  salvando,
  erro,
  onFechar,
  onSalvar,
}: LojaCadastroPanelProps) {
  const [formulario, setFormulario] = useState<LojaCadastroFormData>(
    formularioVazio(regioes),
  );
  const [produtos, setProdutos] = useState<ProdutoLojaVinculo[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  const carregarProdutosRegiao = useCallback(
    async (regiaoId: number) => {
      const regiao = regioes.find((item) => item.id === regiaoId);

      if (!regiao) {
        setProdutos([]);
        return;
      }

      setCarregandoProdutos(true);
      setErroProdutos(null);

      try {
        const response = await fetch(
          `/api/admin/produtos?regiao=${slugRegiaoPorNome(regiao.nome)}`,
          { credentials: "include" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar os produtos.");
        }

        setProdutos(
          (Array.isArray(data.produtos) ? data.produtos : []).map(
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
    },
    [regioes],
  );

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setFormulario(formularioVazio(regioes));
    setErroProdutos(null);
    setProdutos([]);
  }, [aberto, regioes]);

  useEffect(() => {
    if (!aberto || !formulario.regiaoId) {
      return;
    }

    void carregarProdutosRegiao(formulario.regiaoId);
  }, [aberto, formulario.regiaoId, carregarProdutosRegiao]);

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

    await onSalvar({
      ...formulario,
      produtosAtivos: produtos
        .filter((produto) => produto.ativoNaLoja)
        .map((produto) => produto.id),
    });
  }

  if (!aberto) {
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
                Novo cadastro
              </p>
              <h2 className={classeTituloPainel}>
                Cadastrar Loja
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
                  htmlFor="loja-codigo"
                  className={classeLabelCampo}
                >
                  Código CISS
                </label>
                <input
                  id="loja-codigo"
                  value={formulario.codigo}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      codigo: event.target.value,
                    }))
                  }
                  className={`${classeInput} font-mono`}
                  style={inputRingStyle}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="loja-nome"
                  className={classeLabelCampo}
                >
                  Nome da Loja
                </label>
                <input
                  id="loja-nome"
                  value={formulario.nome}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  className={classeInput}
                  style={inputRingStyle}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="loja-regiao"
                    className={classeLabelCampo}
                  >
                    Região
                  </label>
                  <select
                    id="loja-regiao"
                    value={formulario.regiaoId}
                    onChange={(event) =>
                      setFormulario((atual) => ({
                        ...atual,
                        regiaoId: Number(event.target.value),
                      }))
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
                    htmlFor="loja-status"
                    className={classeLabelCampo}
                  >
                    Status
                  </label>
                  <select
                    id="loja-status"
                    value={formulario.ativo ? "ativa" : "inativa"}
                    onChange={(event) =>
                      setFormulario((atual) => ({
                        ...atual,
                        ativo: event.target.value === "ativa",
                      }))
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
              idPrefix="loja"
              brand={brand}
              regiaoNome={
                regioes.find((item) => item.id === formulario.regiaoId)?.nome
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
                setFormulario((atual) => ({ ...atual, ...patch }))
              }
            />

            <div className={classeSecaoFormularioCompacta}>
              <h3 className={`${classeTituloSecao} mb-4`}>
                Parâmetro Cerca Virtual
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="loja-cerca-status"
                    className={classeLabelCampo}
                  >
                    Status da Cerca
                  </label>
                  <select
                    id="loja-cerca-status"
                    value={formulario.cercaVirtualStatus}
                    onChange={(event) =>
                      setFormulario((atual) => ({
                        ...atual,
                        cercaVirtualStatus:
                          event.target.value === "ativar"
                            ? "ativar"
                            : "desativar",
                      }))
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
                      htmlFor="loja-latitude"
                      className={classeLabelCampo}
                    >
                      Latitude
                    </label>
                    <input
                      id="loja-latitude"
                      value={formulario.latitude}
                      disabled={!cercaAtiva}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          latitude: event.target.value,
                        }))
                      }
                      className={classeCampoCercaMono}
                      style={cercaAtiva ? inputRingStyle : undefined}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="loja-longitude"
                      className={classeLabelCampo}
                    >
                      Longitude
                    </label>
                    <input
                      id="loja-longitude"
                      value={formulario.longitude}
                      disabled={!cercaAtiva}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          longitude: event.target.value,
                        }))
                      }
                      className={classeCampoCercaMono}
                      style={cercaAtiva ? inputRingStyle : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="loja-perimetro"
                    className={classeLabelCampo}
                  >
                    Perímetro (metros)
                  </label>
                  <input
                    id="loja-perimetro"
                    type="number"
                    min={0}
                    step={1}
                    value={formulario.perimetro}
                    disabled={!cercaAtiva}
                    onChange={(event) =>
                      setFormulario((atual) => ({
                        ...atual,
                        perimetro: event.target.value,
                      }))
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
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
