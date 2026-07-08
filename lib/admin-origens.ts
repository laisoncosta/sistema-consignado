import {
  filtroRegiaoParaNome,
  rotuloRegiaoProduto,
  type FiltroRegiaoProduto,
  type RegiaoCatalogo,
} from "@/lib/admin-produtos";

export type OrigemCatalogoItem = {
  id: number;
  nome: string;
  regiaoId: number;
  regiaoNome: string;
  regiaoRotulo: string;
  createdAt: string;
};

export type OrigemFormData = {
  nome: string;
  regiaoId: number;
};

export { filtroRegiaoParaNome, rotuloRegiaoProduto };
export type { FiltroRegiaoProduto, RegiaoCatalogo };

export const ABAS_REGIAO_ORIGEM = [
  { id: "todos" as const, label: "Todos" },
  { id: "manaus" as const, label: "Manaus - Viva" },
  { id: "rio-branco" as const, label: "Rio Branco - Buriti" },
];
