import { NextResponse } from "next/server";

import {
  booleanParaClt,
  booleanParaStatusCercaPromotor,
  calcularContadoresUsuariosAtivos,
  filtroRegiaoParaNome,
  filtroPerfilParaFuncao,
  funcaoParaPerfil,
  normalizarStatusConta,
  perfilExibicaoUsuario,
  REGIAO_TODAS_ID,
  rotuloFilialUsuario,
  statusCercaPromotorParaBoolean,
  usuarioTemAcessoGlobal,
  type FiltroPerfilUsuario,
  type FiltroRegiaoUsuario,
  type FiltroStatusUsuario,
  type UsuarioGestaoItem,
} from "@/lib/admin-usuarios";
import { requireCadastroApiAccess } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const auth = await requireCadastroApiAccess();

  if (!auth) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";
  const regiaoFiltro = (searchParams.get("regiao") ?? "Todos") as FiltroRegiaoUsuario;
  const perfilFiltro = (searchParams.get("perfil") ?? "Todos") as FiltroPerfilUsuario;
  const statusFiltro = (searchParams.get("status") ?? "Todos") as FiltroStatusUsuario;
  const nomeRegiao = filtroRegiaoParaNome(regiaoFiltro);
  const funcaoFiltro = filtroPerfilParaFuncao(perfilFiltro);

  const filtroStatus =
    statusFiltro === "Ativo"
      ? {
          ativo: true,
          NOT: { statusConta: { in: ["Pendente", "Inativo"] } },
        }
      : statusFiltro === "Pendente"
        ? { statusConta: "Pendente" as const }
        : statusFiltro === "Inativo"
          ? {
              OR: [
                { statusConta: "Inativo" as const },
                { ativo: false, NOT: { statusConta: "Pendente" as const } },
              ],
            }
          : {};

  try {
    const [todosUsuarios, usuariosFiltrados] = await Promise.all([
      prisma.usuario.findMany({
        include: { regiao: true },
      }),
      prisma.usuario.findMany({
        where: {
          ...filtroStatus,
          ...(nomeRegiao
            ? { regiao: { nome: { equals: nomeRegiao, mode: "insensitive" } } }
            : {}),
          ...(funcaoFiltro
            ? { funcao: { equals: funcaoFiltro, mode: "insensitive" } }
            : {}),
          ...(busca
            ? {
                OR: [
                  { nome: { contains: busca, mode: "insensitive" } },
                  { usuario: { contains: busca, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          regiao: true,
          lojasVinculadas: true,
          regioesAcesso: true,
        },
        orderBy: [{ nome: "asc" }],
      }),
    ]);

    const pendentes = todosUsuarios.filter(
      (usuario) =>
        normalizarStatusConta(usuario.statusConta, usuario.ativo) === "Pendente",
    ).length;

    return NextResponse.json({
      usuarios: usuariosFiltrados.map(serializarUsuario),
      pendentes,
      contadores: calcularContadoresUsuariosAtivos(todosUsuarios),
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar usuários." },
      { status: 500 },
    );
  }
}
