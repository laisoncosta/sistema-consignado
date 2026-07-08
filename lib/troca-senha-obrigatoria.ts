import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";
import { TEST_USER_PASSWORD } from "@/lib/test-users";

/** Senhas iniciais que não podem ser escolhidas na troca obrigatória. */
export function senhaEhPadraoInicial(senha: string | null | undefined): boolean {
  const normalizada = senha?.trim() ?? "";
  return (
    normalizada === SENHA_INICIAL_PADRAO || normalizada === TEST_USER_PASSWORD
  );
}

/**
 * Define se o usuário deve ir para /alterar-senha após autenticar.
 * A decisão depende exclusivamente do campo `alterarSenhaObrigatorio` no banco.
 */
export function exigeTrocaSenhaNoLogin(alterarSenhaObrigatorio: boolean): boolean {
  return alterarSenhaObrigatorio === true;
}
