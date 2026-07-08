"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import {
  LoginBackdrop,
  LoginBrandHeader,
  LoginErrorBox,
  LoginFieldLabel,
  LoginGlassCard,
  LoginPrimaryButton,
  LoginSecondaryButton,
  LoginSuccessBox,
  LoginTextLink,
  criarInputRingStyle,
} from "@/components/login/login-shared";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { getBrandByRegiao } from "@/lib/brands";
import { CampoSenhaComToggle } from "@/components/login/CampoSenhaComToggle";

const brand = getBrandByRegiao("Manaus");
const inputRingStyle = criarInputRingStyle(brand);

function RedefinirSenhaConteudo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setProcessando(true);

    try {
      const response = await apiFetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          novaSenha,
          confirmarSenha,
        }),
      });
      const data = await parseApiJson<{ error?: string; redirectTo?: string }>(
        response,
      );

      if (!response.ok) {
        setErro(data.error ?? "Não foi possível redefinir a senha.");
        return;
      }

      setSucesso(true);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 font-[family-name:var(--font-poppins)]">
      <LoginBackdrop />

      <LoginGlassCard>
        <LoginBrandHeader />

        {!token ? (
          <>
            <p className="mt-2 mb-6 text-center text-sm text-slate-500">
              Link de recuperação inválido.
            </p>
            <LoginErrorBox message="Solicite um novo link de recuperação de senha." />
            <div className="mt-6">
              <LoginSecondaryButton
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Voltar para o Login
              </LoginSecondaryButton>
            </div>
          </>
        ) : sucesso ? (
          <>
            <p className="mt-2 mb-6 text-center text-sm font-medium text-slate-700">
              Senha redefinida
            </p>
            <LoginSuccessBox message="Sua senha foi atualizada com sucesso. Faça login com a nova senha." />
            <div className="mt-6">
              <LoginSecondaryButton
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Ir para o Login
              </LoginSecondaryButton>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 mb-8 text-center text-sm text-slate-500">
              Defina sua nova senha de acesso:
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <LoginFieldLabel htmlFor="nova-senha">Nova Senha</LoginFieldLabel>
                <CampoSenhaComToggle
                  id="nova-senha"
                  name="novaSenha"
                  value={novaSenha}
                  onChange={setNovaSenha}
                  placeholder="Digite a nova senha"
                  autoComplete="new-password"
                  inputRingStyle={inputRingStyle}
                />
              </div>

              <div>
                <LoginFieldLabel htmlFor="confirmar-nova-senha">
                  Confirmar Nova Senha
                </LoginFieldLabel>
                <CampoSenhaComToggle
                  id="confirmar-nova-senha"
                  name="confirmarSenha"
                  value={confirmarSenha}
                  onChange={setConfirmarSenha}
                  placeholder="Confirme a nova senha"
                  autoComplete="new-password"
                  inputRingStyle={inputRingStyle}
                />
              </div>

              {erro ? <LoginErrorBox message={erro} /> : null}

              <LoginPrimaryButton disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </LoginPrimaryButton>
            </form>

            <p className="mt-6 text-center">
              <LoginTextLink
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Voltar para o Login
              </LoginTextLink>
            </p>
          </>
        )}
      </LoginGlassCard>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <RedefinirSenhaConteudo />
    </Suspense>
  );
}
