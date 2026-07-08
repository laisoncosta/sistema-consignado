import { NextResponse } from "next/server";

import { rotuloRegiaoProduto } from "@/lib/admin-produtos";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { consultarCep } from "@/lib/consultar-cep";
import { obterValorColuna, lerPlanilhaXls } from "@/lib/excel-io";
import { resolverRegiaoId } from "@/lib/excel-import-mappers";
import { prisma } from "@/lib/prisma";

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

      const codigo = obterValorColuna(linha, [
        "codigo ciss",
        "código ciss",
        "codigo",
        "código",
      ]);
      const descricao = obterValorColuna(linha, ["descricao", "descrição", "nome da loja", "nome"]);
      const regiaoTexto = obterValorColuna(linha, ["regiao", "região"]);
      const cep = obterValorColuna(linha, ["cep"]);

      if (!codigo && !descricao && !regiaoTexto) {
        continue;
      }

      if (!codigo || !descricao || !regiaoTexto) {
        erros.push(`Linha ${numeroLinha}: código, descrição e região são obrigatórios.`);
        continue;
      }

      const regiaoResolvida = resolverRegiaoId(regiaoTexto, regioes);

      if (!regiaoResolvida || regiaoResolvida.acessoTodasRegioes) {
        erros.push(`Linha ${numeroLinha}: região inválida (${regiaoTexto}).`);
        continue;
      }

      let endereco = null;

      if (cep.replace(/\D/g, "").length === 8) {
        endereco = await consultarCep(cep);
      }

      const existente = await prisma.loja.findFirst({
        where: { codigo, regiaoId: regiaoResolvida.regiaoId },
      });

      const dadosEndereco = {
        cep: endereco?.cep ?? (cep || null),
        rua: endereco?.rua ?? existente?.rua ?? null,
        bairro: endereco?.bairro ?? existente?.bairro ?? null,
        cidade: endereco?.cidade ?? existente?.cidade ?? null,
        latitude: endereco?.latitude ?? existente?.latitude ?? null,
        longitude: endereco?.longitude ?? existente?.longitude ?? null,
      };

      if (existente) {
        await prisma.loja.update({
          where: { id: existente.id },
          data: {
            nome: descricao,
            ativo: true,
            ...dadosEndereco,
          },
        });
        atualizados += 1;
      } else {
        await prisma.loja.create({
          data: {
            codigo,
            nome: descricao,
            regiaoId: regiaoResolvida.regiaoId,
            ativo: true,
            ...dadosEndereco,
          },
        });
        criados += 1;
      }
    }

    return NextResponse.json({
      sucesso: true,
      criados,
      atualizados,
      erros,
      mensagem: `Importação concluída: ${criados} criada(s), ${atualizados} atualizada(s).`,
    });
  } catch (error) {
    console.error("Erro ao importar lojas:", error);
    return NextResponse.json(
      { error: "Não foi possível importar a planilha de lojas." },
      { status: 500 },
    );
  }
}
