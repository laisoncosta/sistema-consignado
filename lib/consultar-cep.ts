import { geocodificarEnderecoLoja } from "@/lib/endereco-loja";
import { normalizarUf } from "@/lib/uf-regiao";

export type EnderecoCep = {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  latitude: number | null;
  longitude: number | null;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export function formatarCepResposta(cep: string): string {
  const digitos = cep.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) {
    return digitos;
  }
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export async function consultarCep(cepBruto: string): Promise<EnderecoCep | null> {
  const cep = cepBruto.replace(/\D/g, "");

  if (cep.length !== 8) {
    return null;
  }

  const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

  if (!viaCepResponse.ok) {
    return null;
  }

  const viaCep = (await viaCepResponse.json()) as ViaCepResponse;

  if (viaCep.erro) {
    return null;
  }

  const rua = viaCep.logradouro?.trim() ?? "";
  const bairro = viaCep.bairro?.trim() ?? "";
  const cidade = viaCep.localidade?.trim() ?? "";
  const uf = normalizarUf(viaCep.uf);

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (rua && uf) {
    const geocodificado = await geocodificarEnderecoLoja({
      rua,
      numero: "S/N",
      bairro: bairro || cidade,
      cidade,
      uf,
      cep,
    });
    latitude = geocodificado.latitude;
    longitude = geocodificado.longitude;
  }

  return {
    cep: formatarCepResposta(cep),
    rua,
    bairro,
    cidade,
    latitude,
    longitude,
  };
}
