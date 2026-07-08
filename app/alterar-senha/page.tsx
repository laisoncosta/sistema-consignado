"use client";

import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { FormEvent, useState, type CSSProperties } from "react";

import { apiFetch, parseApiJson } from "@/lib/api-client";
import { getBrandByRegiao } from "@/lib/brands";

const brand = getBrandByRegiao("Manaus");

export default function AlterarSenhaPage() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const response = await apiFetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha, confirmarSenha }),
      });

      const data = await parseApiJson<{ error?: string; redirectTo?: string }>(
        response,
      );

      if (!response.ok) {
        setErro(data.error ?? "Não foi possível alterar a senha.");
        return;
      }

      window.location.href = data.redirectTo ?? "/dashboard/inicio";
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: brand.primary }}
          >
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Alterar senha
            </h1>
            <p className="text-sm text-slate-500">Primeiro acesso obrigatório</p>
          </div>
        </div>

        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Por segurança, defina uma nova senha pessoal antes de continuar usando
            o sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nova-senha"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nova senha
            </label>
            <input
              id="nova-senha"
              type="password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
              style={inputRingStyle}
              required
              minLength={6}
            />
          </div>

          <div>
            <label
              htmlFor="confirmar-senha"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirmar nova senha
            </label>
            <input
              id="confirmar-senha"
              type="password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
              style={inputRingStyle}
              required
              minLength={6}
            />
          </div>

          {erro ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-70"
            style={{ backgroundColor: brand.primary }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
