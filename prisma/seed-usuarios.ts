import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { SENHA_INICIAL_PADRAO } from "../lib/senha-padrao";
import {
  diretorComAcessoGlobal,
  normalizarEmailSeed,
  perfilSeedParaFuncao,
} from "../lib/usuario-regioes";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SENHA_PADRAO = SENHA_INICIAL_PADRAO;
const SENHA_CONTA_TESTE = "teste123";

type UsuarioSeed = {
  nome: string;
  email: string;
  perfil: string;
  regiao: "Manaus" | "Rio Branco";
};

const USUARIOS_PRODUCAO: UsuarioSeed[] = [
  { nome: "Samela", email: "samelam436@gmail.com", perfil: "Promotor", regiao: "Manaus" },
  { nome: "Ronalte", email: "llmaronalte@gmail.com", perfil: "Promotor", regiao: "Manaus" },
  {
    nome: "Elisângela Silva",
    email: "Promotoria_eli@gmail.com",
    perfil: "Promotor",
    regiao: "Manaus",
  },
  { nome: "Yasmin", email: "yasminsantosflor3@gmail.com", perfil: "Promotor", regiao: "Manaus" },
  {
    nome: "Emerson Albuquerque",
    email: "emersonalbuquerque642@gmail.com",
    perfil: "Promotor",
    regiao: "Manaus",
  },
  { nome: "WITOR JUNIO", email: "witorjunio@gmail.com", perfil: "Adm", regiao: "Manaus" },
  {
    nome: "Expedicao",
    email: "expedicao.viva@outlook.com",
    perfil: "Expedição",
    regiao: "Manaus",
  },
  {
    nome: "Comercial Viva",
    email: "vivahidroponicos.vendas@gmail.com",
    perfil: "Adm",
    regiao: "Manaus",
  },
  { nome: "Emilly", email: "mm.intermediador@hotmail.com", perfil: "Promotor", regiao: "Manaus" },
  { nome: "waesllem", email: "waesllem@gmail.com", perfil: "Promotor", regiao: "Manaus" },
  {
    nome: "Rosineide Pereira da Silva",
    email: "rose_pereira14@hotmail.com",
    perfil: "Promotor",
    regiao: "Manaus",
  },
  { nome: "Karla Nunes", email: "nunesjr051098@gmail.com", perfil: "Promotor", regiao: "Manaus" },
  {
    nome: "José felipe",
    email: "felipepessoa5555j@gmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Laison Costa",
    email: "laison.costa@gmail.com",
    perfil: "Diretor",
    regiao: "Rio Branco",
  },
  {
    nome: "Buriti Rio Branco",
    email: "hidroburiti@gmail.com",
    perfil: "Adm",
    regiao: "Rio Branco",
  },
  {
    nome: "Empresa",
    email: "pedidosburiti@outlook.com",
    perfil: "Expedição",
    regiao: "Rio Branco",
  },
  {
    nome: "Alex Nunes sábino",
    email: "alexnunes2008@hotmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Tiago cruz",
    email: "tiago.limaa.palmeiras@gmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Tiago Staff Da Silva Barbosa",
    email: "tiagostaffbarbosa@gmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Promotor Jaime Silva",
    email: "promotorjaime7@gmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Alexandre",
    email: "alemedeiros210799@gmail.com",
    perfil: "Promotor",
    regiao: "Rio Branco",
  },
  {
    nome: "Promotor Teste",
    email: "promotor@teste.com",
    perfil: "Promotor",
    regiao: "Manaus",
  },
  {
    nome: "Arnaldo",
    email: "arnaldomoraes.arving2017@gmail.com",
    perfil: "Diretor",
    regiao: "Rio Branco",
  },
  {
    nome: "Carlos Dagostini",
    email: "vivahidroco@gmail.com",
    perfil: "Diretor",
    regiao: "Rio Branco",
  },
];

async function garantirRegioes(): Promise<Record<"Manaus" | "Rio Branco", number>> {
  const regioes: Partial<Record<"Manaus" | "Rio Branco", number>> = {};

  for (const nome of ["Manaus", "Rio Branco"] as const) {
    const existente = await prisma.regiao.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
    });

    if (existente) {
      regioes[nome] = existente.id;
      continue;
    }

    const criada = await prisma.regiao.create({ data: { nome } });
    regioes[nome] = criada.id;
  }

  return regioes as Record<"Manaus" | "Rio Branco", number>;
}

async function sincronizarRegioesAcesso(
  usuarioId: number,
  regiaoIds: number[],
): Promise<void> {
  await prisma.usuarioRegiao.deleteMany({ where: { usuarioId } });

  if (regiaoIds.length === 0) {
    return;
  }

  await prisma.usuarioRegiao.createMany({
    data: regiaoIds.map((regiaoId) => ({ usuarioId, regiaoId })),
    skipDuplicates: true,
  });
}

async function upsertUsuarioProducao(
  dados: UsuarioSeed,
  regioes: Record<"Manaus" | "Rio Branco", number>,
): Promise<void> {
  const email = normalizarEmailSeed(dados.email);
  const funcao = perfilSeedParaFuncao(dados.perfil);
  const regiaoId = regioes[dados.regiao];
  const contaTeste = email === "promotor@teste.com" || email === "promotorac@teste.com";
  const acessoGlobal =
    funcao === "Diretor" && diretorComAcessoGlobal(email);
  const regioesAcessoIds = acessoGlobal
    ? [regioes.Manaus, regioes["Rio Branco"]]
    : [regiaoId];

  const dadosComuns = {
    nome: dados.nome.trim(),
    usuario: email,
    funcao,
    genero: "M",
    regiaoId,
    clt: funcao === "Promotor",
    statusConta: "Ativo",
    ativo: true,
  };

  const existente = await prisma.usuario.findFirst({
    where: {
      usuario: { equals: email, mode: "insensitive" },
    },
  });

  const usuario = existente
    ? await prisma.usuario.update({
        where: { id: existente.id },
        data: dadosComuns,
      })
    : await prisma.usuario.create({
        data: {
          ...dadosComuns,
          senha: contaTeste ? SENHA_CONTA_TESTE : SENHA_PADRAO,
          alterarSenhaObrigatorio: true,
        },
      });

  await sincronizarRegioesAcesso(usuario.id, regioesAcessoIds);

  const regioesLabel = acessoGlobal
    ? "Manaus + Rio Branco (global)"
    : dados.regiao;

  console.log(`✓ ${dados.nome} <${email}> — ${funcao} — ${regioesLabel}`);
}

async function vincularPromotorTesteLojas(
  regioes: Record<"Manaus" | "Rio Branco", number>,
): Promise<void> {
  const vinculos: Array<{ email: string; codigosLoja: string[]; regiao: "Manaus" | "Rio Branco" }> =
    [
      {
        email: "promotor@teste.com",
        codigosLoja: ["002", "177", "432"],
        regiao: "Manaus",
      },
      {
        email: "promotorac@teste.com",
        codigosLoja: ["001"],
        regiao: "Rio Branco",
      },
    ];

  for (const item of vinculos) {
    const promotor = await prisma.usuario.findFirst({
      where: {
        usuario: { equals: item.email, mode: "insensitive" },
        ativo: true,
      },
    });

    if (!promotor) {
      continue;
    }

    for (const codigo of item.codigosLoja) {
      const loja = await prisma.loja.findFirst({
        where: { codigo, regiaoId: regioes[item.regiao], ativo: true },
      });

      if (!loja) {
        continue;
      }

      const existente = await prisma.usuarioLoja.findFirst({
        where: { usuarioId: promotor.id, lojaId: loja.id },
      });

      if (!existente) {
        await prisma.usuarioLoja.create({
          data: { usuarioId: promotor.id, lojaId: loja.id },
        });
      }
    }
  }
}

async function main() {
  console.log("Seed de usuários de produção");
  console.log(`Senha padrão: ${SENHA_PADRAO}`);
  console.log("Primeiro acesso: alteração de senha obrigatória\n");

  const regioes = await garantirRegioes();

  for (const usuario of USUARIOS_PRODUCAO) {
    await upsertUsuarioProducao(usuario, regioes);
  }

  await vincularPromotorTesteLojas(regioes);

  console.log(`\nConcluído: ${USUARIOS_PRODUCAO.length} usuário(s) processado(s).`);
}

main()
  .catch((error) => {
    console.error("Erro no seed de usuários:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
