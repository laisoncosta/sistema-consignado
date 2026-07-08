import { NextResponse } from "next/server";

import { MENSAGEM_RECUPERACAO_ENVIADA } from "@/lib/auth-codes";
import { solicitarRecuperacaoSenha } from "@/lib/recuperacao-senha";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail cadastrado." },
        { status: 400 },
      );
    }

    await solicitarRecuperacaoSenha(email, request);

    return NextResponse.json({
      success: true,
      message: MENSAGEM_RECUPERACAO_ENVIADA,
    });
  } catch (error) {
    console.error("Erro na recuperação de senha:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail de recuperação. Tente novamente." },
      { status: 500 },
    );
  }
}
