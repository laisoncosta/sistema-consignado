import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/authenticate-user";
import { hydrateSessionUser } from "@/lib/resolve-session-user-id";
import { applySessionToResponse } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "");
    const senha = String(body.senha ?? "");
    const deviceId = body.deviceId ?? body.device_id ?? null;

    const result = await authenticateUser(email, senha, deviceId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    const user = await hydrateSessionUser(result.user);

    const response = NextResponse.json({
      success: true,
      requiresPasswordChange: result.requiresPasswordChange,
      redirectTo: result.redirectTo,
      user: {
        email: user.email,
        name: user.name,
        funcao: user.funcao,
        regiao: user.regiaoNome,
      },
      brand: result.brand,
    });

    return applySessionToResponse(response, user, request);
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Não foi possível realizar o login. Tente novamente." },
      { status: 500 },
    );
  }
}
