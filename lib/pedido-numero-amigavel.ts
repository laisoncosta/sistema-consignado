import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";

export const STATUS_PEDIDO_EXCLUIDO = "excluido";

export type DbClient = PrismaClient | Prisma.TransactionClient;

/** Filtro operacional: ignora pedidos com exclusão lógica. */
export const filtroPedidoNaoExcluido: Prisma.PedidoWhereInput = {
  NOT: {
    status: { equals: STATUS_PEDIDO_EXCLUIDO, mode: "insensitive" },
  },
};

export function pedidoEstaExcluido(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === STATUS_PEDIDO_EXCLUIDO;
}

export const STATUS_PEDIDO_PADRAO_RESTAURACAO = "AGUARDANDO_APROVACAO";

export function rotuloStatusPedidoVisita(status: string | null | undefined): {
  texto: string;
  cancelado: boolean;
} {
  if (pedidoEstaExcluido(status)) {
    return { texto: "CANCELADO", cancelado: true };
  }

  const texto = (status ?? "").trim().replaceAll("_", " ");
  return { texto: texto || "—", cancelado: false };
}

/** Aceita "0002", "#0002" ou "2" e compara com o número amigável. */
export function pedidoAtendeBuscaNumeroAmigavel(
  numeroAmigavel: number,
  busca: string,
): boolean {
  const termo = busca.trim();

  if (!termo) {
    return true;
  }

  const digitos = termo.replace(/\D/g, "");

  if (!digitos) {
    return false;
  }

  return numeroAmigavel === Number(digitos);
}

export function formatarNumeroAmigavelPedido(
  numero: number | null | undefined,
): string {
  if (numero == null || !Number.isFinite(numero) || numero <= 0) {
    return "#????";
  }

  return `#${String(Math.trunc(numero)).padStart(4, "0")}`;
}

export function rotuloPedidoComStatus(
  numeroAmigavel: number | null | undefined,
  status: string | null | undefined,
): string {
  const numero = formatarNumeroAmigavelPedido(numeroAmigavel);
  const statusNormalizado = (status ?? "").trim();

  if (!statusNormalizado || pedidoEstaExcluido(statusNormalizado)) {
    return numero;
  }

  return `${numero} · ${statusNormalizado.replaceAll("_", " ")}`;
}

/** Aloca o próximo número sequencial global (nunca reutiliza). */
export async function alocarProximoNumeroAmigavel(
  db: DbClient,
): Promise<number> {
  const ultimo = await db.pedido.findFirst({
    orderBy: { numeroAmigavel: "desc" },
    select: { numeroAmigavel: true },
  });

  return (ultimo?.numeroAmigavel ?? 0) + 1;
}
