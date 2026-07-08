/** Fuso de Manaus (UTC-4). */
const FUSO_MANAUS = "America/Manaus";

/** Fuso de Rio Branco / Acre (UTC-5). */
const FUSO_RIO_BRANCO = "America/Rio_Branco";

/**
 * Offset usado nos intervalos de consulta ao banco.
 * Rio Branco é o fuso mais a oeste — cobre o dia civil inteiro na região Norte.
 */
const OFFSET_DIA_OPERACIONAL = "-05:00";

export function fusoParaRegiao(regiaoNome?: string | null): string {
  const nome = regiaoNome?.toLowerCase() ?? "";

  if (nome.includes("rio branco") || nome.includes("acre")) {
    return FUSO_RIO_BRANCO;
  }

  return FUSO_MANAUS;
}

export function obterPrimeiroDiaMesBrasil(regiaoNome?: string | null): string {
  const hoje = obterDataHojeBrasil(regiaoNome);
  return `${hoje.slice(0, 8)}01`;
}

export function extrairDataBrasil(
  date: Date,
  regiaoNome?: string | null,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoParaRegiao(regiaoNome),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function obterDataHojeBrasil(regiaoNome?: string | null): string {
  return extrairDataBrasil(new Date(), regiaoNome);
}

export function formatarDataBrasil(
  iso: string,
  regiaoNome?: string | null,
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }

  const [ano, mes, dia] = extrairDataBrasil(data, regiaoNome).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Aplica máscara dd/mm/aaaa enquanto o usuário digita. */
export function aplicarMascaraDataBrasil(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Converte dd/mm/aaaa para yyyy-mm-dd. Retorna null se inválida. */
export function parseDataBrasilParaIso(valor: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());

  if (!match) {
    return null;
  }

  const [, dia, mes, ano] = match;
  const iso = `${ano}-${mes}-${dia}`;
  const data = new Date(`${iso}T12:00:00`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  const [anoVal, mesVal, diaVal] = iso.split("-").map(Number);

  if (
    data.getFullYear() !== anoVal ||
    data.getMonth() + 1 !== mesVal ||
    data.getDate() !== diaVal
  ) {
    return null;
  }

  return iso;
}

export function criarIntervaloDatasBrasil(dataInicio: string, dataFim: string) {
  const inicioMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataInicio);
  const fimMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataFim);

  if (!inicioMatch || !fimMatch) {
    return null;
  }

  const inicio = new Date(`${dataInicio}T00:00:00${OFFSET_DIA_OPERACIONAL}`);
  const fim = new Date(`${dataFim}T23:59:59.999${OFFSET_DIA_OPERACIONAL}`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return null;
  }

  return { inicio, fim };
}
