"use client";

import { ChevronDown, Loader2, LogOut, MapPin, Store } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { GoogleMapsPlaceholder } from "@/components/dashboard/GoogleMapsPlaceholder";
import type { BrandTheme } from "@/lib/brands";
import {
  formatCheckinMessage,
  obterCoordenadasParaCheckin,
} from "@/lib/geocoding";
import {
  extrairDataIso,
  formatarCronometro,
  formatarEntrada,
  formatarTempoAuditado,
  registroVisitaInicial,
  type HistoricoVisita,
  type RegistroVisita,
  type StatusVisita,
} from "@/lib/visita";

type LojaVisita = {
  id: string;
  rotulo: string;
};

type VisitaGpsCheckinProps = {
  brand: BrandTheme;
  regiao?: string;
  lojas?: LojaVisita[];
  carregandoLojas?: boolean;
  onStatusVisitaChange?: (status: StatusVisita) => void;
  onLojaAtualChange?: (loja: { id: string; rotulo: string }) => void;
};

export function VisitaGpsCheckin({
  brand,
  regiao = "Manaus",
  lojas = [],
  carregandoLojas = false,
  onStatusVisitaChange,
  onLojaAtualChange,
}: VisitaGpsCheckinProps) {
  const [lojaSelecionada, setLojaSelecionada] = useState("");
  const [statusVisita, setStatusVisita] = useState<StatusVisita>("disponivel");
  const [registroVisita, setRegistroVisita] =
    useState<RegistroVisita>(registroVisitaInicial);
  const [historicoSessao, setHistoricoSessao] = useState<HistoricoVisita[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tempoDecorridoMs, setTempoDecorridoMs] = useState(0);
  const [ultimaVisitaConcluida, setUltimaVisitaConcluida] = useState<
    string | null
  >(null);

  const lojaAtual =
    lojas.find((loja) => loja.id === lojaSelecionada) ?? lojas[0] ?? null;

  const dropdownBloqueado = statusVisita === "em_andamento";
  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  useEffect(() => {
    if (lojas.length === 0) {
      setLojaSelecionada("");
      return;
    }

    if (!lojas.some((loja) => loja.id === lojaSelecionada)) {
      setLojaSelecionada(lojas[0].id);
    }
  }, [lojas, lojaSelecionada]);

  useEffect(() => {
    onStatusVisitaChange?.(statusVisita);
  }, [statusVisita, onStatusVisitaChange]);

  useEffect(() => {
    if (!lojaAtual) {
      return;
    }

    onLojaAtualChange?.({ id: lojaAtual.id, rotulo: lojaAtual.rotulo });
  }, [lojaAtual, onLojaAtualChange]);

  useEffect(() => {
    if (statusVisita !== "em_andamento" || !registroVisita.horaEntrada) {
      return;
    }

    const atualizarCronometro = () => {
      setTempoDecorridoMs(
        Date.now() - registroVisita.horaEntrada!.getTime(),
      );
    };

    atualizarCronometro();
    const intervalId = window.setInterval(atualizarCronometro, 1000);

    return () => window.clearInterval(intervalId);
  }, [statusVisita, registroVisita.horaEntrada]);

  function resetVisitaAtiva() {
    setStatusVisita("disponivel");
    setRegistroVisita(registroVisitaInicial);
    setFeedback(null);
    setTempoDecorridoMs(0);
    setLoading(false);
  }

  function handleMudancaLoja(novaLojaId: string) {
    if (dropdownBloqueado) {
      return;
    }

    setLojaSelecionada(novaLojaId);
    setUltimaVisitaConcluida(null);
    resetVisitaAtiva();
  }

  function finalizarCheckin(
    latitude: number,
    longitude: number,
    origem: "gps" | "fallback" = "gps",
  ) {
    if (!lojaAtual) {
      setLoading(false);
      return;
    }

    const horaEntrada = new Date();
    const enderecoConfirmado = formatCheckinMessage(
      latitude,
      longitude,
      regiao,
    );
    const avisoLocalizacao =
      origem === "fallback"
        ? " Localização estimada (GPS indisponível nesta conexão — check-in liberado para continuar)."
        : "";

    setRegistroVisita({
      lojaId: lojaAtual.id,
      lojaNome: lojaAtual.rotulo,
      data: extrairDataIso(horaEntrada),
      horaEntrada,
      horaSaida: null,
      tempoTotalMs: null,
      latitude,
      longitude,
      enderecoConfirmado,
    });
    setFeedback(`${enderecoConfirmado}${avisoLocalizacao}`);
    setTempoDecorridoMs(0);
    setUltimaVisitaConcluida(null);
    setStatusVisita("em_andamento");
    setLoading(false);
  }

  async function handleCheckin() {
    if (!lojaAtual || loading) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const coordenadas = await obterCoordenadasParaCheckin(regiao);
      finalizarCheckin(
        coordenadas.latitude,
        coordenadas.longitude,
        coordenadas.origem,
      );
    } catch {
      setLoading(false);
      setFeedback(
        "Não foi possível concluir o check-in. Tente novamente em alguns segundos.",
      );
    }
  }

  function handleCheckout() {
    if (!registroVisita.horaEntrada) {
      return;
    }

    const horaSaida = new Date();
    const tempoTotalMs =
      horaSaida.getTime() - registroVisita.horaEntrada.getTime();

    const visitaConcluida: HistoricoVisita = {
      id: crypto.randomUUID(),
      lojaId: registroVisita.lojaId ?? lojaAtual?.id ?? "",
      lojaNome: registroVisita.lojaNome ?? lojaAtual?.rotulo ?? "",
      data: registroVisita.data,
      horaEntrada: registroVisita.horaEntrada,
      horaSaida,
      tempoTotalMs,
      latitude: registroVisita.latitude,
      longitude: registroVisita.longitude,
      enderecoConfirmado: registroVisita.enderecoConfirmado,
    };

    setHistoricoSessao((atual) => [visitaConcluida, ...atual]);
    setUltimaVisitaConcluida(
      `Visita concluída em ${visitaConcluida.lojaNome}! Tempo total auditado: ${formatarTempoAuditado(tempoTotalMs)}.`,
    );
    resetVisitaAtiva();
  }

  const mostrarMapa = statusVisita === "em_andamento";

  return (
    <div
      className="mt-8 rounded-2xl border p-6"
      style={{
        borderColor: brand.primaryLight,
        backgroundColor: "rgba(248, 250, 252, 0.8)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Controle de Visita (GPS)
          </p>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            {statusVisita === "disponivel"
              ? "Selecione a loja e registre sua presença antes de iniciar as atividades. Você pode trocar de loja a qualquer momento, desde que não haja visita em andamento."
              : "Visita em andamento. Registre a saída ao concluir as atividades na loja atual."}
          </p>
        </div>

        <div className="flex w-full min-w-[240px] flex-col gap-3 sm:w-auto sm:min-w-[280px]">
          <div>
            <label
              htmlFor="loja-atual"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Selecione a Loja Atual
            </label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="loja-atual"
                value={lojaSelecionada}
                onChange={(event) => handleMudancaLoja(event.target.value)}
                disabled={dropdownBloqueado || carregandoLojas || lojas.length === 0}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                style={inputRingStyle}
              >
                {carregandoLojas ? (
                  <option value="">Carregando lojas...</option>
                ) : lojas.length === 0 ? (
                  <option value="">Nenhuma loja vinculada</option>
                ) : (
                  lojas.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.rotulo}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {dropdownBloqueado ? (
              <p className="mt-2 text-xs text-amber-700">
                Finalize o check-out na loja atual para trocar de loja.
              </p>
            ) : null}
          </div>

          {statusVisita === "disponivel" ? (
            <button
              type="button"
              onClick={() => void handleCheckin()}
              disabled={loading || !lojaAtual}
              className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              style={{ backgroundColor: "#166534", WebkitTapHighlightColor: "transparent" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Fazer Check-in na Loja
            </button>
          ) : null}

          {statusVisita === "em_andamento" ? (
            <button
              type="button"
              onClick={handleCheckout}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Fazer Check-out (Registrar Saída)
            </button>
          ) : null}
        </div>
      </div>

      {ultimaVisitaConcluida ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {ultimaVisitaConcluida}
        </p>
      ) : null}

      {statusVisita === "em_andamento" && registroVisita.horaEntrada ? (
        <div className="mt-6 space-y-4">
          <p
            className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700"
            style={{
              borderColor: brand.primaryLight,
              backgroundColor: brand.primaryLight,
              color: brand.primary,
            }}
          >
            Loja em visita:{" "}
            <span className="font-semibold">{registroVisita.lojaNome}</span>
          </p>

          {feedback ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {feedback}
            </p>
          ) : null}

          <div
            className="rounded-xl border bg-white px-4 py-4"
            style={{ borderColor: brand.primaryLight }}
          >
            <p className="text-sm font-medium text-slate-700">
              Entrada registrada em:{" "}
              <span className="font-semibold text-slate-900">
                {formatarEntrada(registroVisita.horaEntrada)}
              </span>
            </p>
            <p
              className="mt-3 font-mono text-2xl font-semibold tracking-wide"
              style={{ color: brand.primary }}
            >
              Tempo atual na loja: {formatarCronometro(tempoDecorridoMs)}
            </p>
          </div>

          {mostrarMapa &&
          registroVisita.latitude !== null &&
          registroVisita.longitude !== null ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Prévia — painel Administrador / Diretor
              </p>
              <GoogleMapsPlaceholder
                latitude={registroVisita.latitude}
                longitude={registroVisita.longitude}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {historicoSessao.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Histórico da sessão (prévia do banco)
          </p>
          <div className="space-y-3">
            {historicoSessao.map((visita) => (
              <div
                key={visita.id}
                className="rounded-xl border bg-white px-4 py-4 text-sm text-slate-600"
                style={{ borderColor: brand.primaryLight }}
              >
                <p className="font-semibold text-slate-800">{visita.lojaNome}</p>
                <p className="mt-2">
                  <span className="font-medium text-slate-700">Entrada:</span>{" "}
                  {visita.horaEntrada
                    ? formatarEntrada(visita.horaEntrada)
                    : "—"}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-700">Saída:</span>{" "}
                  {visita.horaSaida ? formatarEntrada(visita.horaSaida) : "—"}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-700">Tempo total:</span>{" "}
                  {visita.tempoTotalMs !== null
                    ? `${formatarTempoAuditado(visita.tempoTotalMs)} (${formatarCronometro(visita.tempoTotalMs)})`
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
