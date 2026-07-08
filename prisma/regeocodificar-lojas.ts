import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { geocodificarEnderecoLoja } from "../lib/endereco-loja";
import { ufPorNomeRegiao } from "../lib/uf-regiao";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PAUSA_MS = 1100;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const lojas = await prisma.loja.findMany({
    include: { regiao: true },
    orderBy: [{ regiaoId: "asc" }, { nome: "asc" }],
  });

  let atualizadas = 0;
  let ignoradas = 0;
  let falhas = 0;

  for (const loja of lojas) {
    const rua = loja.rua?.trim() ?? "";
    const numero = loja.numero?.trim() ?? "";
    const bairro = loja.bairro?.trim() ?? "";
    const cidade = loja.cidade?.trim() ?? "";

    if (!rua || !bairro || !cidade) {
      ignoradas += 1;
      console.log(`· ignorada (endereço incompleto): ${loja.nome}`);
      continue;
    }

    const uf = ufPorNomeRegiao(loja.regiao.nome);
    const geocodificado = await geocodificarEnderecoLoja({
      rua,
      numero: numero || "S/N",
      bairro,
      cidade,
      uf,
      cep: loja.cep ?? undefined,
    });

    if (
      geocodificado.latitude == null ||
      geocodificado.longitude == null
    ) {
      falhas += 1;
      console.log(`✗ sem coordenadas: ${loja.nome} — ${geocodificado.enderecoConsultado}`);
      await aguardar(PAUSA_MS);
      continue;
    }

    await prisma.loja.update({
      where: { id: loja.id },
      data: {
        latitude: geocodificado.latitude,
        longitude: geocodificado.longitude,
      },
    });

    atualizadas += 1;
    console.log(
      `✓ ${loja.nome} (${loja.regiao.nome}) → ${geocodificado.latitude}, ${geocodificado.longitude}`,
    );

    await aguardar(PAUSA_MS);
  }

  console.log(
    `\nConcluído: ${atualizadas} atualizada(s), ${ignoradas} ignorada(s), ${falhas} sem coordenadas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
