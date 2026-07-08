/** UF padrão conforme a filial/região cadastrada no sistema. */
export function ufPorNomeRegiao(regiaoNome: string): string {
  const nome = regiaoNome.trim().toLowerCase();

  if (nome.includes("rio branco")) {
    return "AC";
  }

  if (nome.includes("manaus")) {
    return "AM";
  }

  return "AM";
}

export function normalizarUf(uf: string | null | undefined): string {
  return (uf ?? "").trim().toUpperCase().slice(0, 2);
}

export function ufValida(uf: string): boolean {
  return /^[A-Z]{2}$/.test(uf);
}
