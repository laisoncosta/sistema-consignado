import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

import { DashboardHeaderProvider } from "@/components/dashboard/DashboardHeaderContext";

import { DashboardTopHeader } from "@/components/dashboard/DashboardTopHeader";

import type { BrandTheme } from "@/lib/brands";

import { isGestaoRole, ROLES, type UserRole } from "@/lib/rbac";

import type { SessionUser } from "@/lib/session";

import { getDisplayNameForEmail } from "@/lib/test-users";



type DashboardShellProps = {

  session: SessionUser;

  role: UserRole;

  brand: BrandTheme;

  tituloArea: string;

  tituloRegiaoInicial?: string;

  exibirLogosDuplos?: boolean;

  desktopOnly?: boolean;

  otimizadoMobile?: boolean;

  variant?: "default" | "executive";

  children: React.ReactNode;

};



export function DashboardShell({

  session,

  role,

  brand,

  tituloArea,

  tituloRegiaoInicial,

  exibirLogosDuplos = false,

  desktopOnly = false,

  otimizadoMobile = false,

  variant = "default",

  children,

}: DashboardShellProps) {

  const nomeExibicao = getDisplayNameForEmail(session.email, session.name);

  const exibirSidebar = isGestaoRole(role);

  const acessoDiretor = role === ROLES.DIRETOR;

  const executive = variant === "executive";

  const regiaoHeader =
    tituloRegiaoInicial ??
    (acessoDiretor ? "Acre - Manaus" : session.regiaoNome);

  const logosDuplos = exibirLogosDuplos || acessoDiretor;



  return (

    <DashboardHeaderProvider

      tituloRegiaoInicial={regiaoHeader}

      brandInicial={brand}

    >

      <div

        className={`flex min-h-screen bg-[var(--background)] font-[family-name:var(--font-poppins)] ${
          desktopOnly ? "min-w-[1100px]" : ""
        }`}

      >

        {exibirSidebar ? (
          <DashboardSidebar
            brand={brand}
            userName={nomeExibicao}
            userRole={role}
          />
        ) : null}



        <div className="relative isolate flex min-w-0 flex-1 flex-col">

          <DashboardTopHeader

            tituloArea={tituloArea}

            tituloRegiaoInicial={regiaoHeader}

            brandInicial={brand}

            nomeUsuario={nomeExibicao}

            exibirLogosDuplos={logosDuplos}

            otimizadoMobile={otimizadoMobile}

            desktopOnly={desktopOnly}

            executive={executive}

            exibirAcoesHeader={!exibirSidebar}

          />



          {desktopOnly ? (

            <>

              <div className="block px-6 py-10 text-center text-sm text-slate-600 dark:text-slate-400 md:hidden">

                Esta área foi otimizada exclusivamente para desktop. Acesse por um

                computador para utilizar o painel completo.

              </div>

              <div className="relative z-0 hidden md:block">{children}</div>

            </>

          ) : (

            <div className="relative z-0 flex-1">{children}</div>

          )}

        </div>

      </div>

    </DashboardHeaderProvider>

  );

}

