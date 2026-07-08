import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";
import type { GeneroUsuario } from "@/lib/usuario";

export const TEST_USER_PASSWORD = "teste123";

/** Senha gravada no banco pelo seed de usuários de produção. */
export const SEED_DEFAULT_PASSWORD = SENHA_INICIAL_PADRAO;

export type TestUserProfile = {
  email: string;
  name: string;
  funcao: string;
  regiaoNome: string;
  genero: GeneroUsuario;
};

const TEST_USERS: Record<string, Omit<TestUserProfile, "email">> = {
  "promotor@teste.com": {
    name: "Promotor Teste",
    funcao: "Promotor",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "promotorac@teste.com": {
    name: "Promotor AC teste",
    funcao: "Promotor",
    regiaoNome: "Rio Branco",
    genero: "M",
  },
  "supervisor@teste.com": {
    name: "Supervisor",
    funcao: "Supervisor",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "adm@teste.com": {
    name: "Administrador Teste",
    funcao: "Administrador",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "diretor@teste.com": {
    name: "Diretor Teste",
    funcao: "Diretor",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "expedicao@teste.com": {
    name: "Expedição",
    funcao: "Expedição",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "expedicao-manaus@teste.com": {
    name: "Expedição Manaus",
    funcao: "Expedição",
    regiaoNome: "Manaus",
    genero: "M",
  },
  "expedicao-riobranco@teste.com": {
    name: "Expedição Rio Branco",
    funcao: "Expedição",
    regiaoNome: "Rio Branco",
    genero: "M",
  },
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findTestUserByEmail(email: string): TestUserProfile | null {
  const normalized = normalizeEmail(email);
  const profile = TEST_USERS[normalized];

  if (!profile) {
    return null;
  }

  return { email: normalized, ...profile };
}

export function isTestUserEmail(email: string): boolean {
  return normalizeEmail(email) in TEST_USERS;
}

export function getDisplayNameForEmail(
  email: string,
  fallback = "",
): string {
  return findTestUserByEmail(email)?.name ?? fallback;
}

export function getGeneroForEmail(
  email: string,
  fallback: GeneroUsuario = "M",
): GeneroUsuario {
  return findTestUserByEmail(email)?.genero ?? fallback;
}
