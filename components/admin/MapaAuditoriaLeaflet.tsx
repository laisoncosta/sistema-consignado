"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

import type { PontoAuditoriaMapa } from "@/components/admin/MapaAuditoriaPedido";

import "leaflet/dist/leaflet.css";

type MapaAuditoriaLeafletProps = {
  pontos: PontoAuditoriaMapa[];
  distanciaMetros?: number | null;
};

function criarIconeMarcador(cor: string) {
  return L.divIcon({
    className: "mapa-auditoria-marcador",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${cor};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function AjustarVisaoMapa({ pontos }: { pontos: PontoAuditoriaMapa[] }) {
  const map = useMap();

  useEffect(() => {
    if (pontos.length === 1) {
      map.setView([pontos[0].lat, pontos[0].lng], 17, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(
      pontos.map((ponto) => [ponto.lat, ponto.lng] as [number, number]),
    );

    map.fitBounds(bounds.pad(0.55), { animate: false });
  }, [map, pontos]);

  return null;
}

export function MapaAuditoriaLeaflet({
  pontos,
  distanciaMetros,
}: MapaAuditoriaLeafletProps) {
  const centro = pontos.reduce(
    (acc, ponto) => ({
      lat: acc.lat + ponto.lat / pontos.length,
      lng: acc.lng + ponto.lng / pontos.length,
    }),
    { lat: 0, lng: 0 },
  );

  const linhaConexao =
    pontos.length === 2
      ? ([
          [pontos[0].lat, pontos[0].lng],
          [pontos[1].lat, pontos[1].lng],
        ] as [number, number][])
      : null;

  const distanciaTexto =
    distanciaMetros != null && Number.isFinite(distanciaMetros)
      ? `${Math.round(distanciaMetros)} m`
      : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <MapContainer
        center={[centro.lat, centro.lng]}
        zoom={16}
        className="z-0 h-[280px] w-full"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVisaoMapa pontos={pontos} />
        {linhaConexao ? (
          <Polyline
            positions={linhaConexao}
            pathOptions={{
              color: "#64748b",
              weight: 2,
              dashArray: "6 6",
            }}
          />
        ) : null}
        {pontos.map((ponto) => (
          <Marker
            key={ponto.rotulo}
            position={[ponto.lat, ponto.lng]}
            icon={criarIconeMarcador(ponto.cor)}
            title={ponto.rotulo}
          />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex flex-wrap gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm">
        {pontos.map((ponto) => (
          <span key={ponto.rotulo} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: ponto.cor }}
              aria-hidden="true"
            />
            {ponto.rotulo}
          </span>
        ))}
        {distanciaTexto ? (
          <span className="text-slate-500">· {distanciaTexto}</span>
        ) : null}
      </div>
    </div>
  );
}
