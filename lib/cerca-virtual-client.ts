import {
  distanciaMetrosHaversine,
  type ConfigCercaVirtualLoja,
  type ConfigCercaVirtualPromotor,
} from "@/lib/cerca-virtual";

export const MENSAGEM_PEDIDO_BLOQUEADO = "Pedido Bloqueado";

export const MENSAGEM_PEDIDO_BLOQUEADO_ENVIO =
  "Pedido Bloqueado - Você precisa estar na loja para acessar o portal de pedidos";

export const MENSAGEM_LOCALIZACAO_IMPRESA =
  "Localização aproximada detectada. Nas permissões deste site, ative a localização 'Exata' (não 'Aproximada') e toque em Tentar Novamente.";

export const MENSAGEM_LOJA_SEM_CERCA_CONFIGURADA =
  "Esta loja ainda não possui cerca virtual completa (coordenadas e perímetro). Contate o administrador.";

export const OPCOES_GPS_CERCA: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 3_000,
};

/** Leitura instantânea no clique de envio (sem cache). */
export const OPCOES_GPS_ENVIO_DEFINITIVO: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

/** Margem máxima aplicada à imprecisão reportada pelo GPS (metros). */
export const MARGEM_GPS_MAXIMA_METROS = 40;

/** Precisão máxima aceita — acima disso a localização é considerada aproximada/inválida. */
export const PRECISAO_GPS_MAXIMA_METROS = 100;

/** Leituras consecutivas iguais necessárias para alternar bloqueado/liberado. */
export const LEITURAS_GPS_ESTAVEIS = 2;

export type CoordenadasGpsCerca = {
  latitude: number;
  longitude: number;
  accuracyMetros: number | null;
};

export type ConfigCercaVirtualApi = {
  exigeValidacao: boolean;
  promotor: ConfigCercaVirtualPromotor;
  loja: ConfigCercaVirtualLoja;
};

export type EstadoCercaVirtualUi =
  | "inativo"
  | "verificando"
  | "visita_inicial"
  | "pedido_extra"
  | "bloqueado";

export type ResultadoAvaliacaoCercaCliente = {
  dentroPerimetro: boolean;
  distanciaMetros: number;
  perimetroMetros: number;
  coordenadasValidas: boolean;
};

function statusCercaAtivo(valor: unknown): boolean {
  if (typeof valor === "boolean") {
    return valor;
  }

  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();
    return normalizado === "ativar" || normalizado === "ativa" || normalizado === "true";
  }

  return Boolean(valor);
}

function normalizarCoordenada(valor: unknown): number | null {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

/** Perímetro em metros — aceita `perimetro` ou `perimetroCerca` da API. */
export function obterPerimetroMaximo(loja: ConfigCercaVirtualLoja): number {
  const bruto =
    (loja as ConfigCercaVirtualLoja & { perimetro?: unknown }).perimetro ??
    loja.perimetroCerca;

  const perimetroMaximo = Number(bruto);

  if (!Number.isFinite(perimetroMaximo) || perimetroMaximo <= 0) {
    return 0;
  }

  return perimetroMaximo;
}

export function normalizarLojaCercaCliente(
  loja: ConfigCercaVirtualLoja,
): ConfigCercaVirtualLoja {
  return {
    cercaVirtualAtiva: statusCercaAtivo(loja.cercaVirtualAtiva),
    latitude: normalizarCoordenada(loja.latitude),
    longitude: normalizarCoordenada(loja.longitude),
    perimetroCerca: obterPerimetroMaximo(loja),
  };
}

export function normalizarPromotorCercaCliente(
  promotor: ConfigCercaVirtualPromotor,
): ConfigCercaVirtualPromotor {
  return {
    cercaVirtualAtiva: statusCercaAtivo(promotor.cercaVirtualAtiva),
  };
}

/**
 * Concordância: loja E promotor com status "Ativar".
 * Se qualquer um estiver "Desativar", modo contingência (sem GPS).
 */
export function cercaConcordanciaAtiva(
  promotor: ConfigCercaVirtualPromotor,
  loja: ConfigCercaVirtualLoja,
): boolean {
  const promotorNormalizado = normalizarPromotorCercaCliente(promotor);
  const lojaNormalizada = normalizarLojaCercaCliente(loja);

  return (
    promotorNormalizado.cercaVirtualAtiva && lojaNormalizada.cercaVirtualAtiva
  );
}

/** Promotor com cerca ativa, mas loja sem coordenadas/perímetro válidos. */
export function lojaIncompletaParaCercaPromotor(
  promotor: ConfigCercaVirtualPromotor,
  loja: ConfigCercaVirtualLoja,
): boolean {
  const promotorNormalizado = normalizarPromotorCercaCliente(promotor);
  if (!promotorNormalizado.cercaVirtualAtiva) {
    return false;
  }

  const lojaNormalizada = normalizarLojaCercaCliente(loja);
  const temCoords =
    lojaNormalizada.latitude != null && lojaNormalizada.longitude != null;
  const temPerimetro = obterPerimetroMaximo(lojaNormalizada) > 0;

  return !(lojaNormalizada.cercaVirtualAtiva && temCoords && temPerimetro);
}

/**
 * Exige GPS quando o promotor tem cerca ativa.
 * Se a loja estiver incompleta, o fluxo bloqueia na validação.
 */
export function cercaExigeValidacaoGps(
  promotor: ConfigCercaVirtualPromotor,
  _loja: ConfigCercaVirtualLoja,
): boolean {
  return normalizarPromotorCercaCliente(promotor).cercaVirtualAtiva;
}

export function normalizarCercaVirtualApi(
  config: ConfigCercaVirtualApi | null | undefined,
): ConfigCercaVirtualApi | null {
  if (!config) {
    return null;
  }

  const promotor = normalizarPromotorCercaCliente(config.promotor);
  const loja = normalizarLojaCercaCliente(config.loja);

  return {
    exigeValidacao: cercaExigeValidacaoGps(promotor, loja),
    promotor,
    loja,
  };
}

export function avaliarPosicaoCercaVirtual(
  latitude: number,
  longitude: number,
  loja: ConfigCercaVirtualLoja,
): ResultadoAvaliacaoCercaCliente {
  const latitudePromotor = normalizarCoordenada(latitude);
  const longitudePromotor = normalizarCoordenada(longitude);
  const latitudeLoja = normalizarCoordenada(loja.latitude);
  const longitudeLoja = normalizarCoordenada(loja.longitude);
  const perimetroMaximo = obterPerimetroMaximo(loja);

  if (latitudePromotor == null || longitudePromotor == null) {
    return {
      dentroPerimetro: false,
      distanciaMetros: Number.POSITIVE_INFINITY,
      perimetroMetros: perimetroMaximo,
      coordenadasValidas: false,
    };
  }

  if (
    latitudeLoja == null ||
    longitudeLoja == null ||
    perimetroMaximo <= 0
  ) {
    return {
      dentroPerimetro: false,
      distanciaMetros: Number.POSITIVE_INFINITY,
      perimetroMetros: perimetroMaximo,
      coordenadasValidas: true,
    };
  }

  const distanciaCalculada = distanciaMetrosHaversine(
    latitudePromotor,
    longitudePromotor,
    latitudeLoja,
    longitudeLoja,
  );

  return {
    dentroPerimetro: distanciaCalculada <= perimetroMaximo,
    distanciaMetros: distanciaCalculada,
    perimetroMetros: perimetroMaximo,
    coordenadasValidas: true,
  };
}

export function calcularMargemGpsMetros(
  accuracyMetros: number | null | undefined,
): number {
  if (accuracyMetros == null || !Number.isFinite(accuracyMetros)) {
    return 15;
  }

  return Math.min(Math.max(accuracyMetros, 0), MARGEM_GPS_MAXIMA_METROS);
}

/**
 * Histerese na borda do perímetro para evitar oscilação por imprecisão do GPS.
 * Uma vez liberado, exige afastar-se além da margem para bloquear; e vice-versa.
 */
export function resolverDentroPerimetroComHisterese(
  distanciaMetros: number,
  perimetroMetros: number,
  margemGpsMetros: number,
  estadoAnterior: boolean | null,
): boolean {
  if (perimetroMetros <= 0) {
    return false;
  }

  const margem = margemGpsMetros * 0.5;

  if (estadoAnterior === true) {
    return distanciaMetros <= perimetroMetros + margem;
  }

  if (estadoAnterior === false) {
    return distanciaMetros <= perimetroMetros - margem;
  }

  return distanciaMetros <= perimetroMetros + margem * 0.25;
}

export function avaliarDentroPerimetroGps(
  latitude: number,
  longitude: number,
  loja: ConfigCercaVirtualLoja,
  estadoAnterior: boolean | null,
  accuracyMetros?: number | null,
): ResultadoAvaliacaoCercaCliente & { candidatoDentroPerimetro: boolean } {
  const avaliacao = avaliarPosicaoCercaVirtual(latitude, longitude, loja);

  if (!avaliacao.coordenadasValidas) {
    return { ...avaliacao, candidatoDentroPerimetro: false };
  }

  const margemGps = calcularMargemGpsMetros(accuracyMetros);
  const candidatoDentroPerimetro = resolverDentroPerimetroComHisterese(
    avaliacao.distanciaMetros,
    avaliacao.perimetroMetros,
    margemGps,
    estadoAnterior,
  );

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Cerca Virtual] Distância: ${avaliacao.distanciaMetros.toFixed(2)} m | Perímetro: ${avaliacao.perimetroMetros} m | Precisão GPS: ${accuracyMetros != null ? `${accuracyMetros.toFixed(0)} m` : "n/d"} | Margem: ${margemGps.toFixed(0)} m | Candidato: ${candidatoDentroPerimetro ? "dentro" : "fora"} | Estado: ${estadoAnterior == null ? "inicial" : estadoAnterior ? "liberado" : "bloqueado"}`,
    );
  }

  return {
    ...avaliacao,
    dentroPerimetro: candidatoDentroPerimetro,
    candidatoDentroPerimetro,
  };
}

export function precisaoGpsValida(
  accuracyMetros: number | null | undefined,
): boolean {
  if (accuracyMetros == null || !Number.isFinite(accuracyMetros)) {
    return false;
  }

  return accuracyMetros <= PRECISAO_GPS_MAXIMA_METROS;
}

function obterCoordenadasGpsInterno(
  opcoes: PositionOptions,
): Promise<CoordenadasGpsCerca | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    if (!window.isSecureContext || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMetros: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        });
      },
      () => resolve(null),
      opcoes,
    );
  });
}

export type ResultadoValidacaoEnvioDefinitivo = {
  permitido: boolean;
  precisaoInvalida: boolean;
  bloqueadoCerca: boolean;
  distanciaMetros: number | null;
  erro?: string;
};

export function calcularDistanciaLojaMetros(
  coords: CoordenadasGpsCerca,
  loja: ConfigCercaVirtualLoja,
): number | null {
  const avaliacao = avaliarPosicaoCercaVirtual(
    coords.latitude,
    coords.longitude,
    loja,
  );

  if (!avaliacao.coordenadasValidas) {
    return null;
  }

  return avaliacao.distanciaMetros;
}

/**
 * Validação estrita no envio (sem histerese): precisão obrigatória e perímetro rígido.
 */
export function validarEnvioDefinitivoPedido(
  config: ConfigCercaVirtualApi | null,
  coords: CoordenadasGpsCerca | null,
): ResultadoValidacaoEnvioDefinitivo {
  const configNormalizada = normalizarCercaVirtualApi(config);

  if (!configNormalizada?.exigeValidacao) {
    return {
      permitido: true,
      precisaoInvalida: false,
      bloqueadoCerca: false,
      distanciaMetros: null,
    };
  }

  const loja = configNormalizada.loja;

  if (
    lojaIncompletaParaCercaPromotor(configNormalizada.promotor, loja)
  ) {
    return {
      permitido: false,
      precisaoInvalida: false,
      bloqueadoCerca: true,
      distanciaMetros: null,
      erro: MENSAGEM_LOJA_SEM_CERCA_CONFIGURADA,
    };
  }

  if (!coords) {
    return {
      permitido: false,
      precisaoInvalida: false,
      bloqueadoCerca: true,
      distanciaMetros: null,
      erro: MENSAGEM_PEDIDO_BLOQUEADO_ENVIO,
    };
  }

  if (!precisaoGpsValida(coords.accuracyMetros)) {
    return {
      permitido: false,
      precisaoInvalida: true,
      bloqueadoCerca: false,
      distanciaMetros: null,
      erro: MENSAGEM_LOCALIZACAO_IMPRESA,
    };
  }

  const distanciaMetros = calcularDistanciaLojaMetros(coords, loja);

  const avaliacao = avaliarPosicaoCercaVirtual(
    coords.latitude,
    coords.longitude,
    loja,
  );

  if (!avaliacao.dentroPerimetro) {
    return {
      permitido: false,
      precisaoInvalida: false,
      bloqueadoCerca: true,
      distanciaMetros: avaliacao.distanciaMetros,
      erro: MENSAGEM_PEDIDO_BLOQUEADO_ENVIO,
    };
  }

  return {
    permitido: true,
    precisaoInvalida: false,
    bloqueadoCerca: false,
    distanciaMetros,
  };
}

export function resolverEstadoCercaVirtualUi(params: {
  config: ConfigCercaVirtualApi | null;
  dentroPerimetro: boolean | null;
  falhaLocalizacao: boolean;
  primeiroPedidoEnviado: boolean;
  pedidoExtraRealizado: boolean;
}): EstadoCercaVirtualUi {
  if (!params.config?.exigeValidacao) {
    return "inativo";
  }

  // Sem GPS ou fora do perímetro: mesmo bloqueio vermelho para o promotor.
  if (params.falhaLocalizacao || params.dentroPerimetro === false) {
    return "bloqueado";
  }

  if (params.dentroPerimetro === null) {
    return "verificando";
  }

  if (!params.primeiroPedidoEnviado) {
    return "visita_inicial";
  }

  if (!params.pedidoExtraRealizado) {
    return "pedido_extra";
  }

  return "inativo";
}

export async function validarCheckInCercaVirtual(
  config: ConfigCercaVirtualApi | null,
): Promise<ResultadoValidacaoEnvioDefinitivo> {
  const coords = await obterCoordenadasGpsCercaVirtual();
  return validarEnvioDefinitivoPedido(config, coords);
}

export function obterCoordenadasGpsCercaVirtual(): Promise<CoordenadasGpsCerca | null> {
  return obterCoordenadasGpsInterno(OPCOES_GPS_CERCA);
}

export function obterCoordenadasGpsEnvioDefinitivo(): Promise<CoordenadasGpsCerca | null> {
  return obterCoordenadasGpsInterno(OPCOES_GPS_ENVIO_DEFINITIVO);
}

export function validarEnvioCercaVirtual(
  config: ConfigCercaVirtualApi,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  const configNormalizada = normalizarCercaVirtualApi(config);

  if (!configNormalizada?.exigeValidacao) {
    return { permitido: true, exigeValidacao: false };
  }

  if (latitude == null || longitude == null) {
    return {
      permitido: false,
      exigeValidacao: true,
      erro:
        "A cerca virtual está ativa. Ative o GPS e permita o acesso à localização para enviar o pedido.",
    };
  }

  const avaliacao = avaliarPosicaoCercaVirtual(
    latitude,
    longitude,
    configNormalizada.loja,
  );

  if (!avaliacao.coordenadasValidas) {
    return {
      permitido: false,
      exigeValidacao: true,
      erro:
        "A cerca virtual está ativa. Ative o GPS e permita o acesso à localização para enviar o pedido.",
    };
  }

  if (!avaliacao.dentroPerimetro) {
    return {
      permitido: false,
      exigeValidacao: true,
      distanciaMetros: avaliacao.distanciaMetros,
      erro: `Você está fora do perímetro da loja (${Math.round(avaliacao.distanciaMetros)} m; permitido: ${avaliacao.perimetroMetros} m). Aproxime-se da loja para enviar o pedido.`,
    };
  }

  return {
    permitido: true,
    exigeValidacao: true,
    distanciaMetros: avaliacao.distanciaMetros,
  };
}
