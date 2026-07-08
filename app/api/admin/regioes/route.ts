import { NextResponse } from "next/server";

import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const regioes = await prisma.regiao.findMany({
      where: {
        OR: [
          { nome: { equals: "Manaus", mode: "insensitive" } },
          { nome: { equals: "Rio Branco", mode: "insensitive" } },
        ],
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({
      regioes: regioes.map((regiao) => {
        const brand = getBrandByRegiao(regiao.nome);

        return {
          id: regiao.id,
          nome: regiao.nome,
          rotulo:
            regiao.nome.toLowerCase().includes("rio branco")
              ? "Rio Branco - Buriti"
              : "Manaus - Viva",
          primary: brand.primary,
          primaryLight: brand.primaryLight,
        };
      }),
    });
  } catch (error) {
    console.error("Erro ao listar regiões:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar regiões." },
      { status: 500 },
    );
  }
}
