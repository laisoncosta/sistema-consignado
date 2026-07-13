export type StatusCercaVirtualLoja = "ativar" | "desativar";
export type StatusCercaVirtualPromotor = "ativar" | "inativar";

export type ConfigCercaVirtualLoja = {
  cercaVirtualAtiva: boolean;
  latitude: number | null;
  longitude: number | null;
  perimetroCerca: number;
};

export type ConfigCercaVirtualPromotor = {
  cercaVirtualAtiva: boolean;
};

export function statusCercaLojaParaBoolean(
  status: StatusCercaVirtualLoja,
): boolean {
  return status === "ativar";
}

export function booleanParaStatusCercaLoja(
  ativa: boolean,
): StatusCercaVirtualLoja {
  return ativa ? "ativar" : "desativar";
}

export function statusCercaPromotorParaBoolean(
  status: StatusCercaVirtualPromotor,
): boolean {
  return status === "ativar";
}

export function booleanParaStatusCercaPromotor(
  ativa: boolean,
): StatusCercaVirtualPromotor {
  return ativa ? "ativar" : "inativar";
}

export function normalizarPerimetroCerca(valor: unknown): number {
  const numero = Number.parseInt(String(valor ?? "0"), 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

/** Triplo check: valida GPS se o promotor tem cerca ativa (loja incompleta = bloqueio). */
export function cercaVirtualDeveValidarGps(
  promotor: ConfigCercaVirtualPromotor,
  loja: ConfigCercaVirtualLoja,
): boolean {
  void loja;
  return promotor.cercaVirtualAtiva;
}

export function lojaCompletaParaCercaVirtual(
  loja: ConfigCercaVirtualLoja,
): boolean {
  return (
    loja.cercaVirtualAtiva &&
    loja.perimetroCerca > 0 &&
    loja.latitude != null &&
    loja.longitude != null &&
    Number.isFinite(loja.latitude) &&
    Number.isFinite(loja.longitude)
  );
}

export function distanciaMetrosHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const raioTerraMetros = 6_371_000;
  const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

  const dLat = paraRadianos(lat2 - lat1);
  const dLon = paraRadianos(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(lat1)) *
      Math.cos(paraRadianos(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return raioTerraMetros * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ResultadoValidacaoCercaVirtual = {
  exigeValidacao: boolean;
  permitido: boolean;
  distanciaMetros?: number;
  erro?: string;
};

export function validarPedidoCercaVirtual(params: {
  promotor: ConfigCercaVirtualPromotor;
  loja: ConfigCercaVirtualLoja;
  latitude?: number | null;
  longitude?: number | null;
}): ResultadoValidacaoCercaVirtual {
  if (!cercaVirtualDeveValidarGps(params.promotor, params.loja)) {
    return { exigeValidacao: false, permitido: true };
  }

  if (!lojaCompletaParaCercaVirtual(params.loja)) {
    return {
      exigeValidacao: true,
      permitido: false,
      erro:
        "Esta loja ainda não possui cerca virtual completa (coordenadas e perímetro). Contate o administrador.",
    };
  }

  const latitudePromotor = params.latitude;
  const longitudePromotor = params.longitude;

  if (
    latitudePromotor == null ||
    longitudePromotor == null ||
    !Number.isFinite(latitudePromotor) ||
    !Number.isFinite(longitudePromotor)
  ) {
    return {
      exigeValidacao: true,
      permitido: false,
      erro:
        "A cerca virtual está ativa. Ative o GPS e permita o acesso à localização para enviar o pedido.",
    };
  }

  const distanciaMetros = distanciaMetrosHaversine(
    latitudePromotor,
    longitudePromotor,
    params.loja.latitude!,
    params.loja.longitude!,
  );

  if (distanciaMetros > params.loja.perimetroCerca) {
    return {
      exigeValidacao: true,
      permitido: false,
      distanciaMetros,
      erro: `Você está fora do perímetro da loja (${Math.round(distanciaMetros)} m; permitido: ${params.loja.perimetroCerca} m). Aproxime-se da loja para enviar o pedido.`,
    };
  }

  return {
    exigeValidacao: true,
    permitido: true,
    distanciaMetros,
  };
}
