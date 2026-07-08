import { perfilParaFuncao, type PerfilUsuarioUi } from "@/lib/admin-usuarios";
import { rotuloRegiaoProduto } from "@/lib/admin-produtos";

type RegiaoRef = {
  id: number;
  nome: string;
  rotulo?: string;
};

export function resolverRegiaoId(
  texto: string,
  regioes: RegiaoRef[],
): { regiaoId: number; acessoTodasRegioes: boolean } | null {
  const normalizado = texto.trim().toLowerCase();

  if (!normalizado || normalizado === "todas" || normalizado.includes("todas as regio")) {
    return { regiaoId: regioes[0]?.id ?? 0, acessoTodasRegioes: true };
  }

  const regiao = regioes.find((item) => {
    const nome = item.nome.toLowerCase();
    const rotulo = (item.rotulo ?? rotuloRegiaoProduto(item.nome)).toLowerCase();
    return (
      normalizado === nome ||
      normalizado === rotulo ||
      normalizado.includes(nome) ||
      normalizado.includes(rotulo)
    );
  });

  if (!regiao) {
    return null;
  }

  return { regiaoId: regiao.id, acessoTodasRegioes: false };
}

export function resolverPerfil(texto: string): PerfilUsuarioUi | null {
  const normalizado = texto.trim().toLowerCase();

  if (!normalizado) {
    return null;
  }

  if (normalizado.includes("diretor")) {
    return "Diretor";
  }

  if (
    normalizado === "adm" ||
    normalizado.includes("administrador") ||
    normalizado.includes("admin")
  ) {
    return "ADM";
  }

  if (normalizado.includes("expedicao") || normalizado.includes("expedição")) {
    return "Expedição";
  }

  if (normalizado.includes("supervisor")) {
    return "Supervisor";
  }

  if (normalizado.includes("promotor")) {
    return "Promotor";
  }

  return null;
}

export function resolverClt(texto: string): "SIM" | "NÃO" | null {
  const normalizado = texto.trim().toLowerCase();

  if (!normalizado) {
    return "NÃO";
  }

  if (normalizado === "sim" || normalizado === "s" || normalizado === "true") {
    return "SIM";
  }

  if (normalizado === "nao" || normalizado === "não" || normalizado === "n" || normalizado === "false") {
    return "NÃO";
  }

  return null;
}

export function funcaoDoPerfil(perfil: PerfilUsuarioUi): string {
  return perfilParaFuncao(perfil);
}
