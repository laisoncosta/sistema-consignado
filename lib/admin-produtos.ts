export type FiltroRegiaoProduto = "todos" | "manaus" | "rio-branco";

export type ProdutoContadores = {
  listados: number;
  manaus: number;
  rioBranco: number;
  ativos: number;
  inativos: number;
};

export type FiltroCardProdutos =
  | "listados"
  | "manaus"
  | "rio-branco"
  | "ativos"
  | "inativos";

export type FiltroStatusProduto = "todos" | "ativos" | "inativos";

export function paramsApiFiltroCardProdutos(filtro: FiltroCardProdutos): {
  regiao: FiltroRegiaoProduto;
  status: FiltroStatusProduto;
} {
  switch (filtro) {
    case "manaus":
      return { regiao: "manaus", status: "todos" };
    case "rio-branco":
      return { regiao: "rio-branco", status: "todos" };
    case "ativos":
      return { regiao: "todos", status: "ativos" };
    case "inativos":
      return { regiao: "todos", status: "inativos" };
    default:
      return { regiao: "todos", status: "todos" };
  }
}

export type ProdutoCatalogoItem = {
  id: number;
  codigo: string;
  descricao: string;
  precoUnitario: number;
  ativo: boolean;
  regiaoId: number;
  regiaoNome: string;
  regiaoRotulo: string;
};

export type ProdutoFormData = {
  codigo: string;
  descricao: string;
  precoUnitario: number;
  ativo: boolean;
  regiaoId: number;
};

export type RegiaoCatalogo = {
  id: number;
  nome: string;
  rotulo: string;
};

export const ABAS_REGIAO_PRODUTO: Array<{
  id: FiltroRegiaoProduto;
  label: string;
}> = [
  { id: "todos", label: "Todos" },
  { id: "manaus", label: "Manaus - Viva" },
  { id: "rio-branco", label: "Rio Branco - Buriti" },
];

export function rotuloRegiaoProduto(nomeRegiao: string): string {
  if (nomeRegiao.toLowerCase().includes("rio branco")) {
    return "Rio Branco - Buriti";
  }

  return "Manaus - Viva";
}

export function formatarMoedaBrl(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function normalizarPrecoUnitario(valor: unknown): number {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return Math.round(numero * 100) / 100;
}

export function filtroRegiaoParaNome(regiao: FiltroRegiaoProduto): string | null {
  if (regiao === "manaus") {
    return "Manaus";
  }

  if (regiao === "rio-branco") {
    return "Rio Branco";
  }

  return null;
}
