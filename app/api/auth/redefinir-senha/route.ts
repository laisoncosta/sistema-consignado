import { NextResponse } from "next/server";

import { redefinirSenhaComToken } from "@/lib/recuperacao-senha";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resultado = await redefinirSenhaComToken(
      String(body.token ?? ""),
      String(body.novaSenha ?? ""),
      String(body.confirmarSenha ?? ""),
    );

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso. Faça login com a nova senha.",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha. Tente novamente." },
      { status: 500 },
    );
  }
}
