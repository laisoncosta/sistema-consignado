import { geocodificarEnderecoLoja } from "@/lib/endereco-loja";
import { ufPorNomeRegiao } from "@/lib/uf-regiao";

export async function resolverCoordenadasLoja(params: {
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  uf?: string | null;
  regiaoNome: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<{ latitude: number | null; longitude: number | null }> {
  const rua = params.rua?.trim() ?? "";
  const numero = params.numero?.trim() ?? "";
  const bairro = params.bairro?.trim() ?? "";
  const cidade = params.cidade?.trim() ?? "";

  if (!rua || !numero || !bairro || !cidade) {
    return {
      latitude: params.latitude,
      longitude: params.longitude,
    };
  }

  const uf =
    params.uf?.trim().toUpperCase().slice(0, 2) ||
    ufPorNomeRegiao(params.regiaoNome);

  const geocodificado = await geocodificarEnderecoLoja({
    rua,
    numero,
    bairro,
    cidade,
    uf,
    cep: params.cep ?? undefined,
  });

  return {
    latitude: geocodificado.latitude ?? params.latitude,
    longitude: geocodificado.longitude ?? params.longitude,
  };
}
