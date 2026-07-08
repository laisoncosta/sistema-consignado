import { DashboardExecutivoPainel } from "@/components/dashboard/executivo/DashboardExecutivoPainel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function DashboardInicioPage() {
  const { session, role } = await requireRouteAccess("/dashboard/inicio");
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Dashboard Executivo"
      desktopOnly
      variant="executive"
    >
      <DashboardExecutivoPainel />
    </DashboardShell>
  );
}
