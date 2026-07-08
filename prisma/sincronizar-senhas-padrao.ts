import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { SENHA_INICIAL_PADRAO } from "../lib/senha-padrao";
import { TEST_USER_PASSWORD } from "../lib/test-users";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SENHAS_PADRAO = [SENHA_INICIAL_PADRAO, TEST_USER_PASSWORD];

async function main() {
  const usuarios = await prisma.usuario.findMany({
    where: {
      OR: SENHAS_PADRAO.map((senha) => ({ senha })),
    },
    select: { id: true, nome: true, usuario: true, alterarSenhaObrigatorio: true },
  });

  if (usuarios.length === 0) {
    console.log("Nenhum usuário com senha padrão encontrado.");
    return;
  }

  const atualizados = await prisma.usuario.updateMany({
    where: {
      id: { in: usuarios.map((usuario) => usuario.id) },
      alterarSenhaObrigatorio: false,
    },
    data: { alterarSenhaObrigatorio: true },
  });

  console.log(
    `${atualizados.count} usuário(s) marcado(s) para troca obrigatória de senha.`,
  );

  for (const usuario of usuarios) {
    console.log(`· ${usuario.nome} <${usuario.usuario}>`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
