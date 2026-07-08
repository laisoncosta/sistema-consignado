/**
 * Fetch do browser sempre com caminho relativo ao host atual (IP da rede no mobile).
 * Nunca use localhost/127.0.0.1 hardcoded no cliente.
 */
export function getClientOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function apiUrl(path: string): string {
  const normalizado = path.startsWith("/") ? path : `/${path}`;

  if (
    /localhost/i.test(normalizado) ||
    /127\.0\.0\.1/.test(normalizado) ||
    /^https?:\/\//i.test(normalizado)
  ) {
    throw new Error(
      "Chamadas de API no cliente devem usar caminho relativo (ex: /api/pedidos).",
    );
  }

  return normalizado;
}

/** Monta URL absoluta só quando necessário, usando o host atual (IP ou localhost). */
export function resolveApiUrl(path: string): string {
  const relativo = apiUrl(path);
  const origin = getClientOrigin();

  return origin ? `${origin}${relativo}` : relativo;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (
    typeof window !== "undefined" &&
    /ngrok/i.test(window.location.hostname)
  ) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  return fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });
}

function pareceRespostaHtml(texto: string): boolean {
  const inicio = texto.trim().slice(0, 200).toLowerCase();
  return inicio.includes("<!doctype") || inicio.includes("<html");
}

function mensagemErroRespostaHtml(texto: string, status: number): string {
  const corpo = texto.toLowerCase();

  if (corpo.includes("ngrok")) {
    return "O túnel Ngrok bloqueou a requisição. Na página do túnel, clique em “Visit Site” e tente novamente.";
  }

  if (status >= 500) {
    return "Erro interno no servidor ao processar a requisição. Verifique se o banco está acessível e se as migrations do Prisma foram aplicadas.";
  }

  return "Resposta inválida do servidor. Recarregue a página e tente novamente.";
}

export async function parseApiJson<T>(response: Response): Promise<T> {
  const texto = await response.text();

  if (!texto.trim()) {
    throw new Error("Resposta vazia do servidor.");
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    if (pareceRespostaHtml(texto)) {
      throw new Error(mensagemErroRespostaHtml(texto, response.status));
    }

    throw new Error("Resposta inválida do servidor. Recarregue a página.");
  }
}
