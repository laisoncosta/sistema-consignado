import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PortalPedidosPainel } from "@/components/dashboard/PortalPedidosPainel";
import { requireRouteAccess } from "@/lib/auth-guard";
import { getBrandByRegiao } from "@/lib/brands";
import { listarLojasPortalUsuario } from "@/lib/portal-lojas";
import { isGestaoRole } from "@/lib/rbac";
import { resolveSessionUserId } from "@/lib/resolve-session-user-id";
import { getDisplayNameForEmail, getGeneroForEmail } from "@/lib/test-users";
import { normalizarGenero } from "@/lib/usuario";
const usuarioSimulado = {
  tipoContrato: "CLT" as "CLT" | "MEI",
};

type PortalPedidosPageProps = {
  searchParams: Promise<{
    abrirFormulario?: string;
    pedidoExtra?: string;
    aba?: string;
  }>;
};

export default async function PortalPedidosPage({
  searchParams,
}: PortalPedidosPageProps) {
  const params = await searchParams;
  const abrirFormularioInicial = params.abrirFormulario === "1";
  const pedidoExtraInicial = params.pedidoExtra === "1";
  const abaAtiva =
    params.aba === "historico" ? ("historico" as const) : ("novo-pedido" as const);

  const { session, role } = await requireRouteAccess("/dashboard/portal-pedidos");
  const modoGestaoAdministrativa = isGestaoRole(role);
  const brand = getBrandByRegiao(session.regiaoNome);
  const nomeExibicao = getDisplayNameForEmail(session.email, session.name);
  const genero = normalizarGenero(
    session.genero ?? getGeneroForEmail(session.email),
  );
  const lojasIniciais = modoGestaoAdministrativa
    ? []
    : await listarLojasPortalUsuario(session);
  const usuarioIdResolvido = await resolveSessionUserId(session);

  return (
    <DashboardShell
      session={session}
      role={role}
      brand={brand}
      tituloArea="Portal de Pedidos"
      otimizadoMobile
    >
      <Suspense
        fallback={
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Carregando portal...
          </div>
        }
      >
        <PortalPedidosPainel
          brand={brand}
          regiao={session.regiaoNome}
          tipoContrato={usuarioSimulado.tipoContrato}
          nomeUsuario={nomeExibicao}
          genero={genero}
          usuarioEmail={session.email}
          usuarioId={usuarioIdResolvido}
          regiaoId={session.regiaoId}
          modoGestaoAdministrativa={modoGestaoAdministrativa}
          lojasIniciais={lojasIniciais}
          abrirFormularioInicial={abrirFormularioInicial}
          pedidoExtraInicial={pedidoExtraInicial}
          abaAtiva={abaAtiva}
        />
      </Suspense>    </DashboardShell>
  );
}
