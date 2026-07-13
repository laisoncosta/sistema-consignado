"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

import type { BrandTheme } from "@/lib/brands";
import type { OpcaoFiltroExpedicao } from "@/lib/expedicao";

const MOTIVO_MIN = 15;
const MOTIVO_MAX = 50;

export type TransferenciaAvulsaEdicao = {
  id: number;
  lojaId: number;
  produtoId: number;
  origemId: number;
  quantidade: number;
  bonificacao: number;
  motivo: string;
};

type TransferenciaAvulsaModalProps = {
  aberto: boolean;
  brand: BrandTheme;
  lojas: OpcaoFiltroExpedicao[];
  produtos: OpcaoFiltroExpedicao[];
  origens: OpcaoFiltroExpedicao[];
  salvando: boolean;
  erro: string | null;
  editando: TransferenciaAvulsaEdicao | null;
  onFechar: () => void;
  onSalvar: (dados: {
    id?: number;
    lojaId: number;
    produtoId: number;
    origemId: number;
    quantidade: number;
    bonificacao: number;
    motivo: string;
  }) => Promise<void>;
};

export function TransferenciaAvulsaModal({
  aberto,
  brand,
  lojas,
  produtos,
  origens,
  salvando,
  erro,
  editando,
  onFechar,
  onSalvar,
}: TransferenciaAvulsaModalProps) {
  const [lojaId, setLojaId] = useState(0);
  const [produtoId, setProdutoId] = useState(0);
  const [origemId, setOrigemId] = useState(0);
  const [quantidade, setQuantidade] = useState("");
  const [bonificacao, setBonificacao] = useState("");
  const [motivo, setMotivo] = useState("");

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    if (editando) {
      setLojaId(editando.lojaId);
      setProdutoId(editando.produtoId);
      setOrigemId(editando.origemId);
      setQuantidade(
        editando.quantidade > 0 ? String(editando.quantidade) : "",
      );
      setBonificacao(
        editando.bonificacao > 0 ? String(editando.bonificacao) : "",
      );
      setMotivo(editando.motivo);
      return;
    }

    setLojaId(0);
    setProdutoId(0);
    setOrigemId(0);
    setQuantidade("");
    setBonificacao("");
    setMotivo("");
  }, [aberto, editando]);

  function parseCampoNumerico(valor: string): number {
    if (valor.trim() === "") {
      return 0;
    }

    const numerico = Number(valor);

    return Number.isFinite(numerico) ? numerico : 0;
  }

  const quantidadeNumerica = parseCampoNumerico(quantidade);
  const bonificacaoNumerica = parseCampoNumerico(bonificacao);
  const motivoValido =
    motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX;

  const avisoMotivo = useMemo(() => {
    const tamanho = motivo.trim().length;

    if (tamanho === 0) {
      return `Informe o motivo (${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres).`;
    }

    if (tamanho < MOTIVO_MIN) {
      return `Faltam ${MOTIVO_MIN - tamanho} caracteres (mínimo ${MOTIVO_MIN}).`;
    }

    if (tamanho > MOTIVO_MAX) {
      return `Excedeu ${tamanho - MOTIVO_MAX} caracteres (máximo ${MOTIVO_MAX}).`;
    }

    return null;
  }, [motivo]);

  const podeSalvar = useMemo(
    () =>
      lojaId > 0 &&
      produtoId > 0 &&
      origemId > 0 &&
      (quantidadeNumerica > 0 || bonificacaoNumerica > 0) &&
      motivoValido,
    [
      lojaId,
      produtoId,
      origemId,
      quantidadeNumerica,
      bonificacaoNumerica,
      motivoValido,
    ],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await onSalvar({
      ...(editando ? { id: editando.id } : {}),
      lojaId,
      produtoId,
      origemId,
      quantidade: quantidadeNumerica,
      bonificacao: bonificacaoNumerica,
      motivo: motivo.trim(),
    });
  }

  const modoEdicao = editando != null;

  if (!aberto) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      <div className="relative z-[201] w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {modoEdicao ? "Editar Transferência Avulsa" : "Transferência Avulsa"}
          </h3>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
          <div className="rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tipo de Pedido
            </p>
            <p className="mt-1 text-base font-bold text-amber-900">Pedido Avulso</p>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Loja</span>
            <select
              value={lojaId || ""}
              onChange={(e) => setLojaId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
            >
              <option value="">Selecione...</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Produto</span>
            <select
              value={produtoId || ""}
              onChange={(e) => setProdutoId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
            >
              <option value="">Selecione...</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Local de Origem *</span>
            <select
              value={origemId || ""}
              onChange={(e) => setOrigemId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
              required
            >
              <option value="">Selecione...</option>
              {origens.map((origem) => (
                <option key={origem.id} value={origem.id}>
                  {origem.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Qtde Avulsa</span>
            <input
              type="number"
              min={0}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Bonificação</span>
            <input
              type="number"
              min={0}
              value={bonificacao}
              onChange={(e) => setBonificacao(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Motivo *</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, MOTIVO_MAX))}
              maxLength={MOTIVO_MAX}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              style={inputRingStyle}
              placeholder={`Informe o motivo (${MOTIVO_MIN}-${MOTIVO_MAX} caracteres)`}
              required
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  avisoMotivo && !motivoValido
                    ? "font-medium text-amber-700"
                    : "text-slate-500"
                }
              >
                {avisoMotivo ??
                  `${motivo.trim().length}/${MOTIVO_MAX} caracteres (mín. ${MOTIVO_MIN})`}
              </span>
            </div>
          </label>

          {erro ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando || !podeSalvar}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: brand.primary }}
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {modoEdicao ? "Salvar" : "Lançar"}
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
