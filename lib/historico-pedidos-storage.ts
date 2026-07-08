import type { LancamentoHistoricoRaw } from "@/lib/historico-pedidos";
import {
  normalizarStatusPedido,
  obterDataHojeIso,
} from "@/lib/historico-pedidos";
import type { LinhasPedidoForm } from "@/lib/pedido";
import { PRODUTOS_PEDIDO_MOCK } from "@/lib/pedido";

const STORAGE_PREFIX = "shi-historico-pedidos";

function chaveStorage(usuarioEmail: string): string {
  return `${STORAGE_PREFIX}:${usuarioEmail.trim().toLowerCase()}`;
}

export function lerHistoricoLocal(usuarioEmail: string): LancamentoHistoricoRaw[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(chaveStorage(usuarioEmail));

    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as LancamentoHistoricoRaw[];
  } catch {
    return [];
  }
}

export function salvarHistoricoLocal(
  usuarioEmail: string,
  lancamentos: LancamentoHistoricoRaw[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(chaveStorage(usuarioEmail), JSON.stringify(lancamentos));
}

export function registrarPedidoNoHistoricoLocal(params: {
  usuarioEmail: string;
  lojaId: string;
  lojaRotulo: string;
  data?: string;
  statusBruto: string;
  linhas: LinhasPedidoForm;
  pedidoId?: string;
}): void {
  const {
    usuarioEmail,
    lojaId,
    lojaRotulo,
    data = obterDataHojeIso(),
    statusBruto,
    linhas,
    pedidoId = crypto.randomUUID(),
  } = params;

  const status = normalizarStatusPedido(statusBruto);
  const atuais = lerHistoricoLocal(usuarioEmail);
  const novos: LancamentoHistoricoRaw[] = PRODUTOS_PEDIDO_MOCK.map((produto) => {
    const linha = linhas[produto.id];
    const qtdSolicitada = Number.parseInt(linha?.pedido ?? "0", 10) || 0;
    const estoque = Number.parseInt(linha?.estoque ?? "0", 10) || 0;
    const avarias = Number.parseInt(linha?.avaria ?? "0", 10) || 0;
    const trocas = Number.parseInt(linha?.trocas ?? "0", 10) || 0;

    return {
      id: `${pedidoId}-${produto.id}`,
      data,
      produtoId: produto.id,
      produtoNome: produto.nome,
      lojaId,
      lojaRotulo,
      status,
      tipoPedido: "Normal" as const,
      estoque,
      qtdSolicitada,
      corte: 0,
      avarias,
      trocasSolicitadas: trocas,
      corteTroca: 0,
      qtdeTransf: 0,
      bonificacao: 0,
      motivo: "",
    };
  }).filter(
    (item) =>
      item.qtdSolicitada > 0 ||
      item.estoque > 0 ||
      item.avarias > 0 ||
      item.trocasSolicitadas > 0,
  );

  salvarHistoricoLocal(usuarioEmail, [...atuais, ...novos]);
}
