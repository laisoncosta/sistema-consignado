export function perfilSeedParaFuncao(perfil: string): string {
  const normalizado = perfil.trim().toLowerCase();

  if (normalizado === "adm" || normalizado === "administrador") {
    return "Administrador";
  }

  if (normalizado === "diretor") {
    return "Diretor";
  }

  if (normalizado === "expedição" || normalizado === "expedicao") {
    return "Expedição";
  }

  if (normalizado === "supervisor") {
    return "Supervisor";
  }

  return "Promotor";
}

export function normalizarEmailSeed(email: string): string {
  return email.trim().toLowerCase();
}

export const EMAILS_DIRETOR_ACESSO_GLOBAL = new Set([
  "laison.costa@gmail.com",
  "arnaldomoraes.arving2017@gmail.com",
  "vivahidroco@gmail.com",
]);

export function diretorComAcessoGlobal(email: string): boolean {
  return EMAILS_DIRETOR_ACESSO_GLOBAL.has(normalizarEmailSeed(email));
}
