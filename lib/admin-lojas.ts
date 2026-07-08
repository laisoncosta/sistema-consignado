import {
  ABAS_REGIAO_PRODUTO,
  filtroRegiaoParaNome,
  rotuloRegiaoProduto,
  type FiltroRegiaoProduto,
  type RegiaoCatalogo,
} from "@/lib/admin-produtos";
import {
  booleanParaStatusCercaLoja,
  normalizarPerimetroCerca,
  statusCercaLojaParaBoolean,
  type StatusCercaVirtualLoja,
} from "@/lib/cerca-virtual";

export type {
  FiltroCardLojas,
  FiltroRegiaoProduto,
  FiltroStatusLoja,
  RegiaoCatalogo,
  StatusCercaVirtualLoja,
};
export {
  ABAS_REGIAO_PRODUTO,
  filtroRegiaoParaNome,
  rotuloRegiaoProduto,
  booleanParaStatusCercaLoja,
  statusCercaLojaParaBoolean,
  normalizarPerimetroCerca,
};

export type LojaCatalogoItem = {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  regiaoId: number;
  regiaoNome: string;
  regiaoRotulo: string;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  cercaVirtualAtiva: boolean;
  perimetroCerca: number;
};

export type LojaContadores = {
  total: number;
  manaus: number;
  rioBranco: number;
  ativas: number;
};

export type FiltroCardLojas = "total" | "manaus" | "rio-branco" | "ativas";

export type FiltroStatusLoja = "todos" | "ativas" | "inativas";

export function paramsApiFiltroCardLojas(filtro: FiltroCardLojas): {
  regiao: FiltroRegiaoProduto;
  status: FiltroStatusLoja;
} {
  switch (filtro) {
    case "manaus":
      return { regiao: "manaus", status: "todos" };
    case "rio-branco":
      return { regiao: "rio-branco", status: "todos" };
    case "ativas":
      return { regiao: "todos", status: "ativas" };
    default:
      return { regiao: "todos", status: "todos" };
  }
}

export type LojaCadastroFormData = {
  codigo: string;
  nome: string;
  regiaoId: number;
  ativo: boolean;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: string;
  longitude: string;
  cercaVirtualStatus: StatusCercaVirtualLoja;
  perimetro: string;
  produtosAtivos: number[];
};

export type LojaEdicaoFormData = {
  codigo: string;
  nome: string;
  regiaoId: number;
  ativo: boolean;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: string;
  longitude: string;
  cercaVirtualStatus: StatusCercaVirtualLoja;
  perimetro: string;
  produtosAtivos: number[];
};

export type ProdutoLojaVinculo = {
  id: number;
  codigo: string;
  descricao: string;
  ativoNaLoja: boolean;
};

export function normalizarCoordenada(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

export function formatarCep(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);

  if (digitos.length <= 5) {
    return digitos;
  }

  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}
