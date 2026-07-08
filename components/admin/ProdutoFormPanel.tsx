"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import type { BrandTheme } from "@/lib/brands";
import type { ProdutoCatalogoItem, ProdutoFormData, RegiaoCatalogo } from "@/lib/admin-produtos";

type ProdutoFormPanelProps = {
  aberto: boolean;
  modo: "criar" | "editar";
  produto: ProdutoCatalogoItem | null;
  regioes: RegiaoCatalogo[];
  brand: BrandTheme;
  salvando: boolean;
  erro: string | null;
  onFechar: () => void;
  onSalvar: (dados: ProdutoFormData) => Promise<void>;
};

const formularioVazio = (regioes: RegiaoCatalogo[]): ProdutoFormData => ({
  codigo: "",
  descricao: "",
  precoUnitario: 0,
  ativo: true,
  regiaoId: regioes[0]?.id ?? 0,
});

export function ProdutoFormPanel({
  aberto,
  modo,
  produto,
  regioes,
  brand,
  salvando,
  erro,
  onFechar,
  onSalvar,
}: ProdutoFormPanelProps) {
  const [formulario, setFormulario] = useState<ProdutoFormData>(
    formularioVazio(regioes),
  );

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    if (produto) {
      setFormulario({
        codigo: produto.codigo,
        descricao: produto.descricao,
        precoUnitario: produto.precoUnitario,
        ativo: produto.ativo,
        regiaoId: produto.regiaoId,
      });
      return;
    }

    setFormulario(formularioVazio(regioes));
  }, [aberto, produto, regioes]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSalvar(formulario);
  }

  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onFechar}
      />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: brand.primaryLight }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {modo === "criar" ? "Novo cadastro" : "Edição"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-800">
                {modo === "criar" ? "Cadastrar Produto" : "Editar Produto"}
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
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div>
              <label htmlFor="produto-codigo" className="mb-2 block text-sm font-medium text-slate-700">
                Código / SKU
              </label>
              <input
                id="produto-codigo"
                value={formulario.codigo}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    codigo: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
                required
              />
            </div>

            <div>
              <label htmlFor="produto-nome" className="mb-2 block text-sm font-medium text-slate-700">
                Nome do Produto
              </label>
              <input
                id="produto-nome"
                value={formulario.descricao}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
                required
              />
            </div>

            <div>
              <label htmlFor="produto-regiao" className="mb-2 block text-sm font-medium text-slate-700">
                Região
              </label>
              <select
                id="produto-regiao"
                value={formulario.regiaoId}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    regiaoId: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
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
              <label htmlFor="produto-preco" className="mb-2 block text-sm font-medium text-slate-700">
                Preço Unitário (R$) <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                id="produto-preco"
                type="number"
                min="0"
                step="0.01"
                value={formulario.precoUnitario}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    precoUnitario:
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Status do produto</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Produtos inativos não aparecem para novos lançamentos.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formulario.ativo}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      ativo: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300"
                  style={{ accentColor: brand.primary }}
                />
              </label>
              <p className="mt-3 text-sm font-medium text-slate-700">
                {formulario.ativo ? "Ativo" : "Inativo"}
              </p>
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
