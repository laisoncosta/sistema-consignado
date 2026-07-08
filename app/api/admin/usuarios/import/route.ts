import { NextResponse } from "next/server";

import type { Prisma } from "@/app/generated/prisma/client";
import {
  cltParaBoolean,
  perfilParaFuncao,
} from "@/lib/admin-usuarios";
import { rotuloRegiaoProduto } from "@/lib/admin-produtos";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import {
  funcaoDoPerfil,
  resolverClt,
  resolverPerfil,
  resolverRegiaoId,
} from "@/lib/excel-import-mappers";
import { obterValorColuna, lerPlanilhaXls } from "@/lib/excel-io";
import { prisma } from "@/lib/prisma";
import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";

async function sincronizarRegioesUsuario(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  regiaoIds: number[],
) {
  await tx.usuarioRegiao.deleteMany({ where: { usuarioId } });

  if (regiaoIds.length === 0) {
    return;
  }

  await tx.usuarioRegiao.createMany({
    data: regiaoIds.map((regiaoId) => ({ usuarioId, regiaoId })),
    skipDuplicates: true,
  });
}

export async function POST(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { error: "Envie um arquivo Excel (.xls)." },
        { status: 400 },
      );
    }

    const buffer = await arquivo.arrayBuffer();
    const linhas = lerPlanilhaXls(buffer);

    if (linhas.length === 0) {
      return NextResponse.json(
        { error: "A planilha está vazia." },
        { status: 400 },
      );
    }

    const regioesDb = await prisma.regiao.findMany({ orderBy: { nome: "asc" } });
    const regioes = regioesDb.map((regiao) => ({
      id: regiao.id,
      nome: regiao.nome,
      rotulo: rotuloRegiaoProduto(regiao.nome),
    }));

    let criados = 0;
    let atualizados = 0;
    const erros: string[] = [];

    for (let indice = 0; indice < linhas.length; indice++) {
      const linha = linhas[indice];
      const numeroLinha = indice + 2;

      const nome = obterValorColuna(linha, ["nome", "nome completo"]);
      const email = obterValorColuna(linha, ["email", "e-mail"]).toLowerCase();
      const perfilTexto = obterValorColuna(linha, ["perfil", "perfil de acesso"]);
      const regiaoTexto = obterValorColuna(linha, ["regiao", "região", "filial"]);
      const cltTexto = obterValorColuna(linha, ["vinculo clt", "vínculo clt", "clt"]);

      if (!nome && !email && !perfilTexto) {
        continue;
      }

      if (!nome || !email || !perfilTexto || !regiaoTexto) {
        erros.push(
          `Linha ${numeroLinha}: nome, e-mail, perfil e região são obrigatórios.`,
        );
        continue;
      }

      const perfil = resolverPerfil(perfilTexto);

      if (!perfil) {
        erros.push(`Linha ${numeroLinha}: perfil inválido (${perfilTexto}).`);
        continue;
      }

      const clt = resolverClt(cltTexto);

      if (!clt) {
        erros.push(`Linha ${numeroLinha}: vínculo CLT inválido (${cltTexto}).`);
        continue;
      }

      const regiaoResolvida = resolverRegiaoId(regiaoTexto, regioes);

      if (!regiaoResolvida) {
        erros.push(`Linha ${numeroLinha}: região inválida (${regiaoTexto}).`);
        continue;
      }

      const acessoTodasRegioes =
        perfil === "Diretor" && regiaoResolvida.acessoTodasRegioes;
      const regiaoId = acessoTodasRegioes
        ? (regioes[0]?.id ?? regiaoResolvida.regiaoId)
        : regiaoResolvida.regiaoId;
      const regioesAcessoIds = acessoTodasRegioes
        ? regioes.map((regiao) => regiao.id)
        : [regiaoId];

      const existente = await prisma.usuario.findFirst({
        where: { usuario: { equals: email, mode: "insensitive" } },
      });

      if (existente) {
        await prisma.$transaction(async (tx) => {
          await sincronizarRegioesUsuario(tx, existente.id, regioesAcessoIds);

          await tx.usuario.update({
            where: { id: existente.id },
            data: {
              nome,
              usuario: email,
              funcao: funcaoDoPerfil(perfil),
              regiaoId,
              clt: cltParaBoolean(clt),
            },
          });
        });
        atualizados += 1;
      } else {
        const novo = await prisma.$transaction(async (tx) => {
          const criado = await tx.usuario.create({
            data: {
              nome,
              usuario: email,
              senha: SENHA_INICIAL_PADRAO,
              funcao: perfilParaFuncao(perfil),
              regiaoId,
              clt: cltParaBoolean(clt),
              statusConta: "Pendente",
              ativo: false,
              alterarSenhaObrigatorio: true,
            },
          });

          await sincronizarRegioesUsuario(tx, criado.id, regioesAcessoIds);
          return criado;
        });
        void novo;
        criados += 1;
      }
    }

    return NextResponse.json({
      sucesso: true,
      criados,
      atualizados,
      erros,
      mensagem: `Importação concluída: ${criados} criado(s), ${atualizados} atualizado(s). Novos usuários recebem senha padrão ${SENHA_INICIAL_PADRAO}.`,
    });
  } catch (error) {
    console.error("Erro ao importar usuários:", error);
    return NextResponse.json(
      { error: "Não foi possível importar a planilha de usuários." },
      { status: 500 },
    );
  }
}
