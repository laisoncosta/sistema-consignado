import { GestaoLojasCatalogo } from "@/components/admin/GestaoLojasCatalogo";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";
import {
  tituloRegiaoHeader,
  tituloRegiaoHeaderPorSessao,
} from "@/lib/identidade-gestao-lojas";
import { ROLES } from "@/lib/rbac";

export default async function CadastroLojasPage() {
  const { session, role } = await requireRouteAccess("/dashboard/admin/lojas");

  const acessoGlobal =
    role === ROLES.DIRETOR || (session.regioesAcessoIds?.length ?? 0) > 1;
  const brand = getBrandByRegiao(session.regiaoNome);
  const tituloRegiaoInicial = acessoGlobal
    ? tituloRegiaoHeader("todos")
    : tituloRegiaoHeaderPorSessao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Gestão de Lojas"
      tituloRegiaoInicial={tituloRegiaoInicial}
      exibirLogosDuplos={acessoGlobal}
      desktopOnly
    >
      <GestaoLojasCatalogo acessoGlobal={acessoGlobal} />
    </DashboardShell>
  );
}
