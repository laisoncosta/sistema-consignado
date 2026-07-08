import { NextResponse } from "next/server";

import { listarRegioesCadastroPublico } from "@/lib/regioes-publicas";

export async function GET() {
  try {
    const regioes = await listarRegioesCadastroPublico();

    if (regioes.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma região disponível para cadastro." },
        { status: 503 },
      );
    }

    return NextResponse.json({ regioes });
  } catch (error) {
    console.error("Erro ao listar regiões para cadastro:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as regiões." },
      { status: 500 },
    );
  }
}
