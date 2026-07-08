const INICIO_VISITA_SESSION_PREFIX = "shi-inicio-visita-loja-";

export function registrarInicioVisitaLoja(lojaId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const id = String(lojaId ?? "").trim();

  if (!id) {
    return;
  }

  sessionStorage.setItem(
    `${INICIO_VISITA_SESSION_PREFIX}${id}`,
    new Date().toISOString(),
  );
}

export function obterInicioVisitaLoja(lojaId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const id = String(lojaId ?? "").trim();

  if (!id) {
    return null;
  }

  const valor = sessionStorage.getItem(`${INICIO_VISITA_SESSION_PREFIX}${id}`);

  return valor && valor.trim() ? valor : null;
}

export function limparInicioVisitaLoja(lojaId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const id = String(lojaId ?? "").trim();

  if (!id) {
    return;
  }

  sessionStorage.removeItem(`${INICIO_VISITA_SESSION_PREFIX}${id}`);
}
