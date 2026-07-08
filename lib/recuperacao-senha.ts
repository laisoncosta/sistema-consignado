import { randomBytes } from "crypto";

import { normalizarEmailLogin } from "@/lib/admin-usuarios";
import { enviarEmail, obterUrlBaseApp } from "@/lib/enviar-email";
import { prisma } from "@/lib/prisma";

const TOKEN_VALIDADE_HORAS = 2;

function gerarTokenSeguro(): string {
  return randomBytes(32).toString("hex");
}

export async function solicitarRecuperacaoSenha(
  rawEmail: string,
  request?: Request,
): Promise<void> {
  const email = normalizarEmailLogin(rawEmail);

  if (!email) {
    return;
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      usuario: { equals: email, mode: "insensitive" },
      ativo: true,
      statusConta: "Ativo",
    },
    select: { id: true, nome: true, usuario: true },
  });

  if (!usuario) {
    return;
  }

  const token = gerarTokenSeguro();
  const expiresAt = new Date(Date.now() + TOKEN_VALIDADE_HORAS * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.tokenRecuperacaoSenha.updateMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.tokenRecuperacaoSenha.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiresAt,
      },
    });
  });

  const baseUrl = obterUrlBaseApp(request);
  const link = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const primeiroNome = usuario.nome.trim().split(/\s+/)[0] ?? usuario.nome;

  await enviarEmail({
    para: usuario.usuario,
    assunto: "Recuperação de senha — Sistema Consignado",
    texto: [
      `Olá, ${primeiroNome}.`,
      "",
      "Recebemos uma solicitação para redefinir sua senha.",
      `Acesse o link abaixo em até ${TOKEN_VALIDADE_HORAS} horas:`,
      link,
      "",
      "Se você não solicitou esta alteração, ignore este e-mail.",
    ].join("\n"),
    html: `
      <p>Olá, <strong>${primeiroNome}</strong>.</p>
      <p>Recebemos uma solicitação para redefinir sua senha no Sistema Consignado.</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">Redefinir minha senha</a></p>
      <p>Este link expira em ${TOKEN_VALIDADE_HORAS} horas.</p>
      <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
    `,
  });
}

export type RedefinirSenhaTokenResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function redefinirSenhaComToken(
  tokenBruto: string,
  novaSenha: string,
  confirmarSenha: string,
): Promise<RedefinirSenhaTokenResult> {
  const token = tokenBruto.trim();
  const senha = novaSenha.trim();
  const confirmacao = confirmarSenha.trim();

  if (!token) {
    return {
      ok: false,
      error: "Link de recuperação inválido.",
      status: 400,
    };
  }

  if (senha.length < 6) {
    return {
      ok: false,
      error: "A nova senha deve ter pelo menos 6 caracteres.",
      status: 400,
    };
  }

  if (senha !== confirmacao) {
    return {
      ok: false,
      error: "As senhas informadas não coincidem.",
      status: 400,
    };
  }

  const registro = await prisma.tokenRecuperacaoSenha.findUnique({
    where: { token },
    include: {
      usuario: {
        select: {
          id: true,
          ativo: true,
          statusConta: true,
        },
      },
    },
  });

  if (
    !registro ||
    registro.usedAt ||
    registro.expiresAt.getTime() < Date.now() ||
    !registro.usuario.ativo ||
    registro.usuario.statusConta !== "Ativo"
  ) {
    return {
      ok: false,
      error: "Link de recuperação inválido ou expirado. Solicite um novo e-mail.",
      status: 400,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: registro.usuarioId },
      data: {
        senha,
        alterarSenhaObrigatorio: false,
      },
    });

    await tx.tokenRecuperacaoSenha.update({
      where: { id: registro.id },
      data: { usedAt: new Date() },
    });

    await tx.tokenRecuperacaoSenha.updateMany({
      where: {
        usuarioId: registro.usuarioId,
        usedAt: null,
        id: { not: registro.id },
      },
      data: { usedAt: new Date() },
    });
  });

  return { ok: true };
}
