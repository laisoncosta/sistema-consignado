import { NextResponse } from "next/server";

import { cadastrarUsuarioPublico } from "@/lib/auth-cadastro";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resultado = await cadastrarUsuarioPublico({
      nome: String(body.nome ?? ""),
      email: String(body.email ?? ""),
      senha: String(body.senha ?? ""),
      confirmarSenha: String(body.confirmarSenha ?? ""),
      regiaoId: Number(body.regiaoId),
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Cadastro realizado com sucesso. Aguarde a aprovação de um Administrador ou Diretor.",
    });
  } catch (error) {
    console.error("Erro no cadastro público:", error);
    return NextResponse.json(
      { error: "Não foi possível concluir o cadastro. Tente novamente." },
      { status: 500 },
    );
  }
}
