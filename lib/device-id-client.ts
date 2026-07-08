const DEVICE_ID_STORAGE_KEY = "sistema-consignado-device-id";

function gerarUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Identificador estável do aparelho para web/PWA.
 * Apps nativos devem enviar o Device ID/UUID do hardware no login.
 */
export function obterDeviceIdCliente(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existente = localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();

    if (existente && existente.length >= 8) {
      return existente;
    }

    const novo = gerarUuid();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, novo);
    return novo;
  } catch {
    return gerarUuid();
  }
}
