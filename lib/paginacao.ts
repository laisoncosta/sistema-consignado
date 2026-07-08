export const PAGINACAO_PADRAO = 30;
export const PAGINACAO_MINIMA = 20;
export const PAGINACAO_MAXIMA = 50;

export type ParametrosPaginacao = {
  pagina: number;
  limite: number;
  skip: number;
  take: number;
};

export type MetaPaginacao = {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  temProxima: boolean;
  temAnterior: boolean;
};

export function resolverParametrosPaginacao(
  paginaBruta: string | number | null | undefined,
  limiteBruto: string | number | null | undefined,
): ParametrosPaginacao {
  const pagina = Math.max(1, Number(paginaBruta) || 1);
  const limiteSolicitado = Number(limiteBruto) || PAGINACAO_PADRAO;
  const limite = Math.min(
    PAGINACAO_MAXIMA,
    Math.max(PAGINACAO_MINIMA, limiteSolicitado),
  );

  return {
    pagina,
    limite,
    skip: (pagina - 1) * limite,
    take: limite,
  };
}

export function montarMetaPaginacao(
  total: number,
  pagina: number,
  limite: number,
): MetaPaginacao {
  const totalPaginas = total > 0 ? Math.ceil(total / limite) : 1;

  return {
    pagina,
    limite,
    total,
    totalPaginas,
    temProxima: pagina < totalPaginas,
    temAnterior: pagina > 1,
  };
}
