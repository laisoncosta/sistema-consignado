export type ReverseGeocodeResult = {
  estabelecimento: string;
  endereco: string;
};

const mockLocationsByRegiao: Record<string, ReverseGeocodeResult> = {
  Manaus: {
    estabelecimento: "Supermercado Nova Era",
    endereco: "Av. Brasil, Manaus",
  },
  "Rio Branco": {
    estabelecimento: "Mercado Buriti Centro",
    endereco: "Rua Benjamin Constant, Rio Branco",
  },
};

export function mockReverseGeocode(
  _latitude: number,
  _longitude: number,
  regiao = "Manaus",
): ReverseGeocodeResult {
  return (
    mockLocationsByRegiao[regiao] ?? {
      estabelecimento: "Loja Consignada",
      endereco: `${regiao}`,
    }
  );
}

export function formatCheckinMessage(
  latitude: number,
  longitude: number,
  regiao = "Manaus",
): string {
  const { estabelecimento, endereco } = mockReverseGeocode(
    latitude,
    longitude,
    regiao,
  );

  return `Check-in registrado no ${estabelecimento} (${endereco}) - Coordenadas: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

const FALLBACK_COORDINATES_BY_REGIAO: Record<
  string,
  { latitude: number; longitude: number }
> = {
  Manaus: { latitude: -3.10194, longitude: -60.025 },
  "Rio Branco": { latitude: -9.97472, longitude: -67.80997 },
};

export function getFallbackCoordinates(regiao = "Manaus") {
  return (
    FALLBACK_COORDINATES_BY_REGIAO[regiao] ?? FALLBACK_COORDINATES_BY_REGIAO.Manaus
  );
}

type CoordenadasCheckinResult = {
  latitude: number;
  longitude: number;
  origem: "gps" | "fallback";
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8_000,
  maximumAge: 0,
};

export function obterCoordenadasParaCheckin(
  regiao = "Manaus",
): Promise<CoordenadasCheckinResult> {
  const fallback = getFallbackCoordinates(regiao);

  return new Promise((resolve) => {
    let concluido = false;

    const finalizar = (
      latitude: number,
      longitude: number,
      origem: CoordenadasCheckinResult["origem"],
    ) => {
      if (concluido) {
        return;
      }

      concluido = true;
      resolve({ latitude, longitude, origem });
    };

    if (typeof window === "undefined") {
      finalizar(fallback.latitude, fallback.longitude, "fallback");
      return;
    }

    if (!window.isSecureContext || !navigator.geolocation) {
      finalizar(fallback.latitude, fallback.longitude, "fallback");
      return;
    }

    const watchdog = window.setTimeout(() => {
      finalizar(fallback.latitude, fallback.longitude, "fallback");
    }, 10_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(watchdog);
        finalizar(
          position.coords.latitude,
          position.coords.longitude,
          "gps",
        );
      },
      () => {
        window.clearTimeout(watchdog);
        finalizar(fallback.latitude, fallback.longitude, "fallback");
      },
      GEOLOCATION_OPTIONS,
    );
  });
}
