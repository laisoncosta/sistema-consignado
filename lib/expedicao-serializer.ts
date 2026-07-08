import {
  calcularPedidoAprovado,
  calcularTrocaAtendida,
  quantidadesAprovadasParaExibicao,
  resolverStatusItemExpedicao,
  type LancamentoExpedicao,
  type TipoPedidoExibicao,
} from "@/lib/expedicao";
import {
  criarIntervaloDatasBrasil,
  extrairDataBrasil,
} from "@/lib/data-brasil";
import { formatarNumeroAmigavelPedido } from "@/lib/pedido-numero-amigavel";



type ItemPedidoComRelacoes = {

  id: number;

  estoque: number;

  avaria: number;

  trocas: number;

  pedidoSolicitado: number;

  pedidoAtendido: number | null;

  cortePedido: number | null;

  estoqueConferido: number | null;

  corteTroca: number | null;

  trocaAtendida: number | null;

  bonificacao: number;

  origemSaida: string | null;

  origemId: number | null;

  status: string;

  produto: { id: number; codigo: string; descricao: string };

  pedido: {

    id: number;

    numeroAmigavel: number;

    tipoLancamento: string;

    createdAt: Date;

    status: string;

    usuarioId: number;

    usuario: { nome: string; funcao: string };

    loja: { id: number; codigo: string; nome: string };

    regiao: { nome: string };

  };

  origem?: { id: number; nome: string } | null;

};



type TransferenciaComRelacoes = {

  id: number;

  quantidade: number;

  bonificacao: number;

  motivo: string;

  data: Date;

  lojaId: number;

  produtoId: number;

  origemId: number;

  produto: { id: number; codigo: string; descricao: string };

  loja: { id: number; codigo: string; nome: string; regiao: { nome: string } };

  origem: { id: number; nome: string };

};



export async function calcularTiposPedidoMap(

  itens: ItemPedidoComRelacoes[],

): Promise<Map<number, TipoPedidoExibicao>> {

  const tipoMap = new Map<number, TipoPedidoExibicao>();



  for (const item of itens) {

    const tipo =

      item.pedido.tipoLancamento === "complementar" ? "Extra" : "Normal";

    tipoMap.set(item.pedido.id, tipo);

  }



  return tipoMap;

}



export function serializarItemPedido(

  item: ItemPedidoComRelacoes,

  tipoPedido: TipoPedidoExibicao = "Normal",

): LancamentoExpedicao {

  const cortePedido = item.cortePedido ?? 0;

  const corteTroca = item.corteTroca ?? 0;

  const isPedidoExtra = tipoPedido === "Extra";

  const estoque = isPedidoExtra ? 0 : (item.estoqueConferido ?? item.estoque);

  const avarias = isPedidoExtra ? 0 : item.avaria;

  const trocaSolicitada = isPedidoExtra ? 0 : item.trocas;

  const pedidoAprovadoCalculado = calcularPedidoAprovado(

    item.pedidoSolicitado,

    cortePedido,

    item.pedidoAtendido,

  );

  const trocaAtendidaCalculada = calcularTrocaAtendida(

    item.trocas,

    corteTroca,

    item.trocaAtendida,

  );

  const status = resolverStatusItemExpedicao(
    item.status || item.pedido.status,
    item.pedidoSolicitado,
    item.trocas,
  );

  const { pedidoAprovado, trocaAtendida } = quantidadesAprovadasParaExibicao(
    status,
    pedidoAprovadoCalculado,
    trocaAtendidaCalculada,
  );



  return {

    id: `item-${item.id}`,

    tipo: "pedido",

    itemPedidoId: item.id,

    transferenciaId: null,

    codProduto: item.produto.codigo,

    produto: item.produto.descricao,

    codLoja: item.pedido.loja.codigo,

    loja: item.pedido.loja.nome,

    estoque,

    avarias,

    pedidoSolicitado: item.pedidoSolicitado,

    cortePedido,

    pedidoAprovado,

    trocaSolicitada,

    trocaAtendida: isPedidoExtra ? 0 : trocaAtendida,

    bonificacao: item.bonificacao,

    dataLancamento: extrairDataBrasil(
      item.pedido.createdAt,
      item.pedido.regiao.nome,
    ),

    status,

    origem: item.origem?.nome ?? item.origemSaida ?? "",

    origemId: item.origemId,

    avulso: false,

    tipoPedido,

    promotorNome: item.pedido.usuario.nome,

    promotorPerfil: item.pedido.usuario.funcao,

    regiao: item.pedido.regiao.nome,

    pedidoId: item.pedido.id,

    numeroAmigavel: item.pedido.numeroAmigavel,

    numeroAmigavelRotulo: formatarNumeroAmigavelPedido(item.pedido.numeroAmigavel),

    lojaId: null,

    produtoId: null,

    motivoAvulso: null,

  };

}



export function serializarTransferenciaAvulsa(

  transferencia: TransferenciaComRelacoes,

): LancamentoExpedicao {

  return {

    id: `avulso-${transferencia.id}`,

    tipo: "avulso",

    itemPedidoId: null,

    transferenciaId: transferencia.id,

    codProduto: transferencia.produto.codigo,

    produto: transferencia.produto.descricao,

    codLoja: transferencia.loja.codigo,

    loja: transferencia.loja.nome,

    estoque: 0,

    avarias: 0,

    pedidoSolicitado: transferencia.quantidade,

    cortePedido: 0,

    pedidoAprovado: transferencia.quantidade,

    trocaSolicitada: 0,

    trocaAtendida: 0,

    bonificacao: transferencia.bonificacao,

    dataLancamento: extrairDataBrasil(
      transferencia.data,
      transferencia.loja.regiao.nome,
    ),

    status: "Aprovado",

    origem: transferencia.origem.nome,

    origemId: transferencia.origem.id,

    avulso: true,

    tipoPedido: null,

    promotorNome: "—",

    promotorPerfil: "Expedição",

    regiao: transferencia.loja.regiao.nome,

    pedidoId: null,

    numeroAmigavel: null,

    numeroAmigavelRotulo: null,

    lojaId: transferencia.lojaId,

    produtoId: transferencia.produtoId,

    motivoAvulso: transferencia.motivo,

  };

}



function chaveConsolidacaoExpedicao(linha: LancamentoExpedicao): string {
  if (linha.avulso) {
    return `avulsa-${linha.transferenciaId ?? linha.id}`;
  }

  const tipo = linha.tipoPedido ?? "Normal";
  return `${linha.dataLancamento}|${linha.codLoja}|${linha.codProduto}|${tipo}`;
}



function pontuacaoRepresentatividadePedido(linha: LancamentoExpedicao): number {
  return (
    linha.estoque +
    linha.avarias +
    linha.pedidoSolicitado +
    linha.trocaSolicitada
  );
}

function escolherLancamentoPorConteudo(
  atual: LancamentoExpedicao,
  candidato: LancamentoExpedicao,
): LancamentoExpedicao {
  const pontuacaoAtual = pontuacaoRepresentatividadePedido(atual);
  const pontuacaoCandidato = pontuacaoRepresentatividadePedido(candidato);

  if (pontuacaoCandidato !== pontuacaoAtual) {
    return pontuacaoCandidato > pontuacaoAtual ? candidato : atual;
  }

  if (atual.status === "Pendente" && candidato.status !== "Pendente") {
    return candidato;
  }

  if (candidato.status === "Pendente" && atual.status !== "Pendente") {
    return atual;
  }

  const pedidoAtual = atual.pedidoId ?? 0;
  const pedidoCandidato = candidato.pedidoId ?? 0;

  if (pedidoCandidato !== pedidoAtual) {
    return pedidoCandidato > pedidoAtual ? candidato : atual;
  }

  return (candidato.itemPedidoId ?? 0) > (atual.itemPedidoId ?? 0)
    ? candidato
    : atual;
}

function inferirCorteTrocaExpedicao(linha: LancamentoExpedicao): number {
  if (linha.trocaSolicitada <= 0) {
    return 0;
  }

  if (linha.status === "Aprovado") {
    return Math.max(0, linha.trocaSolicitada - linha.trocaAtendida);
  }

  return 0;
}

function preferirLancamentoConsolidado(

  atual: LancamentoExpedicao,

  candidato: LancamentoExpedicao,

): LancamentoExpedicao {

  if (atual.avulso || candidato.avulso) {

    const idAtual = atual.transferenciaId ?? 0;

    const idCandidato = candidato.transferenciaId ?? 0;

    return idCandidato >= idAtual ? candidato : atual;

  }

  const porConteudo = escolherLancamentoPorConteudo(atual, candidato);
  const status = porConteudo.status;
  const itemPedidoId = porConteudo.itemPedidoId ?? null;

  const pedidoAprovadoCalculado = calcularPedidoAprovado(
    porConteudo.pedidoSolicitado,
    porConteudo.cortePedido,
    null,
  );
  const trocaAtendidaCalculada = calcularTrocaAtendida(
    porConteudo.trocaSolicitada,
    inferirCorteTrocaExpedicao(porConteudo),
    null,
  );
  const { pedidoAprovado, trocaAtendida } = quantidadesAprovadasParaExibicao(
    status,
    pedidoAprovadoCalculado,
    trocaAtendidaCalculada,
  );

  return {
    ...porConteudo,
    id: itemPedidoId != null ? `item-${itemPedidoId}` : porConteudo.id,
    itemPedidoId,
    status,
    pedidoAprovado,
    trocaAtendida: porConteudo.tipoPedido === "Extra" ? 0 : trocaAtendida,
  };

}



export function consolidarLancamentosExpedicao(

  linhas: LancamentoExpedicao[],

): LancamentoExpedicao[] {

  const mapa = new Map<string, LancamentoExpedicao>();



  for (const linha of linhas) {

    const chave = chaveConsolidacaoExpedicao(linha);

    const existente = mapa.get(chave);



    if (!existente) {

      mapa.set(chave, linha);

      continue;

    }



    mapa.set(chave, preferirLancamentoConsolidado(existente, linha));

  }



  return Array.from(mapa.values());

}



export function criarIntervaloDatas(dataInicio: string, dataFim: string) {
  return criarIntervaloDatasBrasil(dataInicio, dataFim);
}


