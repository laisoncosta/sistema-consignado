import { NextResponse } from "next/server";

import { getRedirectPath } from "@/lib/brands";
import { prisma } from "@/lib/prisma";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import {
  applySessionToResponse,
  getSession,
  type SessionUser,
} from "@/lib/session";
import { senhaEhPadraoInicial } from "@/lib/troca-senha-obrigatoria";
import { normalizarGenero } from "@/lib/usuario";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const usuarioId = await resolveSessionUserId(session);

  if (usuarioId <= 0) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const novaSenha = String(body.novaSenha ?? "").trim();
    const confirmarSenha = String(body.confirmarSenha ?? "").trim();

    if (!novaSenha || novaSenha.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json(
        { error: "A confirmação da senha não confere." },
        { status: 400 },
      );
    }

    if (senhaEhPadraoInicial(novaSenha)) {
      return NextResponse.json(
        { error: "Escolha uma senha diferente da senha padrão do sistema." },
        { status: 400 },
      );
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: novaSenha,
        alterarSenhaObrigatorio: false,
      },
      include: {
        regiao: true,
        regioesAcesso: { select: { regiaoId: true } },
      },
    });

    const sessionUser: SessionUser = {
      id: usuario.id,
      email: session.email,
      name: usuario.nome,
      nome: usuario.nome,
      usuario: session.email,
      funcao: usuario.funcao,
      genero: normalizarGenero(usuario.genero),
      regiaoId: usuario.regiaoId,
      regiaoNome: usuario.regiao.nome,
      alterarSenhaObrigatorio: false,
      regioesAcessoIds: usuario.regioesAcesso.map((item) => item.regiaoId),
    };

    const response = NextResponse.json({
      success: true,
      redirectTo: getRedirectPath(usuario.funcao),
    });

    return applySessionToResponse(response, sessionUser, request);
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return NextResponse.json(
      { error: "Não foi possível alterar a senha." },
      { status: 500 },
    );
  }
}
