import { exportarPlanilhaXls } from "@/lib/excel-io";
import {
  calcularPedidoCiss,
  calcularPedidoTotal,
  formatarDataBr,
  type LancamentoExpedicao,
} from "@/lib/expedicao";

export function exportarExpedicaoExcel(
  linhas: LancamentoExpedicao[],
  nomeArquivo = "expedicao.xls",
): void {
  exportarPlanilhaXls(
    linhas.map((linha) => {
      const pedidoCiss = calcularPedidoCiss(
        linha.pedidoAprovado,
        linha.trocaAtendida,
        linha.bonificacao,
      );
      const pedidoTotal = calcularPedidoTotal(
        linha.pedidoAprovado,
        linha.trocaAtendida,
        linha.bonificacao,
      );

      return {
        "Cod Loja": linha.codLoja,
        Loja: linha.loja,
        "Cod Produto": linha.codProduto,
        Produto: linha.produto,
        Estoque: linha.estoque,
        "Qtde pedido solicitado": linha.pedidoSolicitado,
        "Qtde Pedido Aprovado": linha.pedidoAprovado,
        "Qtde Pedido CISS": pedidoCiss,
        "Qtde Pedido total": pedidoTotal,
        Origem: linha.origem,
        "Data pedido": formatarDataBr(linha.dataLancamento),
        Região: linha.regiao,
        "Perfil de usuário que fez o pedido": linha.promotorPerfil,
        "Avulso (Sim/Não)": linha.avulso ? "Sim" : "Não",
      };
    }),
    nomeArquivo,
    "Expedição",
  );
}

type MetaExpedicaoPdf = {
  usuarioNome: string;
  lojaNome?: string;
  promotorNome?: string;
  tipoNome?: string;
  logoUrl?: string;
};

type LinhaTransferenciaAvulsaPdf = {
  produto: string;
  tipo: "Qtde Transf" | "Bonificação";
  quantidade: number;
  motivo: string;
};

function montarLinhasTransferenciaAvulsaPdf(
  linhas: LancamentoExpedicao[],
): LinhaTransferenciaAvulsaPdf[] {
  const resultado: LinhaTransferenciaAvulsaPdf[] = [];

  for (const linha of linhas) {
    if (!linha.avulso) {
      continue;
    }

    if (linha.pedidoSolicitado > 0) {
      resultado.push({
        produto: linha.produto,
        tipo: "Qtde Transf",
        quantidade: linha.pedidoSolicitado,
        motivo: linha.motivoAvulso?.trim() ?? "",
      });
    }

    if (linha.bonificacao > 0) {
      resultado.push({
        produto: linha.produto,
        tipo: "Bonificação",
        quantidade: linha.bonificacao,
        motivo: linha.motivoAvulso?.trim() ?? "",
      });
    }
  }

  return resultado;
}

export function exportarExpedicaoPdf(
  linhas: LancamentoExpedicao[],
  meta: MetaExpedicaoPdf,
): void {
  const dataImpressao = new Date().toLocaleString("pt-BR");
  const lojaTitulo = meta.lojaNome ?? "Todas";
  const promotorTitulo = meta.promotorNome ?? "Todos";
  const logoHtml = meta.logoUrl
    ? `<img src="${meta.logoUrl}" alt="" class="logo-regional" />`
    : "";

  const linhasPedido = linhas.filter((linha) => !linha.avulso);
  const linhasTransferenciaAvulsa = montarLinhasTransferenciaAvulsaPdf(linhas);

  const totais = {
    estoque: 0,
    pedidoSolicitado: 0,
    cortePedido: 0,
    trocaAtendida: 0,
    bonificacao: 0,
    pedidoCiss: 0,
    pedidoTotal: 0,
  };

  const linhasTabela = linhasPedido
    .map((linha, indice) => {
      const pedidoCiss = calcularPedidoCiss(
        linha.pedidoAprovado,
        linha.trocaAtendida,
        linha.bonificacao,
      );
      const pedidoTotal = calcularPedidoTotal(
        linha.pedidoAprovado,
        linha.trocaAtendida,
        linha.bonificacao,
      );

      totais.estoque += linha.estoque;
      totais.pedidoSolicitado += linha.pedidoSolicitado;
      totais.cortePedido += linha.cortePedido;
      totais.trocaAtendida += linha.trocaAtendida;
      totais.bonificacao += linha.bonificacao;
      totais.pedidoCiss += pedidoCiss;
      totais.pedidoTotal += pedidoTotal;

      const zebra = indice % 2 === 1 ? " class=\"zebra\"" : "";

      return `
        <tr${zebra}>
          <td class="text-left cod">${linha.codProduto}</td>
          <td class="text-left produto">${linha.produto}</td>
          <td class="text-left origem">${linha.origem}</td>
          <td class="num">${linha.estoque}</td>
          <td class="num">${linha.pedidoSolicitado}</td>
          <td class="num">${linha.cortePedido}</td>
          <td class="num">${linha.trocaAtendida}</td>
          <td class="num">${linha.bonificacao}</td>
          <td class="num">${pedidoCiss}</td>
          <td class="num">${pedidoTotal}</td>
        </tr>`;
    })
    .join("");

  const secaoTransferenciasAvulsas =
    linhasTransferenciaAvulsa.length > 0
      ? `
    <tbody class="transferencias-avulsas">
      <tr class="secao-transferencias-titulo">
        <td class="text-left" colspan="10"><strong>Transferências Avulsas</strong></td>
      </tr>
      <tr class="secao-transferencias-cabecalho">
        <td class="text-left" colspan="4"><strong>Produto</strong></td>
        <td class="text-left" colspan="2"><strong>Tipo</strong></td>
        <td class="num" colspan="1"><strong>Quantidade</strong></td>
        <td class="text-left" colspan="3"><strong>Motivo</strong></td>
      </tr>
      ${linhasTransferenciaAvulsa
        .map(
          (linha) => `
      <tr class="secao-transferencias-linha">
        <td class="text-left produto" colspan="4">${linha.produto}</td>
        <td class="text-left" colspan="2">${linha.tipo}</td>
        <td class="num" colspan="1">${linha.quantidade}</td>
        <td class="text-left" colspan="3">${linha.motivo}</td>
      </tr>`,
        )
        .join("")}
    </tbody>`
      : "";

  const linhaTotais =
    linhasPedido.length > 0
      ? `
    <tfoot>
      <tr class="totais">
        <td class="text-left" colspan="3"><strong>Totais</strong></td>
        <td class="num"><strong>${totais.estoque}</strong></td>
        <td class="num"><strong>${totais.pedidoSolicitado}</strong></td>
        <td class="num"><strong>${totais.cortePedido}</strong></td>
        <td class="num"><strong>${totais.trocaAtendida}</strong></td>
        <td class="num"><strong>${totais.bonificacao}</strong></td>
        <td class="num"><strong>${totais.pedidoCiss}</strong></td>
        <td class="num"><strong>${totais.pedidoTotal}</strong></td>
      </tr>
    </tfoot>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Romaneio de Conferência de Mercadoria</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 28px 32px 40px;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cabecalho {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
      margin-bottom: 28px;
    }
    .titulo-bloco {
      padding-top: 4px;
    }
    .titulo-linha {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-regional {
      height: 40px;
      width: auto;
      object-fit: contain;
      flex-shrink: 0;
    }
    .titulo-documento {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1.35;
      color: #0f172a;
      text-transform: uppercase;
    }
    .divisor-titulo {
      margin-top: 12px;
      height: 2px;
      width: 100%;
      background: linear-gradient(90deg, #1e293b 0%, #334155 55%, #cbd5e1 100%);
      border: none;
    }
    .meta-bloco {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 11px;
      line-height: 1.7;
      color: #334155;
    }
    .meta-bloco strong {
      color: #0f172a;
      font-weight: 700;
    }
    .meta-linha + .meta-linha {
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    thead th {
      background: #f3f4f6;
      color: #030712;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-size: 9.5px;
      padding: 10px 8px;
      border: none;
      border-right: 1px solid #e5e7eb;
    }
    thead th:last-child {
      border-right: none;
    }
    tbody td {
      padding: 9px 8px;
      border: none;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tbody tr.zebra td {
      background: #f8fafc;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    td.text-left {
      text-align: left;
    }
    td.cod {
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
    }
    td.produto {
      min-width: 140px;
      line-height: 1.35;
    }
    td.origem {
      color: #475569;
    }
    td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    thead th.num {
      text-align: right;
    }
    tfoot tr.totais td {
      background: #e2e8f0;
      border-top: 2px solid #94a3b8;
      padding: 11px 8px;
      font-size: 11px;
    }
    tfoot tr.totais td strong {
      font-weight: 800;
      color: #0f172a;
    }
    tbody.transferencias-avulsas td {
      background: #f8fafc;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      padding: 8px;
    }
    tr.secao-transferencias-titulo td {
      background: #e2e8f0;
      font-size: 10.5px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding-top: 12px;
    }
    tr.secao-transferencias-cabecalho td {
      background: #f1f5f9;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #334155;
    }
    tr.secao-transferencias-linha td {
      border-bottom: 1px solid #e2e8f0;
    }
    .rodape-assinaturas {
      margin-top: 56px;
      display: flex;
      justify-content: center;
      page-break-inside: avoid;
    }
    .campo-assinatura {
      text-align: center;
      width: min(100%, 320px);
    }
    .linha-pontilhada {
      border-top: 1px dashed #64748b;
      margin: 0 8px 10px;
      height: 48px;
    }
    .rotulo-assinatura {
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      letter-spacing: 0.02em;
    }
    @media print {
      body { padding: 16px 20px 28px; }
      .cabecalho { margin-bottom: 20px; }
      .rodape-assinaturas { margin-top: 40px; }
    }
  </style>
</head>
<body>
  <header class="cabecalho">
    <div class="titulo-bloco">
      <div class="titulo-linha">
        ${logoHtml}
        <h1 class="titulo-documento">Romaneio de Conferência de Mercadoria</h1>
      </div>
      <hr class="divisor-titulo" />
    </div>
    <div class="meta-bloco">
      <div class="meta-linha"><strong>Data/Hora de Impressão:</strong> ${dataImpressao}</div>
      <div class="meta-linha"><strong>Operador:</strong> ${meta.usuarioNome}</div>
      <div class="meta-linha"><strong>Loja:</strong> ${lojaTitulo}</div>
      <div class="meta-linha"><strong>Promotor:</strong> ${promotorTitulo}</div>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th class="text-left">Cód Produto</th>
        <th class="text-left">Produto</th>
        <th class="text-left">Origem</th>
        <th class="num">Estoque</th>
        <th class="num">Pedido Solicitado</th>
        <th class="num">Corte Pedido</th>
        <th class="num">Trocas Atendidas</th>
        <th class="num">Bonificação</th>
        <th class="num">Pedido CISS</th>
        <th class="num">Pedido Total</th>
      </tr>
    </thead>
    <tbody>${linhasTabela}</tbody>${secaoTransferenciasAvulsas}${linhaTotais}
  </table>

  <footer class="rodape-assinaturas">
    <div class="campo-assinatura">
      <div class="linha-pontilhada"></div>
      <div class="rotulo-assinatura">Responsável Expedição</div>
    </div>
  </footer>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const janela = window.open("", "_blank");

  if (!janela) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  janela.document.write(html);
  janela.document.close();
}
