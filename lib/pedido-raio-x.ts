import {
  isStatusAprovadoExpedicao,
  isStatusPendenteExpedicao,
  isStatusReprovadoExpedicao,
  calcularStatusPedidoExpedicao,
} from "@/lib/expedicao";
import {
  formatarNumeroAmigavelPedido,
  pedidoEstaExcluido,
} from "@/lib/pedido-numero-amigavel";
import {
  avaliarFarolIntegridadeVisita,
  calcularTempoEmLojaMinutos,
  formatarTempoEmLoja,
  rotuloTipoLancamentoVisita,
  type FarolIntegridadeVisita,
} from "@/lib/relatorio-visitas";

export type EventoLinhaTempoPedido = {
  id: string;
  tipo: "criacao" | "aprovacao" | "exclusao" | "restauracao" | "reprovacao" | "outro";
  dataHora: string;
  dataHoraRotulo: string;
  titulo: string;
  detalhe?: string;
  usuarioNome?: string;
};

export type ResumoConferenciaPedido = {
  totalProdutos: number;
  volumeTotal: number;
  aprovados: number;
  pendentes: number;
  reprovados: number;
  resumoTexto: string;
};

export type PedidoRaioX = {
  id: number;
  numeroAmigavel: number;
  numeroAmigavelRotulo: string;
  status: string;
  statusRotulo: string;
  cancelado: boolean;
  data: string;
  horaEnvio: string;
  dataHoraEnvio: string;
  tipoLancamento: string;
  promotorNome: string;
  promotorEmail: string;
  lojaNome: string;
  lojaCodigo: string;
  regiaoNome: string;
  cercaVirtual: {
    farolIntegridade: FarolIntegridadeVisita;
    distanciaMetros: number | null;
    distanciaTexto: string;
    checkIn: string | null;
    checkOut: string;
    tempoEmLoja: string;
    tempoEmLojaMinutos: number | null;
  };
  resumoProdutos: ResumoConferenciaPedido;
  linhaTempo: EventoLinhaTempoPedido[];
  mapa: {
    latitudeEnvio: number | null;
    longitudeEnvio: number | null;
    latitudeLoja: number | null;
    longitudeLoja: number | null;
    exibirMapa: boolean;
  };
  motivoExclusao: string | null;
};

function formatarDataHoraBrasil(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function formatarHoraBrasil(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function pluralizar(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? singular : plural;
}

export function montarResumoConferencia(
  itens: Array<{ status: string; pedidoSolicitado: number; trocas: number }>,
): ResumoConferenciaPedido {
  const totalProdutos = itens.length;
  const volumeTotal = itens.reduce(
    (acc, item) => acc + item.pedidoSolicitado + item.trocas,
    0,
  );

  const aprovados = itens.filter((item) =>
    isStatusAprovadoExpedicao(item.status),
  ).length;
  const reprovados = itens.filter((item) =>
    isStatusReprovadoExpedicao(item.status),
  ).length;
  const pendentes = itens.filter((item) =>
    isStatusPendenteExpedicao(item.status),
  ).length;

  const partes: string[] = [];

  if (aprovados > 0) {
    partes.push(
      `${aprovados} ${pluralizar(aprovados, "produto Aprovado", "produtos Aprovados")}`,
    );
  }

  if (pendentes > 0) {
    partes.push(
      `${pendentes} ${pluralizar(pendentes, "produto Aguardando Aprovação", "produtos Aguardando Aprovação")}`,
    );
  }

  if (reprovados > 0) {
    partes.push(
      `${reprovados} ${pluralizar(reprovados, "produto Reprovado", "produtos Reprovados")}`,
    );
  }

  return {
    totalProdutos,
    volumeTotal,
    aprovados,
    pendentes,
    reprovados,
    resumoTexto: partes.length > 0 ? partes.join(", ") : "Nenhum produto registrado",
  };
}

type LogExpedicaoEntrada = {
  id: number;
  acao: string;
  detalhes: string | null;
  createdAt: Date;
  usuarioNome: string;
  produtoNome: string;
};

type LogAuditoriaEntrada = {
  id: number;
  acao: string;
  valorNovo: string | null;
  createdAt: Date;
  usuarioNome: string;
};

export function montarLinhaTempoPedido(params: {
  pedidoId: number;
  createdAt: Date;
  promotorNome: string;
  motivoExclusao: string | null;
  logsExpedicao: LogExpedicaoEntrada[];
  logsAuditoria: LogAuditoriaEntrada[];
}): EventoLinhaTempoPedido[] {
  const eventos: EventoLinhaTempoPedido[] = [];

  eventos.push({
    id: `criacao-${params.pedidoId}`,
    tipo: "criacao",
    dataHora: params.createdAt.toISOString(),
    dataHoraRotulo: formatarDataHoraBrasil(params.createdAt),
    titulo: "Pedido criado/enviado",
    detalhe: `Registrado pelo promotor na loja.`,
    usuarioNome: params.promotorNome,
  });

  for (const log of params.logsExpedicao) {
    const acaoLower = log.acao.toLowerCase();

    if (acaoLower.includes("aprova")) {
      eventos.push({
        id: `exp-${log.id}`,
        tipo: "aprovacao",
        dataHora: log.createdAt.toISOString(),
        dataHoraRotulo: formatarDataHoraBrasil(log.createdAt),
        titulo: `Produto ${log.produtoNome} aprovado na Expedição`,
        detalhe: log.detalhes ?? undefined,
        usuarioNome: log.usuarioNome,
      });
      continue;
    }

    if (acaoLower.includes("reprov")) {
      eventos.push({
        id: `exp-${log.id}`,
        tipo: "reprovacao",
        dataHora: log.createdAt.toISOString(),
        dataHoraRotulo: formatarDataHoraBrasil(log.createdAt),
        titulo: `Produto ${log.produtoNome} reprovado na Expedição`,
        detalhe: log.detalhes ?? undefined,
        usuarioNome: log.usuarioNome,
      });
      continue;
    }

    eventos.push({
      id: `exp-${log.id}`,
      tipo: "outro",
      dataHora: log.createdAt.toISOString(),
      dataHoraRotulo: formatarDataHoraBrasil(log.createdAt),
      titulo: `${log.produtoNome} — ${log.acao}`,
      detalhe: log.detalhes ?? undefined,
      usuarioNome: log.usuarioNome,
    });
  }

  for (const log of params.logsAuditoria) {
    if (log.acao === "EXCLUSAO_PEDIDO") {
      let motivo = params.motivoExclusao ?? undefined;

      if (!motivo && log.valorNovo) {
        try {
          const parsed = JSON.parse(log.valorNovo) as { motivo?: string };
          motivo = parsed.motivo?.trim() || undefined;
        } catch {
          // ignora JSON inválido
        }
      }

      eventos.push({
        id: `aud-${log.id}`,
        tipo: "exclusao",
        dataHora: log.createdAt.toISOString(),
        dataHoraRotulo: formatarDataHoraBrasil(log.createdAt),
        titulo: "Pedido cancelado",
        detalhe: motivo ? `Motivo: ${motivo}` : undefined,
        usuarioNome: log.usuarioNome,
      });
      continue;
    }

    if (log.acao === "RESTAURACAO_PEDIDO") {
      let motivoRestauracao: string | undefined;

      if (log.valorNovo) {
        try {
          const parsed = JSON.parse(log.valorNovo) as { motivo?: string };
          motivoRestauracao = parsed.motivo?.trim() || undefined;
        } catch {
          // ignora JSON inválido
        }
      }

      eventos.push({
        id: `aud-${log.id}`,
        tipo: "restauracao",
        dataHora: log.createdAt.toISOString(),
        dataHoraRotulo: formatarDataHoraBrasil(log.createdAt),
        titulo: "Pedido restaurado para operação",
        detalhe: motivoRestauracao ? `Motivo: ${motivoRestauracao}` : undefined,
        usuarioNome: log.usuarioNome,
      });
    }
  }

  return eventos.sort(
    (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
  );
}

export function montarDistanciaTexto(distanciaMetros: number | null): string {
  if (distanciaMetros == null || !Number.isFinite(distanciaMetros)) {
    return "Distância não calculada no envio.";
  }

  const metros = Math.round(distanciaMetros);
  return `Promotor estava a ${metros}m da loja no envio.`;
}

type PedidoRaioXEntrada = {
  id: number;
  numeroAmigavel: number;
  status: string;
  tipoLancamento: string;
  createdAt: Date;
  inicioVisitaEm: Date | null;
  latitudeEnvio: number | null;
  longitudeEnvio: number | null;
  distanciaLojaMetros: number | null;
  motivoExclusao: string | null;
  usuario: { nome: string; usuario: string };
  loja: {
    nome: string;
    codigo: string;
    latitude: number | null;
    longitude: number | null;
  };
  regiao: { nome: string };
  itens: Array<{
    status: string;
    pedidoSolicitado: number;
    trocas: number;
    produto: { descricao: string };
    logsExpedicao: Array<{
      id: number;
      acao: string;
      detalhes: string | null;
      createdAt: Date;
      usuario: { nome: string };
    }>;
  }>;
  logsAuditoria: Array<{
    id: number;
    acao: string;
    valorNovo: string | null;
    createdAt: Date;
    usuario: { nome: string };
  }>;
  dataBrasil: string;
};

export function serializarPedidoRaioX(pedido: PedidoRaioXEntrada): PedidoRaioX {
  const cancelado = pedidoEstaExcluido(pedido.status);
  const statusItens = pedido.itens.map((item) => item.status);
  const statusCalculado = cancelado
    ? pedido.status
    : calcularStatusPedidoExpedicao(statusItens);
  const statusRotulo = cancelado
    ? "CANCELADO"
    : statusCalculado.replaceAll("_", " ");

  const tempoMinutos = calcularTempoEmLojaMinutos(
    pedido.inicioVisitaEm,
    pedido.createdAt,
  );

  const farolIntegridade = avaliarFarolIntegridadeVisita({
    latitudeEnvio: pedido.latitudeEnvio,
    longitudeEnvio: pedido.longitudeEnvio,
    distanciaLojaMetros: pedido.distanciaLojaMetros,
  });

  const logsExpedicao: LogExpedicaoEntrada[] = pedido.itens.flatMap((item) =>
    item.logsExpedicao.map((log) => ({
      id: log.id,
      acao: log.acao,
      detalhes: log.detalhes,
      createdAt: log.createdAt,
      usuarioNome: log.usuario.nome,
      produtoNome: item.produto.descricao,
    })),
  );

  const logsAuditoria: LogAuditoriaEntrada[] = pedido.logsAuditoria.map(
    (log) => ({
      id: log.id,
      acao: log.acao,
      valorNovo: log.valorNovo,
      createdAt: log.createdAt,
      usuarioNome: log.usuario.nome,
    }),
  );

  const latitudeLoja = pedido.loja.latitude;
  const longitudeLoja = pedido.loja.longitude;
  const temCoordEnvio =
    pedido.latitudeEnvio != null &&
    pedido.longitudeEnvio != null &&
    Number.isFinite(pedido.latitudeEnvio) &&
    Number.isFinite(pedido.longitudeEnvio);
  const temCoordLoja =
    latitudeLoja != null &&
    longitudeLoja != null &&
    Number.isFinite(latitudeLoja) &&
    Number.isFinite(longitudeLoja);

  return {
    id: pedido.id,
    numeroAmigavel: pedido.numeroAmigavel,
    numeroAmigavelRotulo: formatarNumeroAmigavelPedido(pedido.numeroAmigavel),
    status: statusCalculado,
    statusRotulo,
    cancelado,
    data: pedido.dataBrasil,
    horaEnvio: formatarHoraBrasil(pedido.createdAt),
    dataHoraEnvio: formatarDataHoraBrasil(pedido.createdAt),
    tipoLancamento: rotuloTipoLancamentoVisita(pedido.tipoLancamento),
    promotorNome: pedido.usuario.nome,
    promotorEmail: pedido.usuario.usuario,
    lojaNome: pedido.loja.nome,
    lojaCodigo: pedido.loja.codigo,
    regiaoNome: pedido.regiao.nome,
    cercaVirtual: {
      farolIntegridade,
      distanciaMetros: pedido.distanciaLojaMetros,
      distanciaTexto: montarDistanciaTexto(pedido.distanciaLojaMetros),
      checkIn: pedido.inicioVisitaEm
        ? formatarDataHoraBrasil(pedido.inicioVisitaEm)
        : null,
      checkOut: formatarDataHoraBrasil(pedido.createdAt),
      tempoEmLoja: formatarTempoEmLoja(tempoMinutos),
      tempoEmLojaMinutos: tempoMinutos,
    },
    resumoProdutos: montarResumoConferencia(pedido.itens),
    linhaTempo: montarLinhaTempoPedido({
      pedidoId: pedido.id,
      createdAt: pedido.createdAt,
      promotorNome: pedido.usuario.nome,
      motivoExclusao: pedido.motivoExclusao,
      logsExpedicao,
      logsAuditoria,
    }),
    mapa: {
      latitudeEnvio: pedido.latitudeEnvio,
      longitudeEnvio: pedido.longitudeEnvio,
      latitudeLoja,
      longitudeLoja,
      exibirMapa: temCoordEnvio || temCoordLoja,
    },
    motivoExclusao: pedido.motivoExclusao,
  };
}
