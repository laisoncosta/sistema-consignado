import { GestaoUsuariosCatalogo } from "@/components/admin/GestaoUsuariosCatalogo";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function GestaoUsuariosPage() {
  const { session, role } = await requireRouteAccess("/dashboard/admin/usuarios");
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Gestão de Usuários e Perfis"
      desktopOnly
    >
      <GestaoUsuariosCatalogo brand={brand} />
    </DashboardShell>
  );
}
