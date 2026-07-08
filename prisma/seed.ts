import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SENHA_TESTE = "teste123";

const REGIOES = ["Manaus", "Rio Branco"] as const;

const ORIGENS_POR_REGIAO: Record<(typeof REGIOES)[number], string[]> = {
  Manaus: ["VIVA", "FAZENDINHA"],
  "Rio Branco": ["BURITI", "JAGUAR", "DAUNEI"],
};

const USUARIOS = [
  {
    usuario: "promotor@teste.com",
    nome: "Promotor Teste",
    funcao: "Promotor",
    genero: "M",
    telefone: "92999990001",
    codCiss: "1001",
    clt: true,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "supervisor@teste.com",
    nome: "Supervisor Teste",
    funcao: "Supervisor",
    genero: "M",
    telefone: "92999990002",
    codCiss: "",
    clt: false,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "adm@teste.com",
    nome: "Administrador Teste",
    funcao: "Administrador",
    genero: "M",
    telefone: "92999990003",
    codCiss: "",
    clt: false,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "diretor@teste.com",
    nome: "Diretor Teste",
    funcao: "Diretor",
    genero: "M",
    telefone: "92999990004",
    codCiss: "",
    clt: false,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "expedicao@teste.com",
    nome: "Expedição Teste",
    funcao: "Expedição",
    genero: "M",
    telefone: "92999990005",
    codCiss: "",
    clt: true,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "expedicao-manaus@teste.com",
    nome: "Expedição Manaus",
    funcao: "Expedição",
    genero: "M",
    telefone: "92999990006",
    codCiss: "",
    clt: true,
    statusConta: "Ativo",
    regiao: "Manaus" as const,
  },
  {
    usuario: "expedicao-riobranco@teste.com",
    nome: "Expedição Rio Branco",
    funcao: "Expedição",
    genero: "M",
    telefone: "92999990007",
    codCiss: "",
    clt: true,
    statusConta: "Ativo",
    regiao: "Rio Branco" as const,
  },
] as const;

const PRODUTOS_MANAUS: Array<{ codigo: string; descricao: string }> = [
  { codigo: "13", descricao: "ALFACE VIVA BABY" },
  { codigo: "9", descricao: "ALFACE SUPER" },
  { codigo: "7", descricao: "AMERICANA" },
  { codigo: "11", descricao: "VERMELHA" },
  { codigo: "253", descricao: "MIMOSA" },
  { codigo: "29", descricao: "MANJERICÃO" },
  { codigo: "23", descricao: "HORTELÃ" },
  { codigo: "3", descricao: "AGRIÃO" },
  { codigo: "19", descricao: "COENTRO" },
  { codigo: "33", descricao: "SALSA" },
  { codigo: "25", descricao: "JAMBU VIVA 100G" },
  { codigo: "31", descricao: "RUCULA" },
  { codigo: "39", descricao: "CEBOLINHA" },
];

const PRODUTOS_RIO_BRANCO: Array<{ codigo: string; descricao: string }> = [
  { codigo: "7", descricao: "AGRIÃO BURITI" },
  { codigo: "9", descricao: "ALFACE AMERICANA BURITI" },
  { codigo: "912", descricao: "ALFACE AMERICANA VIVA" },
  { codigo: "3", descricao: "ALFACE CRESPA SUPER BURITI" },
  { codigo: "25", descricao: "ALFACE MIMOSA BURITI" },
  { codigo: "384", descricao: "ALFACE MIX GOURMET BURITI" },
  { codigo: "27", descricao: "ALFACE VERMELHA BURITI" },
  { codigo: "385", descricao: "ALFACE VIVA BABY BURITI" },
  { codigo: "923", descricao: "ALFACE VIVA SMALL" },
  { codigo: "13", descricao: "ALMEIRÃO BURITI" },
  { codigo: "423", descricao: "CHEIRO VERDE BURITI" },
  { codigo: "15", descricao: "COENTRO BURITI" },
  { codigo: "982", descricao: "COUVE MANTEIGA BURITI" },
  { codigo: "29", descricao: "HORTELÃ BURITI" },
  { codigo: "392", descricao: "JAMBU IN NATURA BURITI 200G" },
  { codigo: "902", descricao: "JAMBU IN NATURA VIVA 100G" },
  { codigo: "344", descricao: "JAMBU PRÉ COZIDO 1kg BURITI" },
  { codigo: "261", descricao: "MANJERICÃO BURITI" },
  { codigo: "11", descricao: "RÚCULA BURITI" },
  { codigo: "21", descricao: "SALSA BURITI" },
  { codigo: "996", descricao: "JAMBU COM TUCUPI COZIDO 700G" },
  { codigo: "1002", descricao: "CEBOLINHA VIVA KG" },
  { codigo: "1016", descricao: "CEBOLINHA BURITI 80G" },
];

const LOJAS_MANAUS: Array<{ codigo: string; nome: string }> = [
  { codigo: "177", nome: "07 - NE- COMPENSA" },
  { codigo: "61", nome: "10 - NE - TORQUATO" },
  { codigo: "170", nome: "11 - NE - GRANDE CIRCULAR" },
  { codigo: "171", nome: "13 - NE - VIA NORTE" },
  { codigo: "174", nome: "18 - NE- VIVER MELHOR" },
  { codigo: "88", nome: "31 - NE - TORRES 1" },
  { codigo: "448", nome: "32 - NE - CENTRO" },
  { codigo: "53", nome: "33 - NE- BARREIRA" },
  { codigo: "152", nome: "34 - NE - AV.SILVES" },
  { codigo: "151", nome: "35 - NE- CIDADE DEUS" },
  { codigo: "172", nome: "36 - NE - PONTE" },
  { codigo: "432", nome: "44 - NE- PONTA NEGRA" },
  { codigo: "258", nome: "52 - NE — ALVORADA" },
  { codigo: "431", nome: "53 -NE- CIDADE NOVA" },
  { codigo: "369", nome: "54 - NE - MAX TEIXEIRA" },
  { codigo: "372", nome: "55 - NE - DOM PEDRO" },
  { codigo: "367", nome: "56 - NE- COROADO" },
  { codigo: "243", nome: "57 - NE TORRES 2" },
  { codigo: "379", nome: "58 - NE - NILTON LINS" },
];

const LOJAS_RIO_BRANCO: Array<{ codigo: string; nome: string }> = [
  { codigo: "892", nome: "ARAMIX 2 ATACADO VILA ACRE" },
  { codigo: "60", nome: "ARASUPER 2º DISTRITO" },
  { codigo: "325", nome: "ARASUPER AMAPA" },
  { codigo: "62", nome: "ARASUPER AVIARIO" },
  { codigo: "909", nome: "ARASUPER BETEL" },
  { codigo: "829", nome: "ARASUPER W DANTAS" },
  { codigo: "334", nome: "ARASUPER FLORESTA" },
  { codigo: "225", nome: "ARASUPER BOSQUE" },
  { codigo: "554", nome: "ARAMIX 1 ATACADO JARDIM DE ALAH" },
  { codigo: "597", nome: "ARASUPER PLACAS" },
  { codigo: "582", nome: "ARASUPER SOBRAL" },
  { codigo: "59", nome: "ARASUPER TANGARA" },
  { codigo: "252", nome: "ARASUPER VAREJÃO" },
  { codigo: "529", nome: "MERCALE A.R.V" },
  { codigo: "436", nome: "MERCALE AV CEARA" },
  { codigo: "876", nome: "MERCALE G.V" },
  { codigo: "852", nome: "ASSAI ATACADO" },
];

async function upsertRegiao(nome: string) {
  const existente = await prisma.regiao.findFirst({ where: { nome } });

  if (existente) {
    return existente;
  }

  return prisma.regiao.create({ data: { nome } });
}

async function upsertOrigem(nome: string, regiaoId: number) {
  const existente = await prisma.origem.findFirst({
    where: { nome, regiaoId },
  });

  if (existente) {
    return existente;
  }

  return prisma.origem.create({ data: { nome, regiaoId } });
}

async function upsertProduto(
  codigo: string,
  descricao: string,
  regiaoId: number,
  precoUnitario = 4.5,
) {
  const existente = await prisma.produto.findFirst({
    where: { codigo, regiaoId },
  });

  if (existente) {
    return prisma.produto.update({
      where: { id: existente.id },
      data: { descricao, ativo: true, precoUnitario },
    });
  }

  return prisma.produto.create({
    data: { codigo, descricao, regiaoId, ativo: true, precoUnitario },
  });
}

async function upsertLoja(codigo: string, nome: string, regiaoId: number) {
  const existente = await prisma.loja.findFirst({
    where: { codigo, regiaoId },
  });

  if (existente) {
    return prisma.loja.update({
      where: { id: existente.id },
      data: { nome, ativo: true },
    });
  }

  return prisma.loja.create({
    data: { codigo, nome, regiaoId, ativo: true },
  });
}

async function upsertUsuario(
  email: string,
  nome: string,
  funcao: string,
  genero: string,
  regiaoId: number,
  extras?: {
    telefone?: string;
    codCiss?: string;
    clt?: boolean;
    statusConta?: string;
  },
) {
  const existente = await prisma.usuario.findFirst({
    where: {
      OR: [
        { usuario: { equals: email, mode: "insensitive" } },
        { nome: { equals: email, mode: "insensitive" } },
      ],
    },
  });

  const dadosExtras = {
    telefone: extras?.telefone || null,
    codCiss: extras?.codCiss || null,
    clt: extras?.clt ?? funcao.toLowerCase() === "promotor",
    statusConta: extras?.statusConta ?? "Ativo",
    ativo: (extras?.statusConta ?? "Ativo") === "Ativo",
  };

  if (existente) {
    return prisma.usuario.update({
      where: { id: existente.id },
      data: {
        usuario: email,
        nome,
        funcao,
        genero,
        senha: SENHA_TESTE,
        regiaoId,
        ...dadosExtras,
      },
    });
  }

  return prisma.usuario.create({
    data: {
      usuario: email,
      nome,
      funcao,
      genero,
      senha: SENHA_TESTE,
      regiaoId,
      ...dadosExtras,
    },
  });
}

async function vincularPromotorLojas(
  emailPromotor: string,
  codigosLoja: string[],
  regiaoId: number,
) {
  const promotor = await prisma.usuario.findFirst({
    where: { usuario: emailPromotor },
  });

  if (!promotor) {
    return;
  }

  for (const codigo of codigosLoja) {
    const loja = await prisma.loja.findFirst({
      where: { codigo, regiaoId },
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

async function main() {
  console.log("Iniciando seed do banco de dados...");

  const regioes: Record<string, number> = {};

  for (const nome of REGIOES) {
    const regiao = await upsertRegiao(nome);
    regioes[nome] = regiao.id;
    console.log(`Região: ${nome}`);
  }

  for (const [regiaoNome, origens] of Object.entries(ORIGENS_POR_REGIAO)) {
    const regiaoId = regioes[regiaoNome];

    for (const origemNome of origens) {
      await upsertOrigem(origemNome, regiaoId);
      console.log(`Origem: ${origemNome} (${regiaoNome})`);
    }
  }

  const manausId = regioes.Manaus;
  const rioBrancoId = regioes["Rio Branco"];

  for (const usuario of USUARIOS) {
    const regiaoId =
      usuario.regiao === "Rio Branco" ? rioBrancoId : manausId;

    await upsertUsuario(
      usuario.usuario,
      usuario.nome,
      usuario.funcao,
      usuario.genero,
      regiaoId,
      {
        telefone: usuario.telefone,
        codCiss: usuario.codCiss,
        clt: usuario.clt,
        statusConta: usuario.statusConta,
      },
    );
    console.log(`Usuário: ${usuario.usuario} (${usuario.funcao} — ${usuario.regiao})`);
  }

  for (const produto of PRODUTOS_MANAUS) {
    await upsertProduto(produto.codigo, produto.descricao, manausId);
  }
  console.log(`Produtos Manaus: ${PRODUTOS_MANAUS.length}`);

  for (const produto of PRODUTOS_RIO_BRANCO) {
    await upsertProduto(produto.codigo, produto.descricao, rioBrancoId);
  }
  console.log(`Produtos Rio Branco: ${PRODUTOS_RIO_BRANCO.length}`);

  for (const loja of LOJAS_MANAUS) {
    await upsertLoja(loja.codigo, loja.nome, manausId);
  }
  console.log(`Lojas Manaus: ${LOJAS_MANAUS.length}`);

  for (const loja of LOJAS_RIO_BRANCO) {
    await upsertLoja(loja.codigo, loja.nome, rioBrancoId);
  }
  console.log(`Lojas Rio Branco: ${LOJAS_RIO_BRANCO.length}`);

  await vincularPromotorLojas(
    "promotor@teste.com",
    ["177", "432", "61", "170", "171"],
    manausId,
  );
  console.log("Vínculos promotor-loja criados para promotor@teste.com");

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
