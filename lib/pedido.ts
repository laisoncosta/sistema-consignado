import { obterDataHojeBrasil } from "@/lib/data-brasil";

export type ProdutoPedido = {
  id: string;
  codigoCiss: string;
  nome: string;
};

export const PRODUTOS_PEDIDO_MOCK: ProdutoPedido[] = [
  { id: "3", codigoCiss: "3", nome: "AGRIÃO BURITI" },
  { id: "7", codigoCiss: "7", nome: "ALFACE AMERICANA" },
  { id: "253", codigoCiss: "253", nome: "RÚCULA HIDROPÔNICA" },
];

export const LOJA_PEDIDO_PADRAO = "07 - NOVA ERA - COMPENSA";
export const LOJA_PEDIDO_PADRAO_ID = "1";

/** Enquanto `false`, promotores CLT lançam pedidos sem check-in GPS (modo teste). */
export const CHECKIN_GPS_OBRIGATORIO = true;

export type CamposLinhaPedido = {
  estoque: string;
  avaria: string;
  trocas: string;
  pedido: string;
};

export type LinhasPedidoForm = Record<string, CamposLinhaPedido>;

export type TipoPedidoEnviado = "principal" | "complementar";

export type ModoLancamento = "normal" | "complementar";

export type PedidoEnviadoRegistro = {
  id: string;
  lojaId: string;
  lojaRotulo: string;
  data: string;
  linhas: LinhasPedidoForm;
  tipo: TipoPedidoEnviado;
  status: string;
};

export function criarLinhasPedidoIniciais(
  produtos: ProdutoPedido[] = PRODUTOS_PEDIDO_MOCK,
): LinhasPedidoForm {
  return Object.fromEntries(
    produtos.map((produto) => [
      produto.id,
      { estoque: "", avaria: "", trocas: "", pedido: "" },
    ]),
  );
}

export function criarLinhasComplementares(
  linhasBase: LinhasPedidoForm,
): LinhasPedidoForm {
  return Object.fromEntries(
    Object.entries(linhasBase).map(([produtoId, base]) => [
      produtoId,
      {
        estoque: base?.estoque ?? "",
        avaria: base?.avaria ?? "",
        trocas: base?.trocas ?? "",
        pedido: "",
      },
    ]),
  );
}

export function obterDataHoje(): string {
  return obterDataHojeBrasil();
}

export function filtrarPedidosLojaHoje(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): PedidoEnviadoRegistro[] {
  return pedidos.filter(
    (pedido) => pedido.lojaId === lojaId && pedido.data === data,
  );
}

export function lojaPossuiPedidoPrincipalHoje(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): boolean {
  return filtrarPedidosLojaHoje(pedidos, lojaId, data).some(
    (pedido) => pedido.tipo === "principal",
  );
}

export function lojaPossuiPedidoAguardandoHoje(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): boolean {
  return filtrarPedidosLojaHoje(pedidos, lojaId, data).some(
    (pedido) => pedido.status === STATUS_PEDIDO_AGUARDANDO,
  );
}

export function lojaPossuiPedidoExtraHoje(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): boolean {
  return filtrarPedidosLojaHoje(pedidos, lojaId, data).some(
    (pedido) => pedido.tipo === "complementar",
  );
}

export function lojaPedidosEsgotadosHoje(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): boolean {
  return (
    lojaPossuiPedidoPrincipalHoje(pedidos, lojaId, data) &&
    lojaPossuiPedidoExtraHoje(pedidos, lojaId, data)
  );
}

export function obterLinhasBaseComplementar(
  pedidos: PedidoEnviadoRegistro[],
  lojaId: string,
  data = obterDataHoje(),
): LinhasPedidoForm | null {
  const pedidosLoja = filtrarPedidosLojaHoje(pedidos, lojaId, data);
  const pedidoPrincipal = pedidosLoja.find(
    (pedido) => pedido.tipo === "principal",
  );

  return (pedidoPrincipal ?? pedidosLoja[0])?.linhas ?? null;
}

export function possuiEstoqueVazio(linhas: LinhasPedidoForm): boolean {
  return PRODUTOS_PEDIDO_MOCK.some(
    (produto) => linhas[produto.id]?.estoque.trim() === "",
  );
}

export function possuiValorNegativo(linhas: LinhasPedidoForm): boolean {
  const campos: Array<keyof CamposLinhaPedido> = [
    "estoque",
    "avaria",
    "trocas",
    "pedido",
  ];

  return PRODUTOS_PEDIDO_MOCK.some((produto) => {
    const linha = linhas[produto.id];

    return campos.some((campo) => {
      const valor = linha?.[campo].trim() ?? "";

      if (valor === "") {
        return false;
      }

      const quantidade = Number.parseInt(valor, 10);

      return !Number.isNaN(quantidade) && quantidade < 0;
    });
  });
}

export function formatarValorConferencia(valor: string): string {
  return valor.trim() === "" ? "—" : valor;
}

export const STATUS_PEDIDO_AGUARDANDO = "Aguardando Aprovação";

export const MENSAGEM_ESTOQUE_OBRIGATORIO =
  "É obrigatório informar o estoque de todos os produtos.";

export const MENSAGEM_VALOR_NEGATIVO =
  "Não são permitidos valores negativos em nenhum dos campos.";

export const MENSAGEM_PEDIDO_DUPLICADO =
  "Atenção: Já existe um lançamento finalizado hoje para esta loja. O que deseja fazer?";

export const AVISO_CONFERENCIA =
  "Ao confirmar e enviar, os lançamentos não poderão mais ser editados.";
