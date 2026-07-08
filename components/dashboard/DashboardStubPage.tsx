import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

type DashboardStubConfig = {
  tituloArea: string;
  pathname: string;
};

export function createDashboardStubPage({
  tituloArea,
  pathname,
}: DashboardStubConfig) {
  return async function DashboardStubPage() {
    const { session, role } = await requireRouteAccess(pathname);
    const brand = getBrandByRegiao(session.regiaoNome);

    return (
      <DashboardShell
        session={session}
        role={role}
        brand={brand}
        tituloArea={tituloArea}
        desktopOnly
      >
        <main className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Área em desenvolvimento.
          </div>
        </main>
      </DashboardShell>
    );
  };
}
