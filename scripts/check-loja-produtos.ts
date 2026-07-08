import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
  const loja = await prisma.loja.findFirst({
    where: { nome: { contains: "RIO BRANCO", mode: "insensitive" } },
    include: {
      regiao: true,
      produtosVinculados: {
        where: { ativo: true },
        include: { produto: true },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        lojaId: loja?.id,
        codigo: loja?.codigo,
        nome: loja?.nome,
        regiaoId: loja?.regiaoId,
        regiao: loja?.regiao.nome,
        produtos: loja?.produtosVinculados.map((v) => ({
          id: v.produtoId,
          ativo: v.ativo,
          produto: v.produto.descricao,
          produtoAtivo: v.produto.ativo,
        })),
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());
