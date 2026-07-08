export function normalizarIdLoja(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

export function idsLojaEquivalentes(a: unknown, b: unknown): boolean {
  const idA = normalizarIdLoja(a);
  const idB = normalizarIdLoja(b);

  if (!idA || !idB) {
    return false;
  }

  if (idA === idB) {
    return true;
  }

  const numeroA = Number(idA);
  const numeroB = Number(idB);

  if (
    Number.isInteger(numeroA) &&
    Number.isInteger(numeroB) &&
    numeroA > 0 &&
    numeroB > 0 &&
    numeroA === numeroB
  ) {
    return true;
  }

  return false;
}

type LojaIdentificavel = {
  id: string;
  rotulo?: string;
};

export function resolverLojaPorValor<T extends LojaIdentificavel>(
  lojas: T[],
  valor: string,
): T | undefined {
  const idNormalizado = normalizarIdLoja(valor);

  if (!idNormalizado) {
    return undefined;
  }

  const porId = lojas.find((loja) => idsLojaEquivalentes(loja.id, idNormalizado));
  if (porId) {
    return porId;
  }

  return lojas.find((loja) => {
    const rotulo = loja.rotulo ?? "";
    return (
      rotulo.startsWith(`${idNormalizado} -`) ||
      rotulo.startsWith(`${idNormalizado}-`)
    );
  });
}
