"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import type { BrandTheme } from "@/lib/brands";
import type { OrigemCatalogoItem, OrigemFormData, RegiaoCatalogo } from "@/lib/admin-origens";

type OrigemFormPanelProps = {
  aberto: boolean;
  modo: "criar" | "editar";
  origem: OrigemCatalogoItem | null;
  regioes: RegiaoCatalogo[];
  brand: BrandTheme;
  salvando: boolean;
  erro: string | null;
  onFechar: () => void;
  onSalvar: (dados: OrigemFormData) => Promise<void>;
};

const formularioVazio = (regioes: RegiaoCatalogo[]): OrigemFormData => ({
  nome: "",
  regiaoId: regioes[0]?.id ?? 0,
});

export function OrigemFormPanel({
  aberto,
  modo,
  origem,
  regioes,
  brand,
  salvando,
  erro,
  onFechar,
  onSalvar,
}: OrigemFormPanelProps) {
  const [formulario, setFormulario] = useState<OrigemFormData>(
    formularioVazio(regioes),
  );

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    if (origem) {
      setFormulario({
        nome: origem.nome,
        regiaoId: origem.regiaoId,
      });
      return;
    }

    setFormulario(formularioVazio(regioes));
  }, [aberto, origem, regioes]);

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
                {modo === "criar" ? "Nova origem" : "Editar origem"}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-800">
                {modo === "criar" ? "Cadastrar origem" : "Atualizar origem"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nome da origem</span>
              <input
                value={formulario.nome}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Ex.: VIVA, BURITI..."
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Região</span>
              {regioes.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Nenhuma região disponível. Verifique a conexão com o banco.
                </p>
              ) : (
              <select
                value={formulario.regiaoId || regioes[0]?.id}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    regiaoId: Number(event.target.value),
                  }))
                }
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={inputRingStyle}
              >
                {regioes.map((regiao) => (
                  <option key={regiao.id} value={regiao.id}>
                    {regiao.rotulo}
                  </option>
                ))}
              </select>
              )}
            </label>

            {erro ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </p>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <button
              type="submit"
              disabled={salvando || regioes.length === 0 || !formulario.nome.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              style={{ backgroundColor: brand.primary }}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : modo === "criar" ? (
                "Cadastrar origem"
              ) : (
                "Salvar alterações"
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
