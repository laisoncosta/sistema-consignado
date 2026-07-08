export function montarUrlPortal(
  pathname: string,
  searchParams: URLSearchParams | string,
  patch: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams(
    typeof searchParams === "string" ? searchParams : searchParams.toString(),
  );

  for (const [chave, valor] of Object.entries(patch)) {
    if (valor === null || valor === undefined) {
      params.delete(chave);
    } else {
      params.set(chave, valor);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function obterAbaPortal(searchParams: URLSearchParams): "novo-pedido" | "historico" {
  return searchParams.get("aba") === "historico" ? "historico" : "novo-pedido";
}
