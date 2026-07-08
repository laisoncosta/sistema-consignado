"use client";

import { ChevronDown, Loader2, MapPin, UserRound } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import type { BrandTheme } from "@/lib/brands";

export type RegiaoResumo = {
  id: number;
  nome: string;
  rotulo: string;
  primary: string;
  primaryLight: string;
};

export type PromotorResumo = {
  id: number;
  nome: string;
  email: string;
  regiaoId: number;
  regiaoNome: string;
};

export type LojaVinculadaResumo = {
  id: string;
  codigo: string;
  rotulo: string;
  regiaoId: number;
};

export type SelecaoPortalAdmin = {
  regiao: RegiaoResumo | null;
  promotor: PromotorResumo | null;
  loja: LojaVinculadaResumo | null;
};

type PortalPedidosAdminFiltrosProps = {
  brand: BrandTheme;
  onSelecaoChange: (selecao: SelecaoPortalAdmin) => void;
};

export function PortalPedidosAdminFiltros({
  brand,
  onSelecaoChange,
}: PortalPedidosAdminFiltrosProps) {
  const [regioes, setRegioes] = useState<RegiaoResumo[]>([]);
  const [promotores, setPromotores] = useState<PromotorResumo[]>([]);
  const [lojas, setLojas] = useState<LojaVinculadaResumo[]>([]);
  const [regiaoId, setRegiaoId] = useState("");
  const [promotorId, setPromotorId] = useState("");
  const [lojaId, setLojaId] = useState("");
  const [carregandoRegioes, setCarregandoRegioes] = useState(true);
  const [carregandoPromotores, setCarregandoPromotores] = useState(false);
  const [carregandoLojas, setCarregandoLojas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const regiaoSelecionada =
    regioes.find((item) => String(item.id) === regiaoId) ?? null;
  const regiaoVisual = regiaoSelecionada ?? brand;
  const inputRingStyle = {
    "--tw-ring-color": regiaoVisual.primary,
  } as CSSProperties;

  const emitirSelecao = useCallback(
    (
      proximaRegiao: RegiaoResumo | null,
      proximoPromotor: PromotorResumo | null,
      proximaLoja: LojaVinculadaResumo | null,
    ) => {
      onSelecaoChange({
        regiao: proximaRegiao,
        promotor: proximoPromotor,
        loja: proximaLoja,
      });
    },
    [onSelecaoChange],
  );

  useEffect(() => {
    async function carregarRegioes() {
      setCarregandoRegioes(true);
      setErro(null);

      try {
        const response = await fetch("/api/admin/regioes", {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar regiões.");
        }

        setRegioes(Array.isArray(data.regioes) ? data.regioes : []);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar regiões.",
        );
      } finally {
        setCarregandoRegioes(false);
      }
    }

    void carregarRegioes();
  }, []);

  useEffect(() => {
    if (!regiaoId) {
      setPromotores([]);
      setPromotorId("");
      setLojas([]);
      setLojaId("");
      emitirSelecao(null, null, null);
      return;
    }

    let cancelado = false;
    const regiao = regioes.find((item) => String(item.id) === regiaoId) ?? null;

    async function carregarPromotores() {
      setCarregandoPromotores(true);
      setErro(null);
      setPromotorId("");
      setLojas([]);
      setLojaId("");

      try {
        const response = await fetch(
          `/api/admin/promotores?regiaoId=${encodeURIComponent(regiaoId)}`,
          { credentials: "include" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar promotores.");
        }

        if (cancelado) {
          return;
        }

        const lista = Array.isArray(data.promotores) ? data.promotores : [];
        setPromotores(lista);
        emitirSelecao(regiao, null, null);
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar promotores.",
          );
          setPromotores([]);
          emitirSelecao(regiao, null, null);
        }
      } finally {
        if (!cancelado) {
          setCarregandoPromotores(false);
        }
      }
    }

    void carregarPromotores();

    return () => {
      cancelado = true;
    };
  }, [regiaoId, regioes, emitirSelecao]);

  useEffect(() => {
    if (!promotorId || !regiaoId) {
      setLojas([]);
      setLojaId("");
      emitirSelecao(
        regiaoSelecionada,
        promotores.find((item) => String(item.id) === promotorId) ?? null,
        null,
      );
      return;
    }

    let cancelado = false;
    const promotor =
      promotores.find((item) => String(item.id) === promotorId) ?? null;

    async function carregarLojas() {
      setCarregandoLojas(true);
      setErro(null);
      setLojaId("");

      try {
        const response = await fetch(
          `/api/admin/promotores/${promotorId}/lojas?regiaoId=${encodeURIComponent(regiaoId)}`,
          { credentials: "include" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar lojas.");
        }

        if (cancelado) {
          return;
        }

        const lista = Array.isArray(data.lojas) ? data.lojas : [];
        setLojas(lista);
        emitirSelecao(regiaoSelecionada, promotor, null);
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar lojas.",
          );
          setLojas([]);
          emitirSelecao(regiaoSelecionada, promotor, null);
        }
      } finally {
        if (!cancelado) {
          setCarregandoLojas(false);
        }
      }
    }

    void carregarLojas();

    return () => {
      cancelado = true;
    };
  }, [promotorId, regiaoId, promotores, regiaoSelecionada, emitirSelecao]);

  function handleRegiaoChange(novaRegiaoId: string) {
    setRegiaoId(novaRegiaoId);
    setPromotorId("");
    setLojaId("");
  }

  function handlePromotorChange(novoPromotorId: string) {
    setPromotorId(novoPromotorId);
    setLojaId("");
  }

  function handleLojaChange(novaLojaId: string) {
    setLojaId(novaLojaId);
    const promotor =
      promotores.find((item) => String(item.id) === promotorId) ?? null;
    const loja = lojas.find((item) => item.id === novaLojaId) ?? null;
    emitirSelecao(regiaoSelecionada, promotor, loja);
  }

  return (
    <div
      className="rounded-2xl border bg-white p-6 shadow-sm"
      style={{ borderColor: regiaoVisual.primaryLight }}
    >
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <UserRound className="h-4 w-4" style={{ color: regiaoVisual.primary }} />
        Seleção de contexto para lançamento
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MapPin className="h-4 w-4" />
            Selecione a Região
          </label>

          {carregandoRegioes ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando regiões...
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {regioes.map((regiao) => {
                const ativa = regiaoId === String(regiao.id);

                return (
                  <button
                    key={regiao.id}
                    type="button"
                    onClick={() => handleRegiaoChange(String(regiao.id))}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                    style={
                      ativa
                        ? {
                            backgroundColor: regiao.primary,
                            color: "#fff",
                            boxShadow: `0 8px 20px ${regiao.primaryLight}`,
                          }
                        : {
                            backgroundColor: "#f8fafc",
                            color: "#475569",
                            border: "1px solid #e2e8f0",
                          }
                    }
                  >
                    {regiao.rotulo}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="relative">
            <label
              htmlFor="filtro-promotor"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Selecione o Promotor
            </label>
            <select
              id="filtro-promotor"
              value={promotorId}
              onChange={(event) => handlePromotorChange(event.target.value)}
              disabled={!regiaoId || carregandoPromotores}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={inputRingStyle}
            >
              <option value="">
                {!regiaoId
                  ? "Selecione uma região primeiro"
                  : carregandoPromotores
                    ? "Carregando promotores..."
                    : promotores.length === 0
                      ? "Nenhum promotor nesta região"
                      : "Escolha um promotor"}
              </option>
              {promotores.map((promotor) => (
                <option key={promotor.id} value={promotor.id}>
                  {promotor.nome} ({promotor.email})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-[2.35rem] h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <label
              htmlFor="filtro-loja"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Selecione a Loja
            </label>
            <select
              id="filtro-loja"
              value={lojaId}
              onChange={(event) => handleLojaChange(event.target.value)}
              disabled={!promotorId || carregandoLojas || lojas.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={inputRingStyle}
            >
              <option value="">
                {!promotorId
                  ? "Selecione um promotor primeiro"
                  : carregandoLojas
                    ? "Carregando lojas..."
                    : lojas.length === 0
                      ? "Nenhuma loja vinculada"
                      : "Escolha uma loja"}
              </option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.rotulo}
                </option>
              ))}
            </select>
            {carregandoLojas ? (
              <Loader2 className="pointer-events-none absolute right-3 top-[2.35rem] h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <ChevronDown className="pointer-events-none absolute right-3 top-[2.35rem] h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {erro ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
