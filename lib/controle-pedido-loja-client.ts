import type { LinhasPedidoForm } from "@/lib/pedido";

export type ControlePedidoLojaDia = {
  pedidoPrincipalEnviado: boolean;
  pedidoExtraRealizado: boolean;
  linhasPrincipal?: LinhasPedidoForm;
};

export const MENSAGEM_PEDIDO_EXTRA_BLOQUEADO =
  "Para mais pedidos, entrar em contato com o Supervisor";

const CONTROLE_STORAGE_PREFIX = "shi-controle-pedido";

export function chaveControleLocal(
  usuarioEmail: string,
  lojaId: string,
  data: string,
): string {
  return `${CONTROLE_STORAGE_PREFIX}:${usuarioEmail}:${lojaId}:${data}`;
}

export function lerControleLocal(
  usuarioEmail: string,
  lojaId: string,
  data: string,
): ControlePedidoLojaDia {
  if (typeof window === "undefined") {
    return { pedidoPrincipalEnviado: false, pedidoExtraRealizado: false };
  }

  try {
    const raw = localStorage.getItem(chaveControleLocal(usuarioEmail, lojaId, data));

    if (!raw) {
      return { pedidoPrincipalEnviado: false, pedidoExtraRealizado: false };
    }

    return JSON.parse(raw) as ControlePedidoLojaDia;
  } catch {
    return { pedidoPrincipalEnviado: false, pedidoExtraRealizado: false };
  }
}

export function salvarControleLocal(
  usuarioEmail: string,
  lojaId: string,
  controle: ControlePedidoLojaDia,
  data: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    chaveControleLocal(usuarioEmail, lojaId, data),
    JSON.stringify(controle),
  );
}
