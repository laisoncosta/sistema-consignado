import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function FechamentoResultadosPage() {
  const { session, role } = await requireRouteAccess("/dashboard/fechamento");
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Fechamento de Resultados"
      desktopOnly
    >
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-4xl" aria-hidden="true">
            📈
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-800">
            Em breve: Fechamento Semanal (Manaus) e Quinzenal (Rio Branco)
          </h2>
        </div>
      </main>
    </DashboardShell>
  );
}
