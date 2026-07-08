import { NextResponse } from "next/server";

import { requireExpedicaoApiAccess } from "@/lib/auth-guard";
import {
  filtroRegiaoLojaParaWhere,
  resolverEscopoRegiao,
} from "@/lib/regiao-scope";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireExpedicaoApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const lojaId = Number(body.lojaId);
    const produtoId = Number(body.produtoId);
    const origemId = Number(body.origemId);
    const quantidade =
      body.quantidade === "" || body.quantidade == null
        ? 0
        : Number(body.quantidade);
    const bonificacao =
      body.bonificacao === "" || body.bonificacao == null
        ? 0
        : Number(body.bonificacao);
    const motivo = String(body.motivo ?? "").trim();

    if (
      !Number.isInteger(lojaId) ||
      lojaId <= 0 ||
      !Number.isInteger(produtoId) ||
      produtoId <= 0 ||
      !Number.isInteger(origemId) ||
      origemId <= 0
    ) {
      return NextResponse.json(
        { error: "Loja, produto e origem são obrigatórios." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 0 ||
      !Number.isInteger(bonificacao) ||
      bonificacao < 0 ||
      (quantidade <= 0 && bonificacao <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Informe Qtde de Transferência ou Bonificação maior que zero.",
        },
        { status: 400 },
      );
    }

    if (motivo.length < 15 || motivo.length > 50) {
      return NextResponse.json(
        { error: "O motivo deve ter entre 15 e 50 caracteres." },
        { status: 400 },
      );
    }

    const escopo = resolverEscopoRegiao(auth.session, auth.role);
    const filtroLojaRegiao = filtroRegiaoLojaParaWhere(escopo);

    const loja = await prisma.loja.findFirst({
      where: { id: lojaId, ativo: true, ...filtroLojaRegiao },
    });
    const produto = await prisma.produto.findFirst({
      where: {
        id: produtoId,
        ativo: true,
        ...(escopo.regiaoId ? { regiaoId: escopo.regiaoId } : {}),
        ...(escopo.regiaoNome && !escopo.regiaoId
          ? {
              regiao: {
                nome: { equals: escopo.regiaoNome, mode: "insensitive" },
              },
            }
          : {}),
      },
    });
    const origem = await prisma.origem.findFirst({
      where: {
        id: origemId,
        ...(escopo.regiaoId ? { regiaoId: escopo.regiaoId } : {}),
        ...(escopo.regiaoNome && !escopo.regiaoId
          ? {
              regiao: {
                nome: { equals: escopo.regiaoNome, mode: "insensitive" },
              },
            }
          : {}),
      },
    });

    if (!loja || !produto || !origem) {
      return NextResponse.json(
        { error: "Loja, produto ou origem inválidos." },
        { status: 400 },
      );
    }

    const transferencia = await prisma.transferenciaAvulsa.create({
      data: {
        lojaId,
        produtoId,
        origemId,
        quantidade,
        bonificacao,
        motivo,
      },
      include: {
        produto: true,
        loja: true,
        origem: true,
      },
    });

    return NextResponse.json({
      transferencia: {
        id: transferencia.id,
        quantidade: transferencia.quantidade,
        bonificacao: transferencia.bonificacao,
        motivo: transferencia.motivo,
        loja: transferencia.loja.nome,
        produto: transferencia.produto.descricao,
        origem: transferencia.origem.nome,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar transferência avulsa:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar a transferência." },
      { status: 500 },
    );
  }
}
