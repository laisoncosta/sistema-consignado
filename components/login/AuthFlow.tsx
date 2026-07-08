"use client";

import { Loader2, Mail } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { CampoSenhaComToggle } from "@/components/login/CampoSenhaComToggle";
import {
  AuthView,
  LoginBackdrop,
  LoginBrandHeader,
  LoginErrorBox,
  LoginFieldLabel,
  LoginGlassCard,
  LoginPrimaryButton,
  LoginSecondaryButton,
  LoginSuccessBox,
  LoginTextLink,
  REMEMBER_EMAIL_KEY,
  criarInputRingStyle,
} from "@/components/login/login-shared";
import { MENSAGEM_CONTA_PENDENTE, MENSAGEM_RECUPERACAO_ENVIADA } from "@/lib/auth-codes";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import {
  getBrandByRegiao,
  getBrandFromEmailHint,
  type BrandTheme,
} from "@/lib/brands";
import { obterDeviceIdCliente } from "@/lib/device-id-client";
import { useIsMounted } from "@/lib/use-is-mounted";

const defaultBrand = getBrandByRegiao("Manaus");

export function AuthFlow() {
  const isMounted = useIsMounted();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState<BrandTheme>(defaultBrand);

  const [nomeCadastro, setNomeCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [confirmarSenhaCadastro, setConfirmarSenhaCadastro] = useState("");
  const [regioesCadastro, setRegioesCadastro] = useState<
    Array<{ id: number; rotulo: string }>
  >([]);
  const [regiaoCadastroId, setRegiaoCadastroId] = useState("");

  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  const inputRingStyle = criarInputRingStyle(brand);

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      const hint = getBrandFromEmailHint(savedEmail);
      if (hint) {
        setBrand(hint);
      }
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarRegioesCadastro() {
      try {
        const response = await apiFetch("/api/auth/regioes");
        const data = await parseApiJson<{
          regioes?: Array<{ id: number; rotulo: string }>;
        }>(response);

        if (!ativo || !response.ok || !Array.isArray(data.regioes)) {
          return;
        }

        setRegioesCadastro(data.regioes);

        if (data.regioes.length === 1) {
          setRegiaoCadastroId(String(data.regioes[0].id));
        }
      } catch {
        // Mantém o formulário utilizável; validação ocorre no submit.
      }
    }

    void carregarRegioesCadastro();

    return () => {
      ativo = false;
    };
  }, []);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    const hint = getBrandFromEmailHint(value);
    if (hint) {
      setBrand(hint);
    } else if (!value.trim()) {
      setBrand(defaultBrand);
    }
  }, []);

  async function handleEmailBlur(valor: string) {
    if (!valor.trim()) {
      setBrand(defaultBrand);
      return;
    }

    try {
      const response = await apiFetch(
        `/api/auth/regiao?email=${encodeURIComponent(valor.trim())}`,
      );
      const data = await response.json();
      if (data.brand) {
        setBrand(data.brand);
      }
    } catch {
      const hint = getBrandFromEmailHint(valor);
      setBrand(hint ?? defaultBrand);
    }
  }

  function irParaLogin() {
    setError("");
    setView("login");
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const emailNormalizado = String(formData.get("email") ?? "").trim();
    const senha = String(formData.get("senha") ?? "").trim();

    if (rememberMe && emailNormalizado) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, emailNormalizado);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    setEntrando(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailNormalizado,
          senha,
          deviceId: obterDeviceIdCliente(),
        }),
      });
      const data = await parseApiJson<{
        error?: string;
        code?: string;
        redirectTo?: string;
      }>(response);

      if (!response.ok) {
        if (data.code === "CONTA_PENDENTE") {
          setView("pendente");
          return;
        }
        setError(data.error ?? "Não foi possível entrar no sistema.");
        return;
      }

      const destino =
        typeof data.redirectTo === "string" && data.redirectTo
          ? data.redirectTo
          : "/dashboard/portal-pedidos";

      window.location.replace(destino);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setEntrando(false);
    }
  }

  async function handleCadastroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProcessando(true);

    try {
      const response = await apiFetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeCadastro,
          email,
          senha: senhaCadastro,
          confirmarSenha: confirmarSenhaCadastro,
          regiaoId: Number(regiaoCadastroId),
        }),
      });
      const data = await parseApiJson<{ error?: string }>(response);

      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir o cadastro.");
        return;
      }

      setView("pendente");
    } catch (cadastroError) {
      setError(
        cadastroError instanceof Error
          ? cadastroError.message
          : "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function handleRecuperarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProcessando(true);

    try {
      const response = await apiFetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacao }),
      });
      const data = await parseApiJson<{ error?: string }>(response);

      if (!response.ok) {
        setError(data.error ?? "Não foi possível enviar o e-mail de recuperação.");
        return;
      }

      setView("recuperar-enviado");
    } catch (recuperarError) {
      setError(
        recuperarError instanceof Error
          ? recuperarError.message
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

        {view === "login" ? (
          <>
            <p className="mt-2 mb-8 text-center text-sm text-slate-500">
              Insira suas credenciais abaixo para acessar:
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <LoginFieldLabel htmlFor="email">E-MAIL</LoginFieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    onBlur={() => void handleEmailBlur(email)}
                    placeholder="seu.email@empresa.com"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-3 pl-10 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30"
                    style={inputRingStyle}
                    required
                  />
                </div>
              </div>

              <div>
                <LoginFieldLabel htmlFor="senha">Senha</LoginFieldLabel>
                <CampoSenhaComToggle
                  id="senha"
                  name="senha"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  inputRingStyle={inputRingStyle}
                  isMounted={isMounted}
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                      style={{ accentColor: brand.primary }}
                    />
                    Permanecer conectado
                  </label>
                  <LoginTextLink onClick={() => {
                    setError("");
                    setEmailRecuperacao(email);
                    setView("recuperar");
                  }}>
                    Esqueci a senha
                  </LoginTextLink>
                </div>
              </div>

              {error ? <LoginErrorBox message={error} /> : null}

              <LoginPrimaryButton disabled={entrando}>
                {entrando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar no Sistema"
                )}
              </LoginPrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Ainda não é cadastrado?{" "}
              <LoginTextLink
                onClick={() => {
                  setError("");
                  setNomeCadastro("");
                  setSenhaCadastro("");
                  setConfirmarSenhaCadastro("");
                  setRegiaoCadastroId(
                    regioesCadastro.length === 1
                      ? String(regioesCadastro[0].id)
                      : "",
                  );
                  setView("cadastro");
                }}
              >
                Criar nova conta
              </LoginTextLink>
            </p>

            <div className="mt-6 rounded-xl bg-slate-100/80 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Acesso de teste</p>
              <p className="mt-1.5 leading-relaxed">
                Manaus: <strong>promotor@teste.com</strong> · Rio Branco:{" "}
                <strong>promotorac@teste.com</strong>
              </p>
              <p className="mt-1 leading-relaxed">
                Contas de teste: senha <strong>teste123</strong>. Demais usuários: senha
                inicial <strong>123456</strong> (troca obrigatória no 1º acesso).
              </p>
            </div>
          </>
        ) : null}

        {view === "cadastro" ? (
          <>
            <p className="mt-2 mb-8 text-center text-sm text-slate-500">
              Preencha os dados abaixo para solicitar acesso:
            </p>

            <form onSubmit={handleCadastroSubmit} className="space-y-5">
              <div>
                <LoginFieldLabel htmlFor="nome-cadastro">Nome Completo</LoginFieldLabel>
                <input
                  id="nome-cadastro"
                  name="nome"
                  type="text"
                  autoComplete="name"
                  value={nomeCadastro}
                  onChange={(event) => setNomeCadastro(event.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30"
                  style={inputRingStyle}
                  required
                />
              </div>

              <div>
                <LoginFieldLabel htmlFor="email-cadastro">E-MAIL</LoginFieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email-cadastro"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-3 pl-10 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30"
                    style={inputRingStyle}
                    required
                  />
                </div>
              </div>

              <div>
                <LoginFieldLabel htmlFor="regiao-cadastro">Região</LoginFieldLabel>
                <select
                  id="regiao-cadastro"
                  name="regiaoId"
                  value={regiaoCadastroId}
                  onChange={(event) => setRegiaoCadastroId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30"
                  style={inputRingStyle}
                  required
                >
                  <option value="" disabled>
                    Selecione a região de atuação
                  </option>
                  {regioesCadastro.map((regiao) => (
                    <option key={regiao.id} value={regiao.id}>
                      {regiao.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <LoginFieldLabel htmlFor="senha-cadastro">Senha</LoginFieldLabel>
                <CampoSenhaComToggle
                  id="senha-cadastro"
                  name="senha"
                  value={senhaCadastro}
                  onChange={setSenhaCadastro}
                  placeholder="Crie uma senha"
                  autoComplete="new-password"
                  inputRingStyle={inputRingStyle}
                  isMounted={isMounted}
                />
              </div>

              <div>
                <LoginFieldLabel htmlFor="confirmar-senha-cadastro">
                  Confirmar Senha
                </LoginFieldLabel>
                <CampoSenhaComToggle
                  id="confirmar-senha-cadastro"
                  name="confirmarSenha"
                  value={confirmarSenhaCadastro}
                  onChange={setConfirmarSenhaCadastro}
                  placeholder="Confirme sua senha"
                  autoComplete="new-password"
                  inputRingStyle={inputRingStyle}
                  isMounted={isMounted}
                />
              </div>

              {error ? <LoginErrorBox message={error} /> : null}

              <LoginPrimaryButton disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </LoginPrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Já tem uma conta?{" "}
              <LoginTextLink onClick={irParaLogin}>Fazer Login</LoginTextLink>
            </p>
          </>
        ) : null}

        {view === "recuperar" ? (
          <>
            <p className="mt-2 mb-8 text-center text-sm text-slate-500">
              Informe o e-mail cadastrado para receber o link de recuperação:
            </p>

            <form onSubmit={handleRecuperarSubmit} className="space-y-5">
              <div>
                <LoginFieldLabel htmlFor="email-recuperacao">
                  E-mail Cadastrado
                </LoginFieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email-recuperacao"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={emailRecuperacao}
                    onChange={(event) => setEmailRecuperacao(event.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-3 pl-10 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30"
                    style={inputRingStyle}
                    required
                  />
                </div>
              </div>

              {error ? <LoginErrorBox message={error} /> : null}

              <LoginPrimaryButton disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </LoginPrimaryButton>
            </form>

            <p className="mt-6 text-center">
              <LoginTextLink onClick={irParaLogin}>Voltar para o Login</LoginTextLink>
            </p>
          </>
        ) : null}

        {view === "recuperar-enviado" ? (
          <>
            <p className="mt-2 mb-6 text-center text-sm font-medium text-slate-700">
              E-mail enviado
            </p>
            <LoginSuccessBox message={MENSAGEM_RECUPERACAO_ENVIADA} />
            <p className="mt-4 text-center text-sm leading-relaxed text-slate-600">
              Verifique sua caixa de entrada e também a pasta de Spam. O link expira em
              algumas horas.
            </p>
            <div className="mt-6">
              <LoginSecondaryButton onClick={irParaLogin}>
                Voltar para o Login
              </LoginSecondaryButton>
            </div>
          </>
        ) : null}

        {view === "pendente" ? (
          <>
            <p className="mt-2 mb-6 text-center text-lg font-semibold text-emerald-700">
              Cadastro Realizado!
            </p>
            <LoginSuccessBox message={MENSAGEM_CONTA_PENDENTE} />
            <div className="mt-6">
              <LoginSecondaryButton onClick={irParaLogin}>
                Voltar para o Login
              </LoginSecondaryButton>
            </div>
          </>
        ) : null}
      </LoginGlassCard>
    </div>
  );
}
