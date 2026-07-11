"use client";

import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Edit2,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { ExcelImportExportBar } from "@/components/admin/ExcelImportExportBar";
import type { BrandTheme } from "@/lib/brands";
import {
  BRAND_MANAUS,
  BRAND_RIO_BRANCO,
} from "@/lib/identidade-gestao-lojas";
import {
  gradienteCabecalhoPainelAdmin,
  gradienteCardRegiao,
} from "@/lib/painel-aparencia";
import { SENHA_INICIAL_PADRAO } from "@/lib/senha-padrao";
import { exportarPlanilhaXls } from "@/lib/excel-io";
import {
  type FiltroCardUsuarios,
  type FiltroPerfilUsuario,
  paramsApiFiltroCardUsuarios,
  PERFIS_USUARIO_UI,
  type LojaGestaoItem,
  type PerfilExibicaoUsuario,
  type PerfilUsuarioUi,
  REGIAO_TODAS_ID,
  type StatusContaUsuario,
  type UsuarioContadores,
  type UsuarioFormData,
  type UsuarioGestaoItem,
} from "@/lib/admin-usuarios";

type GestaoUsuariosCatalogoProps = {
  brand: BrandTheme;
};

const classeCabecalhoTabela =
  "border-b border-slate-200 px-6 py-3 dark:border-slate-600";
const classeCelulaTabela =
  "border-b border-slate-100 px-6 py-3 dark:border-slate-700";

function CardContagemUsuario({
  label,
  valor,
  cor,
  destacado = false,
  onClick,
}: {
  label: string;
  valor: number;
  cor: string;
  destacado?: boolean;
  onClick?: () => void;
}) {
  const className = `w-full rounded-2xl border px-3 py-2.5 text-left shadow-sm transition ${
    destacado ? "ring-2 ring-inset" : ""
  } ${onClick ? "cursor-pointer hover:brightness-[0.98] active:scale-[0.99]" : ""}`;

  const conteudo = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-bold tracking-tight"
        style={{ color: cor }}
      >
        {valor}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={destacado}
        className={className}
        style={{
          borderColor: `${cor}33`,
          background: gradienteCardRegiao(cor),
          ...(destacado ? { ringColor: `${cor}55` } : {}),
        }}
      >
        {conteudo}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={{
        borderColor: `${cor}33`,
        background: gradienteCardRegiao(cor),
        ...(destacado ? { ringColor: `${cor}55` } : {}),
      }}
    >
      {conteudo}
    </div>
  );
}

const contadoresVazios: UsuarioContadores = {
  total: 0,
  manaus: 0,
  rioBranco: 0,
};

type RegiaoOpcao = {
  id: number;
  nome: string;
  rotulo: string;
  primary: string;
};

function BadgeStatus({ status }: { status: StatusContaUsuario }) {
  if (status === "Ativo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 size={12} /> Ativo
      </span>
    );
  }

  if (status === "Pendente") {
    return (
      <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <AlertCircle size={12} /> Pendente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
      <XCircle size={12} /> Inativo
    </span>
  );
}

function BadgePerfil({ perfil }: { perfil: PerfilExibicaoUsuario }) {
  if (perfil === "Pendente") {
    return (
      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        Pendente
      </span>
    );
  }

  const cores: Record<PerfilUsuarioUi, string> = {
    ADM: "bg-blue-50 text-blue-700 border-blue-200",
    Diretor: "bg-purple-50 text-purple-700 border-purple-200",
    Promotor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Supervisor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Expedição: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${cores[perfil]}`}
    >
      {perfil}
    </span>
  );
}

const formularioVazio = (regiaoId = 0): UsuarioFormData => ({
  nome: "",
  email: "",
  telefone: "",
  codCiss: "",
  clt: "NÃO",
  cercaVirtual: "inativar",
  status: "Pendente",
  perfil: "Promotor",
  filial: "Manaus",
  regiaoId,
  acessoTodasRegioes: false,
  lojas: [],
  ignorarTravaAparelho: false,
});

export function GestaoUsuariosCatalogo({ brand }: GestaoUsuariosCatalogoProps) {
  const [usuarios, setUsuarios] = useState<UsuarioGestaoItem[]>([]);
  const [regioes, setRegioes] = useState<RegiaoOpcao[]>([]);
  const [lojasPorRegiao, setLojasPorRegiao] = useState<LojaGestaoItem[]>([]);
  const [filtroCard, setFiltroCard] = useState<FiltroCardUsuarios>("total-ativos");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState<FiltroPerfilUsuario>("Todos");
  const [pendentes, setPendentes] = useState(0);
  const [contadores, setContadores] = useState<UsuarioContadores>(contadoresVazios);
  const [carregando, setCarregando] = useState(true);
  const [carregandoLojas, setCarregandoLojas] = useState(false);
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resetandoSenha, setResetandoSenha] = useState(false);
  const [resetandoAparelho, setResetandoAparelho] = useState(false);
  const [mensagemResetSenha, setMensagemResetSenha] = useState<string | null>(null);
  const [mensagemResetAparelho, setMensagemResetAparelho] = useState<string | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioGestaoItem | null>(
    null,
  );
  const [formulario, setFormulario] = useState<UsuarioFormData>(formularioVazio());
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [mensagemExcel, setMensagemExcel] = useState<string | null>(null);
  const [erroExcel, setErroExcel] = useState<string | null>(null);
  const [buscaLojaVinculo, setBuscaLojaVinculo] = useState("");

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;
  const classeCampoDrawer =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-transparent focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
  const classeLabelDrawer =
    "mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300";
  const classeAjudaDrawer =
    "mt-1 text-[11px] text-slate-500 dark:text-slate-400";

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const { regiao, status } = paramsApiFiltroCardUsuarios(filtroCard);
      const params = new URLSearchParams({
        busca: buscaAplicada,
        regiao,
        status,
        perfil: perfilFiltro,
      });

      const response = await fetch(`/api/admin/usuarios?${params.toString()}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar usuários.");
      }

      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
      setPendentes(Number(data.pendentes ?? 0));
      setContadores(data.contadores ?? contadoresVazios);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar usuários.",
      );
      setUsuarios([]);
      setContadores(contadoresVazios);
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, filtroCard, perfilFiltro]);

  function alternarFiltroCard(filtro: FiltroCardUsuarios) {
    setFiltroCard((atual) => (atual === filtro ? "total-ativos" : filtro));
  }

  useEffect(() => {
    async function carregarRegioes() {
      try {
        const response = await fetch("/api/admin/regioes", {
          credentials: "include",
        });
        const data = await response.json();

        if (response.ok && Array.isArray(data.regioes)) {
          setRegioes(data.regioes);
        }
      } catch {
        setRegioes([]);
      }
    }

    void carregarRegioes();
  }, []);

  useEffect(() => {
    void carregarUsuarios();
  }, [carregarUsuarios]);

  const lojasFiltradasVinculo = useMemo(() => {
    const termo = buscaLojaVinculo.trim().toLowerCase();

    if (!termo) {
      return lojasPorRegiao;
    }

    return lojasPorRegiao.filter((loja) =>
      loja.nome.toLowerCase().includes(termo),
    );
  }, [buscaLojaVinculo, lojasPorRegiao]);

  useEffect(() => {
    setBuscaLojaVinculo("");
  }, [formulario.regiaoId]);

  useEffect(() => {
    if (!drawerAberto || !formulario.regiaoId || formulario.acessoTodasRegioes) {
      setLojasPorRegiao([]);
      return;
    }

    let cancelado = false;

    async function carregarLojas() {
      setCarregandoLojas(true);

      try {
        const response = await fetch(
          `/api/admin/lojas?regiaoId=${encodeURIComponent(String(formulario.regiaoId))}`,
          { credentials: "include" },
        );
        const data = await response.json();

        if (!cancelado) {
          setLojasPorRegiao(Array.isArray(data.lojas) ? data.lojas : []);
        }
      } catch {
        if (!cancelado) {
          setLojasPorRegiao([]);
        }
      } finally {
        if (!cancelado) {
          setCarregandoLojas(false);
        }
      }
    }

    void carregarLojas();

    return () => {
      cancelado = true;
    };
  }, [drawerAberto, formulario.regiaoId, formulario.acessoTodasRegioes]);

  const regiaoFormulario = useMemo(
    () => regioes.find((regiao) => regiao.id === formulario.regiaoId),
    [regioes, formulario.regiaoId],
  );

  function preencherFormulario(usuario: UsuarioGestaoItem) {
    setFormulario({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      codCiss: usuario.codCiss,
      clt: usuario.clt,
      cercaVirtual: usuario.cercaVirtual,
      status: usuario.status,
      perfil: usuario.perfil === "Pendente" ? "Promotor" : usuario.perfil,
      filial: usuario.filial,
      regiaoId: usuario.acessoTodasRegioes ? REGIAO_TODAS_ID : usuario.regiaoId,
      acessoTodasRegioes: usuario.acessoTodasRegioes,
      lojas: usuario.lojas,
      ignorarTravaAparelho: usuario.ignorarTravaAparelho,
    });
  }

  async function abrirEdicao(usuario: UsuarioGestaoItem) {
    setUsuarioEditando(usuario);
    preencherFormulario(usuario);
    setDrawerAberto(true);
    setErro(null);
    setMensagemResetSenha(null);
    setMensagemResetAparelho(null);
    setCarregandoEdicao(true);

    try {
      const response = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar o usuário.");
      }

      if (data.usuario) {
        setUsuarioEditando(data.usuario);
        preencherFormulario(data.usuario);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do usuário.",
      );
    } finally {
      setCarregandoEdicao(false);
    }
  }

  function fecharDrawer() {
    if (salvando || resetandoSenha) {
      return;
    }

    setDrawerAberto(false);
    setUsuarioEditando(null);
    setMensagemResetSenha(null);
    setMensagemResetAparelho(null);
    setBuscaLojaVinculo("");
    setFormulario(formularioVazio(regioes[0]?.id ?? 0));
  }

  async function handleResetarSenha() {
    if (!usuarioEditando) {
      return;
    }

    const confirmar = window.confirm(
      `Resetar a senha de ${usuarioEditando.nome}?\n\nA nova senha será ${SENHA_INICIAL_PADRAO} e o colaborador precisará alterá-la no próximo login.`,
    );

    if (!confirmar) {
      return;
    }

    setResetandoSenha(true);
    setErro(null);
    setMensagemResetSenha(null);

    try {
      const response = await fetch(
        `/api/admin/usuarios/${usuarioEditando.id}/reset-senha`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível resetar a senha.");
      }

      setMensagemResetSenha(
        data.mensagem ??
          `Senha redefinida para ${SENHA_INICIAL_PADRAO}. Troca obrigatória no próximo login.`,
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível resetar a senha.",
      );
    } finally {
      setResetandoSenha(false);
    }
  }

  async function handleResetarAparelho() {
    if (!usuarioEditando) {
      return;
    }

    const confirmar = window.confirm(
      `Resetar o aparelho cadastrado de ${usuarioEditando.nome}?\n\nO próximo login no celular vinculará um novo aparelho automaticamente.`,
    );

    if (!confirmar) {
      return;
    }

    setResetandoAparelho(true);
    setErro(null);
    setMensagemResetAparelho(null);

    try {
      const response = await fetch(
        `/api/admin/usuarios/${usuarioEditando.id}/reset-aparelho`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível resetar o aparelho.");
      }

      setMensagemResetAparelho(
        data.mensagem ?? "Aparelho cadastrado resetado com sucesso.",
      );
      setUsuarioEditando((atual) =>
        atual ? { ...atual, deviceIdCadastrado: false } : atual,
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível resetar o aparelho cadastrado.",
      );
    } finally {
      setResetandoAparelho(false);
    }
  }

  function toggleLojaVinculo(lojaId: string) {
    setFormulario((atual) => ({
      ...atual,
      lojas: atual.lojas.includes(lojaId)
        ? atual.lojas.filter((id) => id !== lojaId)
        : [...atual.lojas, lojaId],
    }));
  }

  async function handleSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuarioEditando) {
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioEditando.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formulario,
          acessoTodasRegioes:
            formulario.perfil === "Diretor" &&
            (formulario.acessoTodasRegioes || formulario.regiaoId === REGIAO_TODAS_ID),
          lojas: formulario.perfil === "Promotor" ? formulario.lojas : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o usuário.");
      }

      fecharDrawer();
      await carregarUsuarios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o usuário.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function aplicarBusca(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuscaAplicada(busca.trim());
  }

  async function exportarExcel() {
    setExportandoExcel(true);
    setErroExcel(null);
    setMensagemExcel(null);

    try {
      const response = await fetch("/api/admin/usuarios?regiao=Todos&busca=", {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível exportar os usuários.");
      }

      const itens = Array.isArray(data.usuarios) ? data.usuarios : [];

      exportarPlanilhaXls(
        itens.map((usuario: UsuarioGestaoItem) => ({
          Nome: usuario.nome,
          Email: usuario.email,
          Perfil: usuario.perfil,
          Região: usuario.filialRotulo,
          "Vínculo CLT": usuario.clt,
          Status: usuario.status,
        })),
        "usuarios.xls",
      );

      setMensagemExcel(`${itens.length} usuário(s) exportado(s).`);
    } catch (error) {
      setErroExcel(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar os usuários.",
      );
    } finally {
      setExportandoExcel(false);
    }
  }

  async function importarExcel(arquivo: File) {
    setImportandoExcel(true);
    setErroExcel(null);
    setMensagemExcel(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const response = await fetch("/api/admin/usuarios/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível importar a planilha.");
      }

      const avisos =
        Array.isArray(data.erros) && data.erros.length > 0
          ? ` Avisos: ${data.erros.slice(0, 3).join(" ")}`
          : "";

      setMensagemExcel(`${data.mensagem ?? "Importação concluída."}${avisos}`);
      await carregarUsuarios();
    } catch (error) {
      setErroExcel(
        error instanceof Error
          ? error.message
          : "Não foi possível importar a planilha.",
      );
    } finally {
      setImportandoExcel(false);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-6 py-3">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
          <div
            className="shrink-0 border-b px-6 py-3 sm:px-8"
            style={{
              borderColor: brand.primaryLight,
              background: gradienteCabecalhoPainelAdmin(brand.primaryLight),
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div
                  className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm dark:bg-slate-800/90"
                  style={{ color: brand.primary }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Administração
                </div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  Gestão de Usuários e Perfis
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Atribua permissões, aprove novos acessos e gerencie as lojas de
                  atendimento.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {pendentes} pendente(s) aguardando
                </div>

                <ExcelImportExportBar
                  brand={brand}
                  exportando={exportandoExcel}
                  importando={importandoExcel}
                  mensagem={mensagemExcel}
                  erro={erroExcel}
                  onExportar={exportarExcel}
                  onImportar={importarExcel}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-b border-slate-200 px-6 py-3 dark:border-slate-700 sm:px-8">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <CardContagemUsuario
                label="Total de usuários ativos"
                valor={contadores.total}
                cor={brand.primary}
                destacado={filtroCard === "total-ativos"}
                onClick={() => alternarFiltroCard("total-ativos")}
              />
              <CardContagemUsuario
                label="Manaus - Viva"
                valor={contadores.manaus}
                cor={BRAND_MANAUS.primary}
                destacado={filtroCard === "manaus"}
                onClick={() => alternarFiltroCard("manaus")}
              />
              <CardContagemUsuario
                label="Rio Branco - Buriti"
                valor={contadores.rioBranco}
                cor={BRAND_RIO_BRANCO.primary}
                destacado={filtroCard === "rio-branco"}
                onClick={() => alternarFiltroCard("rio-branco")}
              />
              <CardContagemUsuario
                label="Cadastros pendentes"
                valor={pendentes}
                cor="#d97706"
                destacado={filtroCard === "pendentes"}
                onClick={() => alternarFiltroCard("pendentes")}
              />
            </div>

            <form
              onSubmit={aplicarBusca}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  style={inputRingStyle}
                />
              </div>
              <select
                value={perfilFiltro}
                onChange={(event) =>
                  setPerfilFiltro(event.target.value as FiltroPerfilUsuario)
                }
                aria-label="Filtrar por perfil"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:w-44"
                style={inputRingStyle}
              >
                <option value="Todos">Todos os perfis</option>
                {PERFIS_USUARIO_UI.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {perfil}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando usuários...
              </div>
            ) : erro && usuarios.length === 0 ? (
              <div className="py-16 text-center text-sm text-red-600">{erro}</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)] dark:bg-slate-800 dark:text-slate-400 dark:shadow-[0_1px_0_0_rgb(51_65_85)]">
                  <tr>
                    <th className={classeCabecalhoTabela}>Nome / E-mail</th>
                    <th className={classeCabecalhoTabela}>Perfil</th>
                    <th className={classeCabecalhoTabela}>Região</th>
                    <th className={classeCabecalhoTabela}>Vínculo CLT</th>
                    <th className={classeCabecalhoTabela}>Status</th>
                    <th className={`${classeCabecalhoTabela} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 dark:text-slate-200">
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <td className={classeCelulaTabela}>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {usuario.nome}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {usuario.email}
                        </div>
                      </td>
                      <td className={classeCelulaTabela}>
                        <BadgePerfil perfil={usuario.perfil} />
                      </td>
                      <td className={`font-medium text-slate-600 dark:text-slate-300 ${classeCelulaTabela}`}>
                        {usuario.filialRotulo ?? usuario.filial}
                      </td>
                      <td className={classeCelulaTabela}>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            usuario.clt === "SIM"
                              ? "text-slate-800 dark:text-slate-100"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          <Briefcase size={14} className="opacity-40" />
                          {usuario.clt}
                        </span>
                      </td>
                      <td className={classeCelulaTabela}>
                        <BadgeStatus status={usuario.status} />
                      </td>
                      <td className={`${classeCelulaTabela} text-right`}>
                        <button
                          type="button"
                          onClick={() => abrirEdicao(usuario)}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-95"
                          style={{
                            borderColor: brand.primary,
                            color: brand.primary,
                            backgroundColor: brand.primaryLight,
                          }}
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center font-medium text-slate-400 dark:text-slate-500"
                      >
                        Nenhum colaborador encontrado para os filtros aplicados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {drawerAberto ? (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-900/40 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0"
            onClick={fecharDrawer}
          />

          <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-slate-900 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Alterar Perfil de Acesso
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {usuarioEditando?.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={fecharDrawer}
                className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {carregandoEdicao ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando dados do colaborador...
                  </div>
                ) : (
                  <>
                <div className="space-y-4">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: brand.primary }}
                  >
                    Dados do Colaborador
                  </h4>

                  <div>
                    <label className={classeLabelDrawer}>
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={formulario.nome}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          nome: event.target.value,
                        }))
                      }
                      className={classeCampoDrawer}
                      style={inputRingStyle}
                    />
                  </div>

                  <div>
                    <label className={classeLabelDrawer}>
                      E-mail de Login
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={formulario.email}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          email: event.target.value,
                        }))
                      }
                      placeholder="usuario@empresa.com"
                      className={classeCampoDrawer}
                      style={inputRingStyle}
                    />
                    <p className={classeAjudaDrawer}>
                      Credencial usada para entrar no sistema. Pode ser alterada
                      pelo administrador ou diretor.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={classeLabelDrawer}>
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formulario.telefone}
                        onChange={(event) =>
                          setFormulario((atual) => ({
                            ...atual,
                            telefone: event.target.value,
                          }))
                        }
                        placeholder="(00) 00000-0000"
                        className={classeCampoDrawer}
                        style={inputRingStyle}
                      />
                    </div>
                    <div>
                      <label className={classeLabelDrawer}>
                        Código CISS{" "}
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          (Opcional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formulario.codCiss}
                        onChange={(event) =>
                          setFormulario((atual) => ({
                            ...atual,
                            codCiss: event.target.value,
                          }))
                        }
                        className={classeCampoDrawer}
                        style={inputRingStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={classeLabelDrawer}>
                      Vínculo de Trabalho CLT
                    </label>
                    <select
                      value={formulario.clt}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          clt: event.target.value as "SIM" | "NÃO",
                        }))
                      }
                      className={classeCampoDrawer}
                      style={inputRingStyle}
                    >
                      <option value="SIM">SIM</option>
                      <option value="NÃO">NÃO</option>
                    </select>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                <div className="space-y-4">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: brand.primary }}
                  >
                    Permissões e Região
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={classeLabelDrawer}>
                        Perfil de Acesso
                      </label>
                      <select
                        value={formulario.perfil}
                        onChange={(event) =>
                          setFormulario((atual) => ({
                            ...atual,
                            perfil: event.target.value as PerfilUsuarioUi,
                            lojas: [],
                            acessoTodasRegioes:
                              event.target.value === "Diretor"
                                ? atual.acessoTodasRegioes
                                : false,
                            regiaoId:
                              event.target.value === "Diretor" &&
                              atual.acessoTodasRegioes
                                ? REGIAO_TODAS_ID
                                : atual.regiaoId === REGIAO_TODAS_ID
                                  ? (regioes[0]?.id ?? atual.regiaoId)
                                  : atual.regiaoId,
                          }))
                        }
                        className={`${classeCampoDrawer} font-medium`}
                        style={inputRingStyle}
                      >
                        <option value="Promotor">Promotor</option>
                        <option value="Expedição">Expedição</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="ADM">ADM (Administrador)</option>
                        <option value="Diretor">Diretor</option>
                      </select>
                    </div>

                    <div>
                      <label className={classeLabelDrawer}>
                        Região / Filial
                      </label>
                      <select
                        value={formulario.regiaoId}
                        onChange={(event) => {
                          const regiaoId = Number(event.target.value);
                          const todas = regiaoId === REGIAO_TODAS_ID;
                          const regiao = regioes.find((item) => item.id === regiaoId);

                          setFormulario((atual) => ({
                            ...atual,
                            regiaoId,
                            acessoTodasRegioes: todas,
                            filial: todas
                              ? "Todas"
                              : (regiao?.nome ?? atual.filial),
                            lojas: [],
                          }));
                        }}
                        className={`${classeCampoDrawer} font-medium`}
                        style={inputRingStyle}
                      >
                        {formulario.perfil === "Diretor" ? (
                          <option value={REGIAO_TODAS_ID}>Todas</option>
                        ) : null}
                        {regioes.map((regiao) => (
                          <option key={regiao.id} value={regiao.id}>
                            {regiao.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={classeLabelDrawer}>
                      Status da Conta
                    </label>
                    <select
                      value={formulario.status}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          status: event.target.value as StatusContaUsuario,
                        }))
                      }
                      className={classeCampoDrawer}
                      style={inputRingStyle}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                        Senha de acesso
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                        Use se o colaborador esqueceu a senha ou não consegue
                        entrar. A senha volta para{" "}
                        <strong className="font-semibold text-amber-950 dark:text-amber-50">
                          {SENHA_INICIAL_PADRAO}
                        </strong>{" "}
                        e a troca será obrigatória no próximo login.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleResetarSenha()}
                      disabled={resetandoSenha || carregandoEdicao || salvando}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950 transition-all hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70"
                    >
                      {resetandoSenha ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Resetando...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5" />
                          Resetar Senha
                        </>
                      )}
                    </button>
                  </div>
                  {mensagemResetSenha ? (
                    <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                      {mensagemResetSenha}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Trava de Aparelho
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        Status:{" "}
                        <strong className="text-slate-800 dark:text-slate-100">
                          {usuarioEditando?.deviceIdCadastrado
                            ? "Aparelho vinculado"
                            : "Nenhum aparelho vinculado"}
                        </strong>
                        . Promotores só acessam pelo celular cadastrado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleResetarAparelho()}
                      disabled={
                        resetandoAparelho ||
                        carregandoEdicao ||
                        salvando ||
                        !usuarioEditando?.deviceIdCadastrado
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    >
                      {resetandoAparelho ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Resetando...
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-3.5 w-3.5" />
                          Resetar Aparelho Cadastrado
                        </>
                      )}
                    </button>
                  </div>
                  {mensagemResetAparelho ? (
                    <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                      {mensagemResetAparelho}
                    </p>
                  ) : null}
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-600 dark:bg-slate-900/50">
                    <input
                      type="checkbox"
                      checked={formulario.ignorarTravaAparelho}
                      onChange={(event) =>
                        setFormulario((atual) => ({
                          ...atual,
                          ignorarTravaAparelho: event.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-500"
                      style={{ accentColor: brand.primary }}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                        Ignorar Trava de Aparelho (Emergência)
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                        Permite login em qualquer aparelho enquanto ativo.
                      </span>
                    </span>
                  </label>
                </div>

                {formulario.perfil === "Promotor" ? (
                  <>
                    <div>
                      <label className={classeLabelDrawer}>
                        Cerca Virtual
                      </label>
                      <select
                        value={formulario.cercaVirtual}
                        onChange={(event) =>
                          setFormulario((atual) => ({
                            ...atual,
                            cercaVirtual: event.target.value as
                              | "ativar"
                              | "inativar",
                          }))
                        }
                        className={classeCampoDrawer}
                        style={inputRingStyle}
                      >
                        <option value="inativar">Inativar</option>
                        <option value="ativar">Ativar</option>
                      </select>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: brand.primary }}
                        >
                          Vincular Lojas do Promotor
                        </h4>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {formulario.lojas.length} selecionada(s)
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={buscaLojaVinculo}
                          onChange={(event) =>
                            setBuscaLojaVinculo(event.target.value)
                          }
                          placeholder="Buscar loja pelo nome..."
                          className={`${classeCampoDrawer} pl-9`}
                          style={inputRingStyle}
                          aria-label="Buscar loja pelo nome"
                        />
                      </div>

                      {carregandoLojas ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando lojas de {regiaoFormulario?.rotulo ?? "..."}
                        </div>
                      ) : (
                        <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/60">
                          {lojasFiltradasVinculo.map((loja) => {
                            const estaVinculada = formulario.lojas.includes(loja.id);

                            return (
                              <button
                                key={loja.id}
                                type="button"
                                onClick={() => toggleLojaVinculo(loja.id)}
                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                                  estaVinculada
                                    ? "border-emerald-500/30 bg-white font-medium text-emerald-900 shadow-sm dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                                    : "border-transparent text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-700/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={estaVinculada}
                                  readOnly
                                  className="pointer-events-none rounded text-emerald-600"
                                />
                                <span className="text-xs">{loja.nome}</span>
                              </button>
                            );
                          })}
                          {lojasPorRegiao.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Nenhuma loja cadastrada nesta região.
                            </p>
                          ) : lojasFiltradasVinculo.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Nenhuma loja encontrada para &quot;{buscaLojaVinculo.trim()}&quot;.
                            </p>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {formulario.lojas.map((lojaId) => {
                          const lojaObj = lojasPorRegiao.find(
                            (loja) => loja.id === lojaId,
                          );

                          return (
                            <span
                              key={lojaId}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                            >
                              {lojaObj ? lojaObj.nome : lojaId}
                              <button
                                type="button"
                                onClick={() => toggleLojaVinculo(lojaId)}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}

                {erro ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                    {erro}
                  </div>
                ) : null}
                  </>
                )}
              </div>

              <div className="mt-6 flex gap-3 border-t border-slate-100 p-6 dark:border-slate-700">
                <button
                  type="button"
                  onClick={fecharDrawer}
                  disabled={salvando || resetandoSenha}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Sair sem salvar
                </button>
                <button
                  type="submit"
                  disabled={salvando || carregandoEdicao || resetandoSenha}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-70"
                  style={{ backgroundColor: brand.primary }}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
