import { ExpedicaoPainel } from "@/components/expedicao/ExpedicaoPainel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";
import { getDisplayNameForEmail } from "@/lib/test-users";

export default async function GestaoExpedicaoPage() {
  const { session, role } = await requireRouteAccess("/dashboard/gestao/expedicao");
  const brand = getBrandByRegiao(session.regiaoNome);
  const usuarioNome = getDisplayNameForEmail(session.email, session.name);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Expedição"
      desktopOnly
    >
      <ExpedicaoPainel
        brand={brand}
        role={role}
        usuarioNome={usuarioNome}
      />
    </DashboardShell>
  );
}
