import { NextResponse } from "next/server";

import { listarLojasPortalUsuario } from "@/lib/portal-lojas";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import { getSession } from "@/lib/session";
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const usuarioId = await resolveSessionUserId(session);

  if (usuarioId <= 0) {
    return NextResponse.json(
      {
        error:
          "Cadastro do promotor não encontrado no sistema. Solicite ao administrador a liberação ou execute o seed de usuários.",
      },
      { status: 403 },
    );
  }

  try {
    const lojas = await listarLojasPortalUsuario({
      ...session,
      id: usuarioId,
    });    return NextResponse.json({ lojas });
  } catch (error) {
    console.error("Erro ao listar lojas do promotor:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as lojas vinculadas." },
      { status: 500 },
    );
  }
}
