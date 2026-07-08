type HeaderReader = {
  get(name: string): string | null;
};

function primeiroValorHeader(valor: string | null): string {
  return valor?.split(",")[0]?.trim().toLowerCase() ?? "";
}

export function hostIndicaTunelHttps(host: string): boolean {
  const normalizado = host.toLowerCase();

  return (
    normalizado.includes("ngrok") ||
    normalizado.endsWith(".ngrok-free.app") ||
    normalizado.endsWith(".ngrok-free.dev") ||
    normalizado.endsWith(".ngrok.app") ||
    normalizado.endsWith(".ngrok.io")
  );
}

function hostDeHeaders(headers: HeaderReader): string {
  return primeiroValorHeader(
    headers.get("x-forwarded-host") ??
      headers.get("host") ??
      headers.get(":authority"),
  );
}

export function isHttpsRequest(headers: HeaderReader): boolean {
  const proto = primeiroValorHeader(headers.get("x-forwarded-proto"));

  if (proto === "https") {
    return true;
  }

  const forwarded = primeiroValorHeader(headers.get("forwarded"));
  if (forwarded.includes("proto=https")) {
    return true;
  }

  if (headers.get("x-forwarded-ssl") === "on") {
    return true;
  }

  return hostIndicaTunelHttps(hostDeHeaders(headers));
}
