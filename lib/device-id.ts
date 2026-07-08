import { prisma } from "@/lib/prisma";

export const MENSAGEM_APARELHO_NAO_AUTORIZADO =
  "Aparelho não autorizado para este usuário. Entre em contato com a Diretoria.";

const DEVICE_ID_MIN_LENGTH = 8;
const DEVICE_ID_MAX_LENGTH = 128;

export function normalizarDeviceId(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const normalizado = valor.trim();

  if (
    normalizado.length < DEVICE_ID_MIN_LENGTH ||
    normalizado.length > DEVICE_ID_MAX_LENGTH
  ) {
    return null;
  }

  return normalizado;
}

export type ResultadoTravaAparelho =
  | { permitido: true; deviceIdVinculado?: string }
  | { permitido: false; erro: string; status: number };

type UsuarioTravaAparelho = {
  id: number;
  deviceId: string | null;
  ignorarTravaAparelho: boolean;
};

/**
 * Regra gradual de login:
 * - device_id vazio → vincula silenciosamente e permite
 * - device_id preenchido e diferente + trava ativa → bloqueia
 */
export async function validarTravaAparelhoLogin(
  usuario: UsuarioTravaAparelho,
  deviceIdInformado: string | null,
): Promise<ResultadoTravaAparelho> {
  if (usuario.ignorarTravaAparelho) {
    return { permitido: true };
  }

  const cadastrado = normalizarDeviceId(usuario.deviceId);

  if (!cadastrado) {
    if (!deviceIdInformado) {
      return { permitido: true };
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { deviceId: deviceIdInformado },
    });

    return { permitido: true, deviceIdVinculado: deviceIdInformado };
  }

  if (!deviceIdInformado) {
    return {
      permitido: false,
      erro: MENSAGEM_APARELHO_NAO_AUTORIZADO,
      status: 403,
    };
  }

  if (deviceIdInformado !== cadastrado) {
    return {
      permitido: false,
      erro: MENSAGEM_APARELHO_NAO_AUTORIZADO,
      status: 403,
    };
  }

  return { permitido: true };
}

export async function resetarAparelhoUsuario(usuarioId: number): Promise<void> {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { deviceId: null },
  });
}
