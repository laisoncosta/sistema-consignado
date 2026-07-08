export type GeneroUsuario = "M" | "F";

export function normalizarGenero(genero?: string | null): GeneroUsuario {
  return genero?.toUpperCase() === "F" ? "F" : "M";
}

export function montarTituloBoasVindas(
  nome: string,
  genero: GeneroUsuario = "M",
): string {
  const saudacao = genero === "F" ? "Bem-vinda" : "Bem-vindo";
  return `${saudacao}, ${nome} ao Sistema de Pedidos Consignados.`;
}

/** Saudação curta exibida no Portal de Pedidos (somente aba novo pedido). */
export function montarSaudacaoPortal(
  nome: string,
  genero: GeneroUsuario = "M",
): string {
  const saudacao = genero === "F" ? "Bem-vinda" : "Bem-vindo";
  return `${saudacao}, ${nome}`;
}

export const TEXTO_ORIENTACAO_BOAS_VINDAS =
  "Use o menu acima para realizar novos lançamentos de Pedidos ou para consultar o histórico consolidado de estoques, trocas e avarias das suas lojas.";
