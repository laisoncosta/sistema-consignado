import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const REGIOES = ["Manaus", "Rio Branco"] as const;

async function ativarProdutosPorRegiao(nomeRegiao: (typeof REGIOES)[number]) {
  const regiao = await prisma.regiao.findFirst({
    where: { nome: { equals: nomeRegiao, mode: "insensitive" } },
  });

  if (!regiao) {
    console.warn(`Região não encontrada: ${nomeRegiao}`);
    return;
  }

  const [produtos, lojas] = await Promise.all([
    prisma.produto.findMany({
      where: { regiaoId: regiao.id, ativo: true },
      select: { id: true, codigo: true, descricao: true },
      orderBy: { descricao: "asc" },
    }),
    prisma.loja.findMany({
      where: { regiaoId: regiao.id },
      select: { id: true, codigo: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (produtos.length === 0) {
    console.warn(`  Nenhum produto ativo em ${nomeRegiao}.`);
    return;
  }

  if (lojas.length === 0) {
    console.warn(`  Nenhuma loja em ${nomeRegiao}.`);
    return;
  }

  const lojaIds = lojas.map((loja) => loja.id);

  await prisma.lojaProduto.deleteMany({
    where: { lojaId: { in: lojaIds } },
  });

  const vinculos = lojas.flatMap((loja) =>
    produtos.map((produto) => ({
      lojaId: loja.id,
      produtoId: produto.id,
      ativo: true,
    })),
  );

  await prisma.lojaProduto.createMany({
    data: vinculos,
    skipDuplicates: true,
  });

  console.log(`\n${nomeRegiao}:`);
  console.log(`  ${produtos.length} produto(s) ativo(s)`);
  console.log(`  ${lojas.length} loja(s)`);
  console.log(`  ${vinculos.length} vínculo(s) criado(s)`);

  for (const loja of lojas) {
    console.log(`    • ${loja.codigo} - ${loja.nome}: ${produtos.length} produto(s)`);
  }
}

async function main() {
  console.log("Ativando produtos por região (loja ↔ produtos da mesma região)...\n");

  for (const regiao of REGIOES) {
    await ativarProdutosPorRegiao(regiao);
  }

  console.log("\nConcluído.");
}

main()
  .catch((error) => {
    console.error("Erro ao vincular produtos às lojas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
