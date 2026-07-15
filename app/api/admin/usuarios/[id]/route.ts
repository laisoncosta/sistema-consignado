import { NextResponse } from "next/server";

import type { Prisma } from "@/app/generated/prisma/client";

import {
  booleanParaClt,
  booleanParaStatusCercaPromotor,
  cltParaBoolean,
  emailLoginValido,
  funcaoParaPerfil,
  normalizarEmailLogin,
  normalizarStatusConta,
  perfilExibicaoUsuario,
  perfilParaFuncao,
  REGIAO_TODAS_ID,
  rotuloFilialUsuario,
  statusCercaPromotorParaBoolean,
  statusParaAtivo,
  usuarioTemAcessoGlobal,
  type PerfilUsuarioUi,
  type StatusContaUsuario,
  type UsuarioGestaoItem,
} from "@/lib/admin-usuarios";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializarUsuario(usuario: {
  id: number;
  nome: string;
  usuario: string;
  funcao: string;
  telefone: string | null;
  codCiss: string | null;
  clt: boolean;
  cercaVirtualAtiva: boolean;
  deviceId: string | null;
  ignorarTravaAparelho: boolean;
  statusConta: string;
  ativo: boolean;
  regiaoId: number;
  regiao: { nome: string };
  lojasVinculadas: Array<{ lojaId: number }>;
  regioesAcesso: Array<{ regiaoId: number }>;
}): UsuarioGestaoItem {
  const status = normalizarStatusConta(usuario.statusConta, usuario.ativo);
  const perfil = perfilExibicaoUsuario(usuario.funcao, status);
  const perfilOperacional = perfil === "Pendente" ? "Promotor" : perfil;
  const acessoTodasRegioes = usuarioTemAcessoGlobal(
    perfilOperacional,
    usuario.regioesAcesso.length,
  );

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.usuario,
    perfil,
    filial: usuario.regiao.nome,
    filialRotulo: rotuloFilialUsuario(usuario.regiao.nome, acessoTodasRegioes),
    regiaoId: acessoTodasRegioes ? REGIAO_TODAS_ID : usuario.regiaoId,
    acessoTodasRegioes,
    status,
    clt: booleanParaClt(usuario.clt),
    cercaVirtual: booleanParaStatusCercaPromotor(usuario.cercaVirtualAtiva),
    telefone: usuario.telefone ?? "",
    codCiss: usuario.codCiss ?? "",
    lojas: usuario.lojasVinculadas.map((vinculo) => String(vinculo.lojaId)),
    deviceIdCadastrado: Boolean(usuario.deviceId?.trim()),
    ignorarTravaAparelho: usuario.ignorarTravaAparelho,
  };
}

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

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        regiao: true,
        lojasVinculadas: true,
        regioesAcesso: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      usuario: serializarUsuario(usuario),
    });
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o usuário." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  }

  try {
    const existente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!existente) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const nome = String(body.nome ?? existente.nome).trim();
    const email = normalizarEmailLogin(String(body.email ?? existente.usuario));
    const telefone = String(body.telefone ?? existente.telefone ?? "").trim();
    const codCiss = String(body.codCiss ?? existente.codCiss ?? "").trim();
    const clt = cltParaBoolean((body.clt ?? booleanParaClt(existente.clt)) as "SIM" | "NÃO");
    const perfil = (body.perfil ?? funcaoParaPerfil(existente.funcao)) as PerfilUsuarioUi;
    const cercaVirtualAtiva =
      perfil === "Promotor"
        ? statusCercaPromotorParaBoolean(
            (body.cercaVirtual ??
              booleanParaStatusCercaPromotor(existente.cercaVirtualAtiva)) as
              | "ativar"
              | "inativar",
          )
        : false;
    const ignorarTravaAparelho =
      perfil === "Promotor" &&
      (body.ignorarTravaAparelho !== undefined
        ? Boolean(body.ignorarTravaAparelho)
        : existente.ignorarTravaAparelho);
    const status = (body.status ?? existente.statusConta) as StatusContaUsuario;
    const acessoTodasRegioes =
      perfil === "Diretor" &&
      (body.acessoTodasRegioes === true ||
        Number(body.regiaoId) === REGIAO_TODAS_ID);

    let regiaoId = Number(body.regiaoId ?? existente.regiaoId);
    const lojas: number[] = Array.isArray(body.lojas)
      ? body.lojas
          .map((lojaId: unknown) => Number(lojaId))
          .filter((lojaId: number) => Number.isInteger(lojaId) && lojaId > 0)
      : [];

    const todasRegioes = await prisma.regiao.findMany({
      where: {
        OR: [
          { nome: { equals: "Manaus", mode: "insensitive" } },
          { nome: { equals: "Rio Branco", mode: "insensitive" } },
        ],
      },
      orderBy: { nome: "asc" },
    });

    if (acessoTodasRegioes) {
      regiaoId = todasRegioes[0]?.id ?? existente.regiaoId;
    }

    if (!nome || !Number.isInteger(regiaoId) || regiaoId <= 0) {
      return NextResponse.json(
        { error: "Nome e região são obrigatórios." },
        { status: 400 },
      );
    }

    if (!emailLoginValido(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail de login válido." },
        { status: 400 },
      );
    }

    const emailEmUso = await prisma.usuario.findFirst({
      where: {
        usuario: { equals: email, mode: "insensitive" },
        NOT: { id: usuarioId },
      },
    });

    if (emailEmUso) {
      return NextResponse.json(
        { error: "Este e-mail de login já está em uso por outro usuário." },
        { status: 400 },
      );
    }

    const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId } });

    if (!regiao) {
      return NextResponse.json({ error: "Região inválida." }, { status: 400 });
    }

    if (perfil === "Promotor" && lojas.length > 0) {
      const lojasValidas = await prisma.loja.count({
        where: {
          id: { in: lojas },
          regiaoId,
          ativo: true,
        },
      });

      if (lojasValidas !== lojas.length) {
        return NextResponse.json(
          { error: "Uma ou mais lojas são inválidas para a região selecionada." },
          { status: 400 },
        );
      }
    }

    const regioesAcessoIds = acessoTodasRegioes
      ? todasRegioes.map((item) => item.id)
      : [regiaoId];

    const usuario = await prisma.$transaction(async (tx) => {
      await tx.usuarioLoja.deleteMany({ where: { usuarioId } });

      if (perfil === "Promotor" && lojas.length > 0) {
        await tx.usuarioLoja.createMany({
          data: lojas.map((lojaId) => ({ usuarioId, lojaId })),
          skipDuplicates: true,
        });
      }

      await sincronizarRegioesUsuario(tx, usuarioId, regioesAcessoIds);

      return tx.usuario.update({
        where: { id: usuarioId },
        data: {
          nome,
          usuario: email,
          telefone: telefone || null,
          codCiss: codCiss || null,
          clt,
          cercaVirtualAtiva,
          deviceId: perfil === "Promotor" ? existente.deviceId : null,
          ignorarTravaAparelho,
          statusConta: status,
          ativo: statusParaAtivo(status),
          funcao: perfilParaFuncao(perfil),
          regiao: { connect: { id: regiaoId } },
        },
        include: {
          regiao: true,
          lojasVinculadas: true,
          regioesAcesso: true,
        },
      });
    });

    return NextResponse.json({
      usuario: serializarUsuario(usuario),
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o usuário." },
      { status: 500 },
    );
  }
}
