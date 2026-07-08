import { pedidoAtendeBuscaNumeroAmigavel } from "@/lib/pedido-numero-amigavel";

export const LIMITE_CONFORMIDADE_VISITA_METROS = 100;

export type FarolIntegridadeVisita = "conforme" | "inconforme";

export type FiltroIntegridadeRelatorio = "todos" | "conforme" | "inconforme";

export type FiltroRegiaoRelatorio = "todos" | "manaus" | "rio-branco";

export type AlertaCancelamentoVisita = "nenhum" | "parcial" | "critico";

export type RegistroRelatorioVisita = {
  id: number;
  numeroAmigavel: number;
  numeroAmigavelRotulo: string;
  status: string;
  alertaCancelamento: AlertaCancelamentoVisita;
  data: string;
  horaEnvio: string;
  promotorId: number;
  promotorNome: string;
  promotorEmail: string;
  lojaId: number;
  lojaRotulo: string;
  regiaoId: number;
  regiaoNome: string;
  tipoLancamento: string;
  tempoEmLoja: string;
  tempoEmLojaMinutos: number | null;
  distanciaLojaMetros: number | null;
  farolIntegridade: FarolIntegridadeVisita;
};

export type OpcaoFiltroRelatorio = {
  value: string;
  label: string;
  regiaoId?: number;
  regiaoChave?: FiltroRegiaoRelatorio;
};

export type OpcoesFiltroRelatorioVisitas = {
  promotores: OpcaoFiltroRelatorio[];
  lojas: OpcaoFiltroRelatorio[];
};

export type PontoTempoPermanenciaDia = {
  data: string;
  rotulo: string;
  minutosMedios: number;
  quantidadeVisitas: number;
};

export function coordenadasEnvioValidas(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return false;
  }

  if (latitude === 0 && longitude === 0) {
    return false;
  }

  return true;
}

/** Heurística administrativa para coordenadas típicas de mock/emulador. */
export function coordenadaSuspeitaMockLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return true;
  }

  if (latitude === 0 && longitude === 0) {
    return true;
  }

  const latInteira = Math.abs(latitude - Math.round(latitude)) < 1e-9;
  const lngInteira = Math.abs(longitude - Math.round(longitude)) < 1e-9;

  if (latInteira && lngInteira) {
    return true;
  }

  return false;
}

export function avaliarFarolIntegridadeVisita(params: {
  latitudeEnvio: number | null;
  longitudeEnvio: number | null;
  distanciaLojaMetros: number | null;
}): FarolIntegridadeVisita {
  if (coordenadaSuspeitaMockLocation(params.latitudeEnvio, params.longitudeEnvio)) {
    return "inconforme";
  }

  if (
    !coordenadasEnvioValidas(params.latitudeEnvio, params.longitudeEnvio) ||
    params.distanciaLojaMetros == null ||
    !Number.isFinite(params.distanciaLojaMetros)
  ) {
    return "inconforme";
  }

  if (params.distanciaLojaMetros > LIMITE_CONFORMIDADE_VISITA_METROS) {
    return "inconforme";
  }

  return "conforme";
}

export function calcularTempoEmLojaMinutos(
  inicioVisita: Date | null,
  fimVisita: Date,
): number | null {
  if (!inicioVisita || Number.isNaN(inicioVisita.getTime())) {
    return null;
  }

  const diffMs = fimVisita.getTime() - inicioVisita.getTime();

  if (diffMs < 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
}

export function formatarTempoEmLoja(minutos: number | null): string {
  if (minutos == null || !Number.isFinite(minutos)) {
    return "—";
  }

  if (minutos < 1) {
    return "< 1 min";
  }

  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;

  if (horas > 0) {
    return restante > 0 ? `${horas}h ${restante}min` : `${horas}h`;
  }

  return `${minutos} min`;
}

export function rotuloTipoLancamentoVisita(tipo: string): string {
  return tipo === "complementar" ? "Pedido Extra" : "Pedido Principal";
}

export function normalizarChaveRegiaoRelatorio(nome: string): FiltroRegiaoRelatorio {
  const normalizado = nome.trim().toLowerCase();

  if (normalizado.includes("rio") && normalizado.includes("branco")) {
    return "rio-branco";
  }

  if (normalizado.includes("manaus")) {
    return "manaus";
  }

  return "todos";
}

export function registroAtendeFiltroRegiao(
  registro: RegistroRelatorioVisita,
  filtro: FiltroRegiaoRelatorio,
): boolean {
  if (filtro === "todos") {
    return true;
  }

  return normalizarChaveRegiaoRelatorio(registro.regiaoNome) === filtro;
}

export function filtrarRegistrosRelatorioVisitas(
  registros: RegistroRelatorioVisita[],
  filtros: {
    regiao?: FiltroRegiaoRelatorio;
    promotorId?: string;
    lojaId?: string;
    integridade?: FiltroIntegridadeRelatorio;
    buscaPedido?: string;
  },
): RegistroRelatorioVisita[] {
  return registros.filter((registro) => {
    if (
      filtros.regiao &&
      !registroAtendeFiltroRegiao(registro, filtros.regiao)
    ) {
      return false;
    }

    if (filtros.promotorId && String(registro.promotorId) !== filtros.promotorId) {
      return false;
    }

    if (filtros.lojaId && String(registro.lojaId) !== filtros.lojaId) {
      return false;
    }

    if (
      filtros.buscaPedido?.trim() &&
      !pedidoAtendeBuscaNumeroAmigavel(
        registro.numeroAmigavel,
        filtros.buscaPedido,
      )
    ) {
      return false;
    }

    if (filtros.integridade === "conforme") {
      return registro.farolIntegridade === "conforme";
    }

    if (filtros.integridade === "inconforme") {
      return registro.farolIntegridade === "inconforme";
    }

    return true;
  });
}

export function listarDiasPeriodoIso(
  dataInicial: string,
  dataFinal: string,
): string[] {
  const [anoIni, mesIni, diaIni] = dataInicial.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = dataFinal.split("-").map(Number);
  const inicio = new Date(anoIni, mesIni - 1, diaIni);
  const fim = new Date(anoFim, mesFim - 1, diaFim);
  const dias: string[] = [];

  for (
    let cursor = new Date(inicio);
    cursor.getTime() <= fim.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const ano = cursor.getFullYear();
    const mes = String(cursor.getMonth() + 1).padStart(2, "0");
    const dia = String(cursor.getDate()).padStart(2, "0");
    dias.push(`${ano}-${mes}-${dia}`);
  }

  return dias;
}

export function formatarDiaCurtoBr(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function calcularSerieTempoPermanenciaPorDia(
  registros: RegistroRelatorioVisita[],
  dataInicial: string,
  dataFinal: string,
): PontoTempoPermanenciaDia[] {
  const dias = listarDiasPeriodoIso(dataInicial, dataFinal);
  const acumulado = new Map<string, { total: number; quantidade: number }>();

  for (const registro of registros) {
    if (registro.tempoEmLojaMinutos == null) {
      continue;
    }

    const atual = acumulado.get(registro.data) ?? { total: 0, quantidade: 0 };
    acumulado.set(registro.data, {
      total: atual.total + registro.tempoEmLojaMinutos,
      quantidade: atual.quantidade + 1,
    });
  }

  return dias.map((data) => {
    const ponto = acumulado.get(data);

    return {
      data,
      rotulo: formatarDiaCurtoBr(data),
      minutosMedios:
        ponto && ponto.quantidade > 0
          ? Math.round(ponto.total / ponto.quantidade)
          : 0,
      quantidadeVisitas: ponto?.quantidade ?? 0,
    };
  });
}

export function filtrarOpcoesRelatorioPorRegiao(
  opcoes: OpcoesFiltroRelatorioVisitas,
  filtro: FiltroRegiaoRelatorio,
): OpcoesFiltroRelatorioVisitas {
  if (filtro === "todos") {
    return opcoes;
  }

  return {
    promotores: opcoes.promotores.filter((item) => item.regiaoChave === filtro),
    lojas: opcoes.lojas.filter((item) => item.regiaoChave === filtro),
  };
}

export function calcularTotaisRelatorioVisitas(
  registros: RegistroRelatorioVisita[],
) {
  const conformes = registros.filter(
    (item) => item.farolIntegridade === "conforme",
  ).length;

  return {
    total: registros.length,
    conformes,
    inconformes: registros.length - conformes,
  };
}
