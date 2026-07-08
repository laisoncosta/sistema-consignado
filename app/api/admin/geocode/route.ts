import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { geocodificarEnderecoLoja } from "@/lib/endereco-loja";

export async function POST(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const rua = String(body.rua ?? "").trim();
    const numero = String(body.numero ?? "").trim();
    const bairro = String(body.bairro ?? "").trim();
    const cidade = String(body.cidade ?? "").trim();
    const uf = String(body.uf ?? "").trim().toUpperCase();
    const cep = String(body.cep ?? "").trim();

    if (!rua || !numero || !bairro || !cidade || uf.length !== 2) {
      return NextResponse.json(
        {
          error:
            "Informe rua, número, bairro, cidade e UF para validar o ponto no mapa.",
        },
        { status: 400 },
      );
    }

    const resultado = await geocodificarEnderecoLoja({
      rua,
      numero,
      bairro,
      cidade,
      uf,
      cep,
    });

    if (resultado.latitude == null || resultado.longitude == null) {
      return NextResponse.json(
        {
          error:
            "Não foi possível localizar as coordenadas para este endereço.",
          enderecoConsultado: resultado.enderecoConsultado,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    return NextResponse.json(
      { error: "Não foi possível validar o ponto no mapa." },
      { status: 500 },
    );
  }
}
