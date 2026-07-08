import { GestaoProdutosCatalogo } from "@/components/admin/GestaoProdutosCatalogo";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";

export default async function GestaoProdutosPage() {
  const { session, role } = await requireRouteAccess("/dashboard/admin/produtos");
  const brand = getBrandByRegiao(session.regiaoNome);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Gestão de Produtos"
      desktopOnly
    >
      <GestaoProdutosCatalogo brand={brand} />
    </DashboardShell>
  );
}
