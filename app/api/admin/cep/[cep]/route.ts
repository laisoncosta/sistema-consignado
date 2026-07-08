import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { formatarCepResposta } from "@/lib/consultar-cep";

type RouteContext = {
  params: Promise<{ cep: string }>;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { cep: cepParam } = await context.params;
  const cep = cepParam.replace(/\D/g, "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  try {
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86400 },
    });

    if (!viaCepResponse.ok) {
      return NextResponse.json(
        { error: "Não foi possível consultar o CEP." },
        { status: 502 },
      );
    }

    const viaCep = (await viaCepResponse.json()) as ViaCepResponse;

    if (viaCep.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      cep: formatarCepResposta(cep),
      rua: viaCep.logradouro?.trim() ?? "",
      bairro: viaCep.bairro?.trim() ?? "",
      cidade: viaCep.localidade?.trim() ?? "",
      uf: viaCep.uf?.trim().toUpperCase() ?? "",
    });
  } catch (error) {
    console.error("Erro ao consultar CEP:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o CEP." },
      { status: 500 },
    );
  }
}
