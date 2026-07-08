type MapaAuditoriaPedidoProps = {
  latitudeEnvio: number | null;
  longitudeEnvio: number | null;
  latitudeLoja: number | null;
  longitudeLoja: number | null;
};

type PontoMapa = {
  lat: number;
  lng: number;
  rotulo: string;
  cor: "emerald" | "rose";
};

type BboxMapa = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
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

function montarBbox(pontos: PontoMapa[]): BboxMapa {
  const lats = pontos.map((p) => p.lat);
  const lngs = pontos.map((p) => p.lng);

  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const deltaLat = maxLat - minLat;
  const deltaLng = maxLng - minLng;
  const paddingLat = Math.max(deltaLat * 0.35, 0.004);
  const paddingLng = Math.max(deltaLng * 0.35, 0.004);

  minLat -= paddingLat;
  maxLat += paddingLat;
  minLng -= paddingLng;
  maxLng += paddingLng;

  return { minLng, minLat, maxLng, maxLat };
}

function montarUrlEmbed(bbox: BboxMapa, marcador?: PontoMapa): string {
  const params = new URLSearchParams({
    bbox: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    layer: "mapnik",
  });

  if (marcador) {
    params.set("marker", `${marcador.lat},${marcador.lng}`);
  }

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function calcularPosicaoMarcador(
  ponto: PontoMapa,
  bbox: BboxMapa,
): { left: string; top: string } {
  const lngRange = bbox.maxLng - bbox.minLng || 0.0001;
  const latRange = bbox.maxLat - bbox.minLat || 0.0001;

  const leftPct = ((ponto.lng - bbox.minLng) / lngRange) * 100;
  const topPct = ((bbox.maxLat - ponto.lat) / latRange) * 100;

  return {
    left: `${Math.min(96, Math.max(4, leftPct))}%`,
    top: `${Math.min(92, Math.max(8, topPct))}%`,
  };
}

export function MapaAuditoriaPedido(props: MapaAuditoriaPedidoProps) {
  const pontos: PontoMapa[] = [];

  if (coordenadaValida(props.latitudeLoja, props.longitudeLoja)) {
    pontos.push({
      lat: props.latitudeLoja!,
      lng: props.longitudeLoja!,
      rotulo: "Loja",
      cor: "emerald",
    });
  }

  if (coordenadaValida(props.latitudeEnvio, props.longitudeEnvio)) {
    pontos.push({
      lat: props.latitudeEnvio!,
      lng: props.longitudeEnvio!,
      rotulo: "Envio do promotor",
      cor: "rose",
    });
  }

  if (pontos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
        Coordenadas indisponíveis para exibir o mapa.
      </p>
    );
  }

  const bbox = montarBbox(pontos);
  const urlEmbed = montarUrlEmbed(
    bbox,
    pontos.length === 1 ? pontos[0] : undefined,
  );
  const exibirOverlay = pontos.length > 1;

  return (
    <div className="space-y-2">
      <div className="relative h-[200px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <iframe
          width="100%"
          height="200"
          className="absolute inset-0 h-full w-full border-0"
          title="Mapa comparativo entre loja e ponto de envio do pedido"
          loading="lazy"
          src={urlEmbed}
        />
        {exibirOverlay
          ? pontos.map((ponto) => {
              const posicao = calcularPosicaoMarcador(ponto, bbox);

              return (
                <span
                  key={ponto.rotulo}
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
                  style={{ left: posicao.left, top: posicao.top }}
                  title={ponto.rotulo}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md ${
                      ponto.cor === "emerald" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                </span>
              );
            })
          : null}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {pontos.map((ponto) => (
          <span key={ponto.rotulo} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                ponto.cor === "emerald" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {ponto.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
