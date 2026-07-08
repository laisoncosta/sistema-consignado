import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resetarSenhaUsuarioParaPadrao } from "../lib/resetar-senha-usuario";
import { normalizarEmailSeed } from "../lib/usuario-regioes";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emailArg = process.argv[2]?.trim();

  if (!emailArg) {
    console.error("Uso: npx tsx prisma/reset-senha-usuario.ts <email>");
    process.exit(1);
  }

  const email = normalizarEmailSeed(emailArg);

  const existente = await prisma.usuario.findFirst({
    where: { usuario: { equals: email, mode: "insensitive" } },
    select: { id: true, nome: true, usuario: true },
  });

  if (!existente) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  await resetarSenhaUsuarioParaPadrao(prisma, existente.id);

  console.log(
    `Senha de ${existente.nome} <${existente.usuario}> redefinida para 123456 (troca obrigatória no próximo login).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
