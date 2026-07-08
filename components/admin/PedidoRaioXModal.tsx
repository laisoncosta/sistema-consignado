"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Route,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { MapaAuditoriaPedido } from "@/components/admin/MapaAuditoriaPedido";
import { apiFetch } from "@/lib/api-client";
import type { BrandTheme } from "@/lib/brands";
import type { EventoLinhaTempoPedido, PedidoRaioX } from "@/lib/pedido-raio-x";

type PedidoRaioXModalProps = {
  pedidoId: number | null;
  brand: BrandTheme;
  onFechar: () => void;
};

function FarolCerca({ conforme }: { conforme: boolean }) {
  if (conforme) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
        <span aria-hidden="true">🟢</span>
        CONFORME
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
      <span aria-hidden="true">🔴</span>
      NÃO CONFORME
    </span>
  );
}

function corEventoLinhaTempo(tipo: EventoLinhaTempoPedido["tipo"]): string {
  switch (tipo) {
    case "criacao":
      return "bg-sky-500";
    case "aprovacao":
      return "bg-emerald-500";
    case "reprovacao":
      return "bg-amber-500";
    case "exclusao":
      return "bg-rose-500";
    case "restauracao":
      return "bg-indigo-500";
    default:
      return "bg-slate-400";
  }
}

export function PedidoRaioXModal({
  pedidoId,
  brand,
  onFechar,
}: PedidoRaioXModalProps) {
  const [raioX, setRaioX] = useState<PedidoRaioX | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const inputRingStyle = {
    "--tw-ring-color": brand.primary,
  } as CSSProperties;

  useEffect(() => {
    if (pedidoId == null) {
      setRaioX(null);
      setErro(null);
      return;
    }

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);
      setRaioX(null);

      try {
        const response = await apiFetch(`/api/admin/pedidos/${pedidoId}/raio-x`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar detalhes.");
        }

        if (!cancelado) {
          setRaioX(data.raioX ?? null);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o raio-x do pedido.",
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      cancelado = true;
    };
  }, [pedidoId]);

  useEffect(() => {
    if (pedidoId == null) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onFechar();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onFechar, pedidoId]);

  if (pedidoId == null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedido-raio-x-titulo"
      >
        <div
          className="border-b border-slate-200 px-5 py-4"
          style={{ backgroundColor: brand.primaryLight }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {carregando ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">
                    Carregando raio-x do pedido...
                  </span>
                </div>
              ) : raioX ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Raio-X da Auditoria
                  </p>
                  <h2
                    id="pedido-raio-x-titulo"
                    className="mt-0.5 text-xl font-bold text-slate-900"
                  >
                    Pedido {raioX.numeroAmigavelRotulo}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                    <span
                      className={
                        raioX.cancelado
                          ? "font-bold uppercase text-rose-700"
                          : "font-semibold text-slate-800"
                      }
                    >
                      {raioX.statusRotulo}
                    </span>
                    <span>{raioX.dataHoraEnvio}</span>
                    <span>{raioX.promotorNome}</span>
                    <span>
                      {raioX.lojaCodigo} — {raioX.lojaNome}
                    </span>
                  </div>
                </>
              ) : (
                <h2
                  id="pedido-raio-x-titulo"
                  className="text-lg font-semibold text-slate-900"
                >
                  Detalhes do pedido
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/80 hover:text-slate-800"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: brand.primary }}
              />
            </div>
          ) : erro ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {erro}
            </div>
          ) : raioX ? (
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4"
                    style={{ color: brand.primary }}
                  />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Cerca Virtual
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Status da Cerca
                    </p>
                    <div className="mt-1">
                      <FarolCerca
                        conforme={
                          raioX.cercaVirtual.farolIntegridade === "conforme"
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Distância
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {raioX.cercaVirtual.distanciaTexto}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Check-in
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {raioX.cercaVirtual.checkIn ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Check-out (envio)
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {raioX.cercaVirtual.checkOut}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Tempo em Loja
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Clock3 className="h-4 w-4 text-slate-500" />
                      {raioX.cercaVirtual.tempoEmLoja}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Package
                    className="h-4 w-4"
                    style={{ color: brand.primary }}
                  />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Resumo do Pedido
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      Total de Produtos
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {raioX.resumoProdutos.totalProdutos}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      Volume Total
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {raioX.resumoProdutos.volumeTotal}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      Tipo
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {raioX.tipoLancamento}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: brand.primaryLight,
                    backgroundColor: brand.primaryLight,
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase text-slate-600">
                    Progresso da Conferência
                  </p>
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{ color: brand.primary }}
                  >
                    {raioX.resumoProdutos.resumoTexto}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Route
                    className="h-4 w-4"
                    style={{ color: brand.primary }}
                  />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Linha do Tempo
                  </h3>
                </div>
                {raioX.linhaTempo.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum evento registrado.
                  </p>
                ) : (
                  <ol className="relative space-y-0 border-l-2 border-slate-200 pl-4">
                    {raioX.linhaTempo.map((evento, indice) => (
                      <li
                        key={evento.id}
                        className={`relative pb-4 ${indice === raioX.linhaTempo.length - 1 ? "pb-0" : ""}`}
                      >
                        <span
                          className={`absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full ring-2 ring-white ${corEventoLinhaTempo(evento.tipo)}`}
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold text-slate-500">
                          {evento.dataHoraRotulo}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {evento.titulo}
                          {evento.usuarioNome ? (
                            <span className="font-normal text-slate-600">
                              {" "}
                              por {evento.usuarioNome}
                            </span>
                          ) : null}
                        </p>
                        {evento.detalhe ? (
                          <p className="mt-0.5 text-xs text-slate-600">
                            {evento.detalhe}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {raioX.mapa.exibirMapa ? (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: brand.primary }}
                    />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Mapa de Auditoria
                    </h3>
                  </div>
                  <MapaAuditoriaPedido
                    latitudeEnvio={raioX.mapa.latitudeEnvio}
                    longitudeEnvio={raioX.mapa.longitudeEnvio}
                    latitudeLoja={raioX.mapa.latitudeLoja}
                    longitudeLoja={raioX.mapa.longitudeLoja}
                  />
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onFechar}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            style={inputRingStyle}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
