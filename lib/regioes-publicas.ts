import { prisma } from "@/lib/prisma";

export type RegiaoCadastroPublico = {
  id: number;
  nome: string;
  rotulo: string;
};

export function rotuloRegiaoSelecaoPublica(nomeRegiao: string): string {
  const nome = nomeRegiao.trim().toLowerCase();

  if (
    nome.includes("rio branco") ||
    nome.includes("buriti") ||
    nome.includes("acre")
  ) {
    return "Acre";
  }

  if (nome.includes("manaus")) {
    return "Manaus";
  }

  return nomeRegiao;
}

export async function listarRegioesCadastroPublico(): Promise<
  RegiaoCadastroPublico[]
> {
  const regioes = await prisma.regiao.findMany({
    orderBy: { nome: "asc" },
  });

  return regioes.map((regiao) => ({
    id: regiao.id,
    nome: regiao.nome,
    rotulo: rotuloRegiaoSelecaoPublica(regiao.nome),
  }));
}

export async function resolverRegiaoCadastroPublico(
  regiaoId: number,
): Promise<RegiaoCadastroPublico | null> {
  if (!Number.isInteger(regiaoId) || regiaoId <= 0) {
    return null;
  }

  const regiao = await prisma.regiao.findUnique({
    where: { id: regiaoId },
    select: { id: true, nome: true },
  });

  if (!regiao) {
    return null;
  }

  return {
    id: regiao.id,
    nome: regiao.nome,
    rotulo: rotuloRegiaoSelecaoPublica(regiao.nome),
  };
}
