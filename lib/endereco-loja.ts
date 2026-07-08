import { normalizarUf, ufValida } from "@/lib/uf-regiao";

export type EnderecoLojaGeocoding = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep?: string;
};

export function montarEnderecoCompletoGeocoding(
  endereco: EnderecoLojaGeocoding,
): string {
  const rua = endereco.rua.trim();
  const numero = endereco.numero.trim();
  const bairro = endereco.bairro.trim();
  const cidade = endereco.cidade.trim();
  const uf = normalizarUf(endereco.uf);

  if (!rua || !numero || !bairro || !cidade || !ufValida(uf)) {
    return "";
  }

  return `${rua}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil`;
}

export type ResultadoGeocodingEndereco = {
  latitude: number | null;
  longitude: number | null;
  enderecoConsultado: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

const NOMINATIM_HEADERS = { "User-Agent": "Sistema-Consignado/1.0" };

async function consultarNominatim(
  params: Record<string, string>,
): Promise<NominatimResult | null> {
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");

  for (const [chave, valor] of Object.entries(params)) {
    if (valor.trim()) {
      geocodeUrl.searchParams.set(chave, valor.trim());
    }
  }

  geocodeUrl.searchParams.set("format", "json");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("countrycodes", "br");

  const geocodeResponse = await fetch(geocodeUrl.toString(), {
    headers: NOMINATIM_HEADERS,
    next: { revalidate: 86400 },
  });

  if (!geocodeResponse.ok) {
    return null;
  }

  const resultados = (await geocodeResponse.json()) as NominatimResult[];
  return resultados[0] ?? null;
}

function resultadoDeNominatim(
  item: NominatimResult | null,
  enderecoConsultado: string,
): ResultadoGeocodingEndereco {
  if (!item?.lat || !item?.lon) {
    return {
      latitude: null,
      longitude: null,
      enderecoConsultado,
    };
  }

  const latitude = Number(item.lat);
  const longitude = Number(item.lon);

  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    enderecoConsultado,
  };
}

export async function geocodificarEnderecoLoja(
  endereco: EnderecoLojaGeocoding,
): Promise<ResultadoGeocodingEndereco> {
  const enderecoConsultado = montarEnderecoCompletoGeocoding(endereco);
  const uf = normalizarUf(endereco.uf);
  const rua = endereco.rua.trim();
  const numero = endereco.numero.trim();
  const bairro = endereco.bairro.trim();
  const cidade = endereco.cidade.trim();
  const cepDigitos = endereco.cep?.replace(/\D/g, "") ?? "";

  if (!enderecoConsultado) {
    return {
      latitude: null,
      longitude: null,
      enderecoConsultado: "",
    };
  }

  const tentativas: Array<Record<string, string>> = [
    {
      street: `${numero} ${rua}`,
      city: cidade,
      state: uf,
      country: "Brasil",
    },
    { q: enderecoConsultado },
    { q: `${rua}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil` },
  ];

  if (cepDigitos.length === 8) {
    const cepFormatado = `${cepDigitos.slice(0, 5)}-${cepDigitos.slice(5)}`;
    tentativas.push({
      q: `${cepFormatado}, ${cidade}, ${uf}, Brasil`,
    });
  }

  for (const params of tentativas) {
    const resultado = await consultarNominatim(params);
    const coords = resultadoDeNominatim(resultado, enderecoConsultado);

    if (coords.latitude != null && coords.longitude != null) {
      return coords;
    }
  }

  return {
    latitude: null,
    longitude: null,
    enderecoConsultado,
  };
}
