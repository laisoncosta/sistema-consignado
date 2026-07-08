import { GestaoOrigensCatalogo } from "@/components/admin/GestaoOrigensCatalogo";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function GestaoOrigensPage() {
  const { session, role } = await requireRouteAccess("/dashboard/admin/origens");
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Cadastro de Origens"
      desktopOnly
    >
      <GestaoOrigensCatalogo brand={brand} />
    </DashboardShell>
  );
}
