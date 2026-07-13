"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import type { BrandTheme } from "@/lib/brands";
import { extrairDataBrasil } from "@/lib/data-brasil";
import {
  formatarDataHoraBr,
  origemObrigatoriaExpedicao,
  podeExpedicaoAlterarItemPorData,
  rotuloTipoPedidoDetalheExpedicao,
  type ItemPedidoExpedicaoDetalhe,
  type OpcaoFiltroExpedicao,
} from "@/lib/expedicao";
import { isGestaoRole, type UserRole } from "@/lib/rbac";

type AprovacaoPedidoModalProps = {
  aberto: boolean;
  brand: BrandTheme;
  role: UserRole;
  regiaoNome?: string;
  itemPedidoId: number | null;
  origens: OpcaoFiltroExpedicao[];
  onFechar: () => void;
  onFinalizado: () => void;
};

function limitarEntre(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) {
    return minimo;
  }

  return Math.min(maximo, Math.max(minimo, Math.trunc(valor)));
}

export function AprovacaoPedidoModal({
  aberto,
  brand,
  role,
  regiaoNome,
  itemPedidoId,
  origens,
  onFechar,
  onFinalizado,
}: AprovacaoPedidoModalProps) {
  const [detalhe, setDetalhe] = useState<ItemPedidoExpedicaoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [confirmacaoReprovar, setConfirmacaoReprovar] = useState(false);
  const [origemInvalida, setOrigemInvalida] = useState(false);

  const [cortePedido, setCortePedido] = useState(0);
  const [corteTroca, setCorteTroca] = useState(0);
  const [origemId, setOrigemId] = useState(0);
  const [pedidoSolicitado, setPedidoSolicitado] = useState(0);
  const [estoque, setEstoque] = useState(0);
  const [trocas, setTrocas] = useState(0);

  const podeEditarAdmin = isGestaoRole(role);
  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  const pedidoAprovado = useMemo(
    () => Math.max(0, pedidoSolicitado - cortePedido),
    [pedidoSolicitado, cortePedido],
  );

  const trocaAtendida = useMemo(
    () => Math.max(0, trocas - corteTroca),
    [trocas, corteTroca],
  );

  const origemObrigatoria = useMemo(
    () =>
      origemObrigatoriaExpedicao(
        pedidoSolicitado,
        trocas,
        cortePedido,
        corteTroca,
      ),
    [pedidoSolicitado, trocas, cortePedido, corteTroca],
  );

  const corteTotalSolicitado = useMemo(() => {
    const houveSolicitacao = pedidoSolicitado > 0 || trocas > 0;

    if (!houveSolicitacao) {
      return false;
    }

    return cortePedido >= pedidoSolicitado && corteTroca >= trocas;
  }, [cortePedido, corteTroca, pedidoSolicitado, trocas]);

  const somenteLeituraExpedicao = useMemo(() => {
    if (!detalhe || isGestaoRole(role)) {
      return false;
    }

    const dataPedido = extrairDataBrasil(
      new Date(detalhe.dataPedido),
      regiaoNome,
    );

    return !podeExpedicaoAlterarItemPorData(role, dataPedido, regiaoNome);
  }, [detalhe, regiaoNome, role]);

  const itemReprovado = detalhe?.status === "Reprovado";
  const camposDesabilitados = somenteLeituraExpedicao;
  const acoesDesabilitadas = salvando || !detalhe || camposDesabilitados;

  function handleCortePedidoChange(valor: string) {
    setCortePedido(limitarEntre(Number(valor), 0, pedidoSolicitado));
  }

  function handleCorteTrocaChange(valor: string) {
    setCorteTroca(limitarEntre(Number(valor), 0, trocas));
  }

  function handlePedidoSolicitadoChange(valor: string) {
    const novoPedido = limitarEntre(Number(valor), 0, Number.MAX_SAFE_INTEGER);
    setPedidoSolicitado(novoPedido);
    setCortePedido((atual) => limitarEntre(atual, 0, novoPedido));
  }

  function handleTrocasChange(valor: string) {
    const novasTrocas = limitarEntre(Number(valor), 0, Number.MAX_SAFE_INTEGER);
    setTrocas(novasTrocas);
    setCorteTroca((atual) => limitarEntre(atual, 0, novasTrocas));
  }

  useEffect(() => {
    if (!aberto || !itemPedidoId) {
      return;
    }

    async function carregar() {
      setCarregando(true);
      setErro(null);
      setModoEdicao(false);
      setConfirmacaoReprovar(false);
      setOrigemInvalida(false);

      try {
        const response = await fetch(`/api/expedicao/itens/${itemPedidoId}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar o item.");
        }

        const item = data.item as ItemPedidoExpedicaoDetalhe;
        setDetalhe(item);
        setCortePedido(item.cortePedido);
        setCorteTroca(item.corteTroca);
        setOrigemId(item.origemId ?? 0);
        setPedidoSolicitado(item.pedidoSolicitado);
        setEstoque(item.estoque);
        setTrocas(item.trocaSolicitada);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o item.",
        );
        setDetalhe(null);
      } finally {
        setCarregando(false);
      }
    }

    void carregar();
  }, [aberto, itemPedidoId, origens]);

  async function salvar(opcoes: { finalizar?: boolean; reprovar?: boolean }) {
    const finalizar = opcoes.finalizar === true;
    const reprovar = opcoes.reprovar === true;

    if (!itemPedidoId || camposDesabilitados) {
      return;
    }

    const cortePedidoValido = reprovar
      ? pedidoSolicitado
      : limitarEntre(cortePedido, 0, pedidoSolicitado);
    const corteTrocaValido = reprovar
      ? trocas
      : limitarEntre(corteTroca, 0, trocas);

    if (!reprovar && cortePedidoValido !== cortePedido) {
      setCortePedido(cortePedidoValido);
    }

    if (!reprovar && corteTrocaValido !== corteTroca) {
      setCorteTroca(corteTrocaValido);
    }

    if (finalizar && origemObrigatoria && !origemId) {
      setOrigemInvalida(true);
      return;
    }

    setOrigemInvalida(false);

    setSalvando(true);
    setErro(null);
    setConfirmacaoReprovar(false);

    try {
      const response = await fetch(`/api/expedicao/itens/${itemPedidoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalizar,
          reprovar,
          edicaoAdmin: modoEdicao && podeEditarAdmin,
          cortePedido: cortePedidoValido,
          corteTroca: corteTrocaValido,
          origemId: origemObrigatoria && !reprovar ? origemId : 0,
          pedidoSolicitado,
          estoque,
          trocas,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar.");
      }

      setDetalhe(data.item as ItemPedidoExpedicaoDetalhe);

      if (finalizar || reprovar) {
        onFinalizado();
        onFechar();
      }
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return null;
  }

  const tipoPedidoRotulo = rotuloTipoPedidoDetalheExpedicao(detalhe?.tipoPedido);
  const tipoPedidoExtra = detalhe?.tipoPedido === "Extra";

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      <div className="relative z-[201] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Aprovação de Pedido
          </h3>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando...
            </div>
          ) : detalhe ? (
            <div className="space-y-5">
              {somenteLeituraExpedicao ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  Somente Leitura, para alterar entrar em contato com o Suporte
                </div>
              ) : null}

              {itemReprovado && !somenteLeituraExpedicao ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                  Pedido reprovado. Você pode ajustar os cortes e aprovar novamente
                  enquanto for o dia atual.
                </div>
              ) : null}

              <div
                className={`rounded-xl border-2 px-4 py-3 text-center ${
                  tipoPedidoExtra
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-sky-500 bg-sky-50"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de Pedido
                </p>
                <p
                  className={`mt-1 text-base font-bold ${
                    tipoPedidoExtra ? "text-emerald-800" : "text-sky-900"
                  }`}
                >
                  {tipoPedidoRotulo}
                </p>
              </div>

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Promotor</span>
                  <p className="font-medium text-slate-800">{detalhe.promotorNome}</p>
                </div>
                <div>
                  <span className="text-slate-500">Loja</span>
                  <p className="font-medium text-slate-800">{detalhe.lojaNome}</p>
                </div>
                <div>
                  <span className="text-slate-500">Produto</span>
                  <p className="font-medium text-slate-800">{detalhe.produtoNome}</p>
                </div>
                <div>
                  <span className="text-slate-500">Data do Pedido</span>
                  <p className="font-medium text-slate-800">
                    {formatarDataHoraBr(detalhe.dataPedido)}
                  </p>
                </div>
              </div>

              {podeEditarAdmin && !camposDesabilitados ? (
                <button
                  type="button"
                  onClick={() => setModoEdicao((atual) => !atual)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {modoEdicao ? "Bloquear edição" : "Editar"}
                </button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Estoque Atual</span>
                  {modoEdicao && podeEditarAdmin ? (
                    <input
                      type="number"
                      min={0}
                      value={estoque}
                      disabled={camposDesabilitados}
                      onChange={(e) => setEstoque(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                      style={inputRingStyle}
                    />
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 font-semibold">
                      {estoque}
                    </p>
                  )}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Qtde Solicitada</span>
                  {modoEdicao && podeEditarAdmin ? (
                    <input
                      type="number"
                      min={0}
                      value={pedidoSolicitado}
                      disabled={camposDesabilitados}
                      onChange={(e) => handlePedidoSolicitadoChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                      style={inputRingStyle}
                    />
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 font-semibold">
                      {pedidoSolicitado}
                    </p>
                  )}
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Corte do Pedido</span>
                  <input
                    type="number"
                    min={0}
                    max={pedidoSolicitado}
                    value={cortePedido}
                    disabled={camposDesabilitados}
                    onChange={(e) => handleCortePedidoChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                    style={inputRingStyle}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Qtde Aprovada</span>
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                    {pedidoAprovado}
                  </p>
                </label>

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">
                    Local de Origem{origemObrigatoria ? " *" : ""}
                  </span>
                  {!origemObrigatoria ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Não necessário — nenhuma quantidade será expedida.
                    </p>
                  ) : (
                    <>
                      <select
                        value={origemId || ""}
                        disabled={camposDesabilitados}
                        onChange={(e) => {
                          setOrigemId(Number(e.target.value));
                          setOrigemInvalida(false);
                        }}
                        className={`w-full rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                          origemInvalida
                            ? "border-rose-500 ring-2 ring-rose-200"
                            : "border-slate-200"
                        }`}
                        style={origemInvalida ? undefined : inputRingStyle}
                        required
                      >
                        <option value="" disabled>
                          Selecione a Origem
                        </option>
                        {origens.map((origem) => (
                          <option key={origem.id} value={origem.id}>
                            {origem.label}
                          </option>
                        ))}
                      </select>
                      {origemInvalida ? (
                        <p className="text-sm text-rose-600">
                          Selecione o local de origem do produto
                        </p>
                      ) : null}
                    </>
                  )}
                </label>
              </div>

              {trocas > 0 ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">
                    Solicitações de Trocas
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-sm">
                      <span className="text-slate-500">Trocas Solicitadas</span>
                      {modoEdicao && podeEditarAdmin ? (
                        <input
                          type="number"
                          min={0}
                          value={trocas}
                          disabled={camposDesabilitados}
                          onChange={(e) => handleTrocasChange(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                          style={inputRingStyle}
                        />
                      ) : (
                        <p className="mt-1 font-semibold">{trocas}</p>
                      )}
                    </div>
                    <label className="text-sm">
                      <span className="text-slate-500">Cortes de Trocas</span>
                      <input
                        type="number"
                        min={0}
                        max={trocas}
                        value={corteTroca}
                        disabled={camposDesabilitados}
                        onChange={(e) => handleCorteTrocaChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                        style={inputRingStyle}
                      />
                    </label>
                    <div className="text-sm">
                      <span className="text-slate-500">Trocas Atendidas</span>
                      <p className="mt-1 font-semibold text-emerald-800">
                        {trocaAtendida}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">
                  Histórico de Logs
                </h4>
                {detalhe.logs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum registro ainda.</p>
                ) : (
                  <ul className="max-h-36 space-y-2 overflow-y-auto text-sm">
                    {detalhe.logs.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <p className="font-medium text-slate-800">
                          {formatarDataHoraBr(log.createdAt)} — {log.usuarioNome}
                        </p>
                        <p className="text-slate-600">
                          {log.acao}
                          {log.detalhes ? `: ${log.detalhes}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-red-600">
              {erro ?? "Item não encontrado."}
            </p>
          )}

          {erro && detalhe ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          ) : null}
        </div>

        <div
          className={`flex flex-col gap-3 border-t border-slate-200 px-6 py-4 ${
            somenteLeituraExpedicao ? "sm:justify-end" : "sm:flex-row"
          }`}
        >
          {!somenteLeituraExpedicao ? (
            <>
              <button
                type="button"
                disabled={acoesDesabilitadas || corteTotalSolicitado}
                onClick={() => void salvar({ finalizar: true })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Aprovar Pedido
              </button>
              <button
                type="button"
                disabled={acoesDesabilitadas}
                onClick={() => setConfirmacaoReprovar(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              >
                Reprovar Pedido
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onFechar}
            className={`rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 ${
              somenteLeituraExpedicao ? "w-full sm:w-auto" : "sm:flex-none"
            }`}
          >
            Sair
          </button>
        </div>

        {confirmacaoReprovar ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-white p-6 shadow-2xl">
              <h4 className="text-lg font-semibold text-rose-700">
                Confirmar reprovação
              </h4>
              <p className="mt-3 text-sm text-slate-700">
                Esta ação irá cortar totalmente o pedido solicitado e as trocas.
                O status será alterado para{" "}
                <span className="font-semibold text-rose-700">Reprovado</span>.
              </p>
              <p className="mt-2 text-sm font-medium text-rose-800">
                Deseja continuar com o corte total?
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvar({ reprovar: true })}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar Reprovação
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setConfirmacaoReprovar(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
