import {
  booleanParaStatusCercaPromotor,
  statusCercaPromotorParaBoolean,
} from "@/lib/cerca-virtual";

export { booleanParaStatusCercaPromotor, statusCercaPromotorParaBoolean };

export type StatusContaUsuario = "Ativo" | "Pendente" | "Inativo";

export type PerfilUsuarioUi =
  | "Promotor"
  | "Expedição"
  | "Supervisor"
  | "ADM"
  | "Diretor";

export type FiltroRegiaoUsuario = "Todos" | "Manaus" | "Rio Branco";

export type FiltroPerfilUsuario = "Todos" | PerfilUsuarioUi;

export type FiltroStatusUsuario = "Todos" | StatusContaUsuario;

export type FiltroCardUsuarios =
  | "total-ativos"
  | "manaus"
  | "rio-branco"
  | "pendentes";

export function paramsApiFiltroCardUsuarios(filtro: FiltroCardUsuarios): {
  regiao: FiltroRegiaoUsuario;
  status: FiltroStatusUsuario;
} {
  switch (filtro) {
    case "manaus":
      return { regiao: "Manaus", status: "Ativo" };
    case "rio-branco":
      return { regiao: "Rio Branco", status: "Ativo" };
    case "pendentes":
      return { regiao: "Todos", status: "Pendente" };
    default:
      return { regiao: "Todos", status: "Ativo" };
  }
}

export type UsuarioContadores = {
  total: number;
  manaus: number;
  rioBranco: number;
};

export const PERFIS_USUARIO_UI: PerfilUsuarioUi[] = [
  "Promotor",
  "Expedição",
  "Supervisor",
  "ADM",
  "Diretor",
];

export const REGIAO_TODAS_ID = 0;

export type PerfilExibicaoUsuario = PerfilUsuarioUi | "Pendente";

export const FUNCAO_USUARIO_PENDENTE = "Pendente";

export type UsuarioGestaoItem = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilExibicaoUsuario;
  filial: string;
  filialRotulo: string;
  regiaoId: number;
  acessoTodasRegioes: boolean;
  status: StatusContaUsuario;
  clt: "SIM" | "NÃO";
  cercaVirtual: "ativar" | "inativar";
  telefone: string;
  codCiss: string;
  lojas: string[];
  deviceIdCadastrado: boolean;
  ignorarTravaAparelho: boolean;
};

export type LojaGestaoItem = {
  id: string;
  codigo: string;
  nome: string;
};

export type UsuarioFormData = {
  nome: string;
  email: string;
  telefone: string;
  codCiss: string;
  clt: "SIM" | "NÃO";
  cercaVirtual: "ativar" | "inativar";
  status: StatusContaUsuario;
  perfil: PerfilUsuarioUi;
  filial: string;
  regiaoId: number;
  acessoTodasRegioes: boolean;
  lojas: string[];
  ignorarTravaAparelho: boolean;
};

export function normalizarEmailLogin(email: string): string {
  return email.trim().toLowerCase();
}

export function emailLoginValido(email: string): boolean {
  const normalizado = normalizarEmailLogin(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado);
}

const PERFIL_PARA_FUNCAO: Record<PerfilUsuarioUi, string> = {
  Promotor: "Promotor",
  Expedição: "Expedição",
  Supervisor: "Supervisor",
  ADM: "Administrador",
  Diretor: "Diretor",
};

const FUNCAO_PARA_PERFIL: Record<string, PerfilUsuarioUi> = {
  promotor: "Promotor",
  expedição: "Expedição",
  expedicao: "Expedição",
  supervisor: "Supervisor",
  administrador: "ADM",
  admin: "ADM",
  adm: "ADM",
  diretor: "Diretor",
};

export function perfilParaFuncao(perfil: PerfilUsuarioUi): string {
  return PERFIL_PARA_FUNCAO[perfil];
}

export function filtroPerfilParaFuncao(
  perfil: FiltroPerfilUsuario,
): string | null {
  if (perfil === "Todos") {
    return null;
  }

  return perfilParaFuncao(perfil);
}

export function funcaoParaPerfil(funcao: string): PerfilUsuarioUi {
  const normalizado = funcao.trim().toLowerCase();

  if (normalizado === "pendente") {
    return "Promotor";
  }

  return FUNCAO_PARA_PERFIL[normalizado] ?? "Promotor";
}

export function perfilExibicaoUsuario(
  funcao: string,
  status: StatusContaUsuario,
): PerfilExibicaoUsuario {
  if (status === "Pendente") {
    return "Pendente";
  }

  return funcaoParaPerfil(funcao);
}

export function cltParaBoolean(clt: "SIM" | "NÃO"): boolean {
  return clt === "SIM";
}

export function booleanParaClt(clt: boolean): "SIM" | "NÃO" {
  return clt ? "SIM" : "NÃO";
}

export function statusParaAtivo(status: StatusContaUsuario): boolean {
  return status === "Ativo";
}

export function normalizarStatusConta(
  statusConta: string | null | undefined,
  ativo: boolean,
): StatusContaUsuario {
  if (statusConta === "Pendente" || statusConta === "Inativo" || statusConta === "Ativo") {
    return statusConta;
  }

  return ativo ? "Ativo" : "Inativo";
}

export function filtroRegiaoParaNome(regiao: FiltroRegiaoUsuario): string | null {
  if (regiao === "Manaus") {
    return "Manaus";
  }

  if (regiao === "Rio Branco") {
    return "Rio Branco";
  }

  return null;
}

export function calcularContadoresUsuariosAtivos(
  usuarios: Array<{
    statusConta: string;
    ativo: boolean;
    regiao: { nome: string };
  }>,
): UsuarioContadores {
  const ativos = usuarios.filter(
    (usuario) =>
      normalizarStatusConta(usuario.statusConta, usuario.ativo) === "Ativo",
  );

  return {
    total: ativos.length,
    manaus: ativos.filter((usuario) =>
      usuario.regiao.nome.toLowerCase().includes("manaus"),
    ).length,
    rioBranco: ativos.filter((usuario) =>
      usuario.regiao.nome.toLowerCase().includes("rio branco"),
    ).length,
  };
}

export function rotuloFilialUsuario(
  nomeRegiao: string,
  acessoTodasRegioes = false,
): string {
  if (acessoTodasRegioes) {
    return "Todas as regiões";
  }

  if (nomeRegiao.toLowerCase().includes("rio branco")) {
    return "Rio Branco - Buriti";
  }

  return "Manaus - Viva";
}

export function usuarioTemAcessoGlobal(
  perfil: PerfilUsuarioUi,
  regioesAcessoCount: number,
): boolean {
  return perfil === "Diretor" && regioesAcessoCount >= 2;
}
