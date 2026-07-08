export type StatusVisita = "disponivel" | "em_andamento" | "concluido";

export type LojaPromotor = {
  id: string;
  codigo: string;
  rotulo: string;
};

export type RegistroVisita = {
  lojaId: string | null;
  lojaNome: string | null;
  data: string | null;
  horaEntrada: Date | null;
  horaSaida: Date | null;
  tempoTotalMs: number | null;
  latitude: number | null;
  longitude: number | null;
  enderecoConfirmado: string | null;
};

export type HistoricoVisita = RegistroVisita & {
  id: string;
};

export const LOJAS_PROMOTOR_MOCK: LojaPromotor[] = [
  { id: "1", codigo: "07", rotulo: "07 - NOVA ERA - COMPENSA" },
  { id: "2", codigo: "12", rotulo: "12 - DB SUPERMERCADOS - PONTA NEGRA" },
  { id: "3", codigo: "18", rotulo: "18 - CARREFOUR - ADRIANÓPOLIS" },
];

export const registroVisitaInicial: RegistroVisita = {
  lojaId: null,
  lojaNome: null,
  data: null,
  horaEntrada: null,
  horaSaida: null,
  tempoTotalMs: null,
  latitude: null,
  longitude: null,
  enderecoConfirmado: null,
};

export function formatarDataVisita(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

export function formatarEntrada(date: Date): string {
  const data = formatarDataVisita(date);
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${data} às ${hora}`;
}

export function formatarCronometro(tempoMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(tempoMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatarTempoAuditado(tempoMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(tempoMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  if (minutes === 0) {
    return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  return `${hours} ${hours === 1 ? "hora" : "horas"} e ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function extrairDataIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
