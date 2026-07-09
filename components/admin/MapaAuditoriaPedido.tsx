"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

type MapaAuditoriaPedidoProps = {
  latitudeEnvio: number | null;
  longitudeEnvio: number | null;
  latitudeLoja: number | null;
  longitudeLoja: number | null;
  distanciaMetros?: number | null;
};

export type PontoAuditoriaMapa = {
  lat: number;
  lng: number;
  rotulo: string;
  descricao: string;
  cor: "#10b981" | "#f43f5e";
  corBadge: "emerald" | "rose";
};

function coordenadaValida(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

export function formatarCoordenadaMapa(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function montarPontosAuditoriaMapa(props: MapaAuditoriaPedidoProps): PontoAuditoriaMapa[] {
  const pontos: PontoAuditoriaMapa[] = [];

  if (coordenadaValida(props.latitudeLoja, props.longitudeLoja)) {
    pontos.push({
      lat: props.latitudeLoja!,
      lng: props.longitudeLoja!,
      rotulo: "Loja",
      descricao: "Coordenada cadastrada da cerca virtual",
      cor: "#10b981",
      corBadge: "emerald",
    });
  }

  if (coordenadaValida(props.latitudeEnvio, props.longitudeEnvio)) {
    pontos.push({
      lat: props.latitudeEnvio!,
      lng: props.longitudeEnvio!,
      rotulo: "Envio do pedido",
      descricao: "GPS registrado no momento do envio pelo promotor",
      cor: "#f43f5e",
      corBadge: "rose",
    });
  }

  return pontos;
}

function calcularCentro(pontos: PontoAuditoriaMapa[]): { lat: number; lng: number } {
  const lat =
    pontos.reduce((total, ponto) => total + ponto.lat, 0) / pontos.length;
  const lng =
    pontos.reduce((total, ponto) => total + ponto.lng, 0) / pontos.length;

  return { lat, lng };
}

function calcularZoom(pontos: PontoAuditoriaMapa[]): number {
  if (pontos.length === 1) {
    return 16;
  }

  const lats = pontos.map((ponto) => ponto.lat);
  const lngs = pontos.map((ponto) => ponto.lng);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const span = Math.max(latSpan, lngSpan);

  if (span < 0.0004) return 18;
  if (span < 0.001) return 17;
  if (span < 0.004) return 16;
  if (span < 0.015) return 15;
  if (span < 0.05) return 14;
  if (span < 0.15) return 13;
  return 12;
}

function montarUrlAbrirMapa(pontos: PontoAuditoriaMapa[]): string {
  const centro = calcularCentro(pontos);
  const zoom = calcularZoom(pontos);

  return `https://www.openstreetmap.org/#map=${zoom}/${centro.lat}/${centro.lng}`;
}

const MapaAuditoriaLeaflet = dynamic(
  () =>
    import("@/components/admin/MapaAuditoriaLeaflet").then(
      (modulo) => modulo.MapaAuditoriaLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando mapa...
      </div>
    ),
  },
);

export function MapaAuditoriaPedido(props: MapaAuditoriaPedidoProps) {
  const pontos = montarPontosAuditoriaMapa(props);

  if (pontos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
        Coordenadas indisponíveis para exibir o mapa.
      </p>
    );
  }

  const urlAbrirMapa = montarUrlAbrirMapa(pontos);
  const distanciaTexto =
    props.distanciaMetros != null && Number.isFinite(props.distanciaMetros)
      ? `${Math.round(props.distanciaMetros)} m entre loja e envio`
      : null;

  return (
    <div className="space-y-3">
      <MapaAuditoriaLeaflet pontos={pontos} distanciaMetros={props.distanciaMetros} />

      <div className="grid gap-2 sm:grid-cols-2">
        {pontos.map((ponto) => (
          <div
            key={ponto.rotulo}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  ponto.corBadge === "emerald" ? "bg-emerald-500" : "bg-rose-500"
                }`}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-slate-800">{ponto.rotulo}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{ponto.descricao}</p>
            <p className="mt-1 font-mono text-xs text-slate-700">
              {formatarCoordenadaMapa(ponto.lat, ponto.lng)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          Mapa fixo para auditoria — os marcadores permanecem no local ao rolar a
          tela.
          {distanciaTexto ? ` Distância: ${distanciaTexto}.` : null}
        </p>
        <a
          href={urlAbrirMapa}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-700 underline-offset-2 hover:underline"
        >
          Abrir no OpenStreetMap
        </a>
      </div>
    </div>
  );
}
