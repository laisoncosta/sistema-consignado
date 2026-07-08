import { RelatorioVisitasPainel } from "@/components/admin/RelatorioVisitasPainel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function RelatorioVisitasPage() {
  const { session, role } = await requireRouteAccess(
    "/dashboard/gestao/relatorio-visitas",
  );
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Relatório de Visita"
      desktopOnly
    >
      <RelatorioVisitasPainel
        brand={brand}
        role={role}
        regiaoUsuario={session.regiaoNome}
      />
    </DashboardShell>
  );
}
