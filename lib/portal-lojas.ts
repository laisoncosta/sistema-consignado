import {
  filtroRegiaoLojaParaWhere,
  resolverEscopoRegiao,
  roleFromSession,
} from "@/lib/regiao-scope";
import { prisma } from "@/lib/prisma";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import type { SessionUser } from "@/lib/session";

export type LojaPortalResumo = {
  id: string;
  codigo: string;
  rotulo: string;
  nome: string;
  regiaoId: number;
  regiaoNome: string;
};

export async function listarLojasPortalUsuario(
  session: SessionUser,
): Promise<LojaPortalResumo[]> {
  const role = roleFromSession(session);

  if (!role) {
    return [];
  }

  const escopo = resolverEscopoRegiao(session, role);
  const usuarioId = await resolveSessionUserId(session);

  if (usuarioId <= 0) {
    return [];
  }

  const vinculos = await prisma.usuarioLoja.findMany({
    where: {
      usuarioId,
      loja: {
        ativo: true,
        ...filtroRegiaoLojaParaWhere(escopo),
      },
    },
    include: {
      loja: { include: { regiao: true } },
    },
    orderBy: { loja: { nome: "asc" } },
  });

  return vinculos.map((vinculo) => ({
    id: String(vinculo.loja.id),
    codigo: vinculo.loja.codigo,
    rotulo: `${vinculo.loja.codigo} - ${vinculo.loja.nome}`,
    nome: vinculo.loja.nome,
    regiaoId: vinculo.loja.regiaoId,
    regiaoNome: vinculo.loja.regiao.nome,
  }));
}
