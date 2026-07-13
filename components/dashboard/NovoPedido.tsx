"use client";

import { Loader2, LogOut, Minus, Plus, Save } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent } from "react";

import { ConferenciaLancamentosModal } from "@/components/dashboard/ConferenciaLancamentosModal";
import { PedidoDuplicadoModal } from "@/components/dashboard/PedidoDuplicadoModal";
import type { BrandTheme } from "@/lib/brands";
import {
  MENSAGEM_PEDIDO_EXTRA_BLOQUEADO,
  type ControlePedidoLojaDia,
} from "@/lib/controle-pedido-loja-client";
import {
  portalBtnPrimarioMobile,
  portalBtnSecundarioMobile,
  portalCaixaAcaoMobile,
  portalSelectMobile,
  portalInputQuantitativoMobile,
} from "@/lib/portal-mobile-ui";
import {
  criarLinhasComplementares,
  criarLinhasPedidoIniciais,
  LOJA_PEDIDO_PADRAO,
  MENSAGEM_VALOR_NEGATIVO,
  STATUS_PEDIDO_AGUARDANDO,
  type CamposLinhaPedido,
  type LinhasPedidoForm,
  type ModoLancamento,
  type ProdutoPedido,
} from "@/lib/pedido";
import { apiFetch } from "@/lib/api-client";
import {
  limparInicioVisitaLoja,
  obterInicioVisitaLoja,
  registrarInicioVisitaLoja,
} from "@/lib/auditoria-visita-client";
import {
  MENSAGEM_LOCALIZACAO_IMPRESA,
  MENSAGEM_PEDIDO_BLOQUEADO,
  MENSAGEM_PEDIDO_BLOQUEADO_ENVIO,
  normalizarCercaVirtualApi,
  obterCoordenadasGpsEnvioDefinitivo,
  obterPerimetroMaximo,
  resolverEstadoCercaVirtualUi,
  validarCheckInCercaVirtual,
  validarEnvioDefinitivoPedido,
  type ConfigCercaVirtualApi,
} from "@/lib/cerca-virtual-client";
import {
  resolverLojaPorValor,
} from "@/lib/portal-loja-id";
import type { StatusVisita } from "@/lib/visita";

export type TipoContrato = "CLT" | "MEI";

type LojaAtual = {
  id: string;
  rotulo: string;
  regiaoId?: number;
};

type ContextoAlertaDuplicado = "troca_loja" | "pedido_extra";

const CAIXA_TRACEJADA_STYLE: CSSProperties = {
  backgroundColor: "#F0FDF4",
  border: "2px dashed #499F4D",
  borderRadius: "6px",
  textAlign: "center",
  color: "#499F4D",
  fontWeight: "bold",
  cursor: "pointer",
};

type NovoPedidoProps = {
  brand: BrandTheme;
  tipoContrato: TipoContrato;
  statusVisita: StatusVisita;
  lojaId: string;
  lojaIdentificacao?: string;
  usuarioEmail: string;
  onLojaChange: (loja: LojaAtual) => void;
  onSelectLojaId?: (lojaId: string) => void;
  ignorarGeolocalizacao?: boolean;
  modoAdministrador?: boolean;
  regiaoId?: number;
  promotorId?: number;
  usuarioId?: number;
  lojasVinculadas?: LojaAtual[];
  otimizadoMobile?: boolean;
  abrirFormularioInicial?: boolean;
  pedidoExtraInicial?: boolean;
  erroCarregamentoLojas?: string | null;
  carregandoLojasVinculadas?: boolean;
};

const LOJA_SELECIONADA_SESSION_KEY = "selectedLojaId";

function lerLojaIdSession(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return String(sessionStorage.getItem(LOJA_SELECIONADA_SESSION_KEY) ?? "").trim();
}

function salvarLojaIdSession(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizado = String(id ?? "").trim();
  const lojaAnterior = String(
    sessionStorage.getItem(LOJA_SELECIONADA_SESSION_KEY) ?? "",
  ).trim();

  if (normalizado) {
    sessionStorage.setItem(LOJA_SELECIONADA_SESSION_KEY, normalizado);
    registrarInicioVisitaLoja(normalizado);
    return;
  }

  sessionStorage.removeItem(LOJA_SELECIONADA_SESSION_KEY);

  if (lojaAnterior) {
    limparInicioVisitaLoja(lojaAnterior);
  }
}

function limparLojaIdSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(LOJA_SELECIONADA_SESSION_KEY);
}

const CAMPOS_NUMERICOS: Array<{
  chave: keyof CamposLinhaPedido;
  label: string;
  abrev: string;
  abrevMobile: string;
}> = [
  { chave: "estoque", label: "Estoque", abrev: "Est.", abrevMobile: "EST" },
  { chave: "avaria", label: "Avaria", abrev: "Av.", abrevMobile: "AV" },
  { chave: "trocas", label: "Troca", abrev: "Tr.", abrevMobile: "TR" },
  { chave: "pedido", label: "Pedido", abrev: "Ped.", abrevMobile: "PED" },
];

const GRID_LINHA_PRODUTO =
  "grid grid-cols-[48px_minmax(0,1fr)_repeat(4,minmax(44px,1fr))] items-center gap-x-1 md:grid-cols-[64px_minmax(100px,1fr)_repeat(4,60px)] md:gap-x-1.5 lg:grid-cols-[72px_minmax(120px,1fr)_repeat(4,68px)]";

function possuiValorNegativoNoCatalogo(
  produtos: ProdutoPedido[],
  linhas: LinhasPedidoForm,
): boolean {
  const campos: Array<keyof CamposLinhaPedido> = [
    "estoque",
    "avaria",
    "trocas",
    "pedido",
  ];

  return produtos.some((produto) => {
    const linha = linhas[produto.id];

    return campos.some((campo) => {
      const valor = String(linha?.[campo] ?? "").trim();

      if (valor === "") {
        return false;
      }

      const quantidade = Number.parseInt(valor, 10);

      return Number.isNaN(quantidade) || quantidade < 0;
    });
  });
}

const MENSAGEM_PEDIDO_BLOQUEADO_SUBTITULO =
  "Você precisa estar na loja para acessar o portal de pedidos";

const MENSAGEM_ESTOQUE_PEDIDO_OBRIGATORIO =
  "Atenção: Existem campos de Estoque ou Pedido em branco. Por favor, preencha todos para continuar.";

const MENSAGEM_PEDIDO_EXTRA_SEM_ITENS =
  "Informe ao menos um produto com quantidade maior que zero.";

function chaveCampoFormulario(
  produtoId: string,
  campo: keyof CamposLinhaPedido,
): string {
  return `${produtoId}-${campo}`;
}

function campoEstoqueOuPedidoInvalido(valor: string): boolean {
  const normalizado = String(valor ?? "").trim();

  if (normalizado === "") {
    return true;
  }

  const quantidade = Number.parseInt(normalizado, 10);

  return Number.isNaN(quantidade) || quantidade < 0;
}

function normalizarLinhasComplementarMobile(
  linhas: LinhasPedidoForm,
  produtos: ProdutoPedido[],
): LinhasPedidoForm {
  const resultado = { ...linhas };

  for (const produto of produtos) {
    const linha = resultado[produto.id];

    resultado[produto.id] = {
      estoque: linha?.estoque ?? "",
      avaria: linha?.avaria ?? "",
      trocas: linha?.trocas ?? "",
      pedido: String(linha?.pedido ?? "").trim() === "" ? "0" : linha.pedido,
    };
  }

  return resultado;
}

function quantidadePedidoExtraMobile(valor: string): number {
  const normalizado = String(valor ?? "").trim();

  if (normalizado === "") {
    return 0;
  }

  const quantidade = Number.parseInt(normalizado, 10);

  return Number.isNaN(quantidade) ? 0 : quantidade;
}

function validarPedidoExtraMobile(
  produtos: ProdutoPedido[],
  linhas: LinhasPedidoForm,
): { erros: Record<string, boolean>; semItens: boolean } {
  const erros: Record<string, boolean> = {};
  let totalItens = 0;

  for (const produto of produtos) {
    const pedido = linhas[produto.id]?.pedido ?? "";
    const quantidade = quantidadePedidoExtraMobile(pedido);

    if (quantidade <= 0) {
      continue;
    }

    if (campoEstoqueOuPedidoInvalido(pedido)) {
      erros[chaveCampoFormulario(produto.id, "pedido")] = true;
      continue;
    }

    totalItens += quantidade;
  }

  return { erros, semItens: totalItens <= 0 };
}

function validarErrosEstoquePedido(
  produtos: ProdutoPedido[],
  linhas: LinhasPedidoForm,
  modoLancamento: ModoLancamento,
): Record<string, boolean> {
  const erros: Record<string, boolean> = {};

  for (const produto of produtos) {
    const linha = linhas[produto.id];

    if (modoLancamento === "complementar") {
      if (campoEstoqueOuPedidoInvalido(linha?.pedido ?? "")) {
        erros[chaveCampoFormulario(produto.id, "pedido")] = true;
      }
      continue;
    }

    if (campoEstoqueOuPedidoInvalido(linha?.estoque ?? "")) {
      erros[chaveCampoFormulario(produto.id, "estoque")] = true;
    }

    if (campoEstoqueOuPedidoInvalido(linha?.pedido ?? "")) {
      erros[chaveCampoFormulario(produto.id, "pedido")] = true;
    }
  }

  return erros;
}

function listarCamposNavegaveis(
  produtos: ProdutoPedido[],
  campoEstaTravado: (chave: keyof CamposLinhaPedido) => boolean,
): string[] {
  const ids: string[] = [];

  for (const produto of produtos) {
    for (const { chave } of CAMPOS_NUMERICOS) {
      if (!campoEstaTravado(chave)) {
        ids.push(chaveCampoFormulario(produto.id, chave));
      }
    }
  }

  return ids;
}

function focarCampoAdjacente(
  idAtual: string,
  delta: number,
  idsNavegaveis: string[],
) {
  const indice = idsNavegaveis.indexOf(idAtual);

  if (indice === -1) {
    return;
  }

  const proximo = idsNavegaveis[indice + delta];

  if (!proximo) {
    return;
  }

  document.getElementById(proximo)?.focus();
}

function somarColunaLancamento(
  produtos: ProdutoPedido[],
  linhas: LinhasPedidoForm,
  campo: keyof CamposLinhaPedido,
): number {
  return produtos.reduce((total, produto) => {
    const valor = String(linhas[produto.id]?.[campo] ?? "").trim();

    if (valor === "") {
      return total;
    }

    const quantidade = Number.parseInt(valor, 10);

    return total + (Number.isNaN(quantidade) ? 0 : quantidade);
  }, 0);
}

type InputQuantitativoProps = {
  id: string;
  label: string;
  abrev: string;
  value: string;
  onChange: (valor: string) => void;
  inputRingStyle: CSSProperties;
  compacto?: boolean;
  desabilitado?: boolean;
  otimizadoMobile?: boolean;
  semRotulo?: boolean;
  rotuloCurto?: boolean;
  abrevExibicao?: string;
  descricaoAcessivel?: string;
  invalido?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function InputQuantitativo({
  id,
  label,
  abrev,
  value,
  onChange,
  inputRingStyle,
  compacto = false,
  desabilitado = false,
  otimizadoMobile = false,
  semRotulo = false,
  rotuloCurto = false,
  abrevExibicao,
  descricaoAcessivel,
  invalido = false,
  onKeyDown,
}: InputQuantitativoProps) {
  const classeInputBase = compacto
    ? "w-full rounded-md border border-slate-200 bg-white px-0.5 py-1.5 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 md:py-2 md:text-sm"
    : "w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

  const classeInputMobile =
    otimizadoMobile && compacto ? portalInputQuantitativoMobile : classeInputBase;

  const classeInput = invalido
    ? `${classeInputMobile.replace("focus:border-transparent", "")} !border-red-500 ring-2 ring-red-500 focus:!border-red-500 focus:ring-2 focus:!ring-red-500`
    : classeInputMobile;

  const textoRotulo = abrevExibicao ?? (rotuloCurto ? abrev : label);

  return (
    <div className={compacto ? "min-w-0 flex-1" : ""}>
      {!semRotulo ? (
        <label
          htmlFor={id}
          className={`mb-0.5 block text-center font-semibold text-slate-500 ${
            abrevExibicao
              ? "text-[9px] leading-none tracking-wide"
              : rotuloCurto
                ? "text-[10px] leading-none"
                : "text-xs"
          }`}
        >
          {textoRotulo}
        </label>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        disabled={desabilitado}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        aria-invalid={invalido || undefined}
        aria-label={
          semRotulo
            ? `${label}${descricaoAcessivel ? ` — ${descricaoAcessivel}` : ""}`
            : undefined
        }
        className={classeInput}
        style={invalido ? undefined : inputRingStyle}
      />
    </div>
  );
}

type FormularioLancamentosProps = {
  produtos: ProdutoPedido[];
  linhasPedido: LinhasPedidoForm;
  onAtualizarCampo: (
    produtoId: string,
    campo: keyof CamposLinhaPedido,
    valor: string,
  ) => void;
  inputRingStyle: CSSProperties;
  camposDesabilitados: boolean;
  modoLancamento: ModoLancamento;
  otimizadoMobile?: boolean;
  formErrors?: Record<string, boolean>;
};

function FormularioLancamentos({
  produtos,
  linhasPedido,
  onAtualizarCampo,
  inputRingStyle,
  camposDesabilitados,
  modoLancamento,
  otimizadoMobile = false,
  formErrors = {},
}: FormularioLancamentosProps) {
  function campoEstaTravado(chave: keyof CamposLinhaPedido): boolean {
    if (camposDesabilitados) {
      return true;
    }

    return modoLancamento === "complementar" && chave !== "pedido";
  }

  const idsNavegaveis = useMemo(
    () => listarCamposNavegaveis(produtos, campoEstaTravado),
    [produtos, camposDesabilitados, modoLancamento],
  );

  const totais = useMemo(
    () => ({
      estoque: somarColunaLancamento(produtos, linhasPedido, "estoque"),
      avaria: somarColunaLancamento(produtos, linhasPedido, "avaria"),
      trocas: somarColunaLancamento(produtos, linhasPedido, "trocas"),
      pedido: somarColunaLancamento(produtos, linhasPedido, "pedido"),
    }),
    [produtos, linhasPedido],
  );

  function handleNavegacaoTeclado(
    idCampo: string,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter" || event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focarCampoAdjacente(idCampo, 1, idsNavegaveis);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focarCampoAdjacente(idCampo, -1, idsNavegaveis);
    }
  }

  function renderCampo(
    produto: ProdutoPedido,
    campo: (typeof CAMPOS_NUMERICOS)[number],
    opcoes?: { rotuloCurto?: boolean; abrevMobile?: string },
  ) {
    const idCampo = chaveCampoFormulario(produto.id, campo.chave);

    return (
      <InputQuantitativo
        key={campo.chave}
        id={idCampo}
        label={campo.label}
        abrev={campo.abrev}
        value={linhasPedido[produto.id]?.[campo.chave] ?? ""}
        onChange={(valor) => onAtualizarCampo(produto.id, campo.chave, valor)}
        inputRingStyle={inputRingStyle}
        compacto
        rotuloCurto={opcoes?.rotuloCurto}
        abrevExibicao={opcoes?.abrevMobile}
        desabilitado={campoEstaTravado(campo.chave)}
        otimizadoMobile={otimizadoMobile}
        descricaoAcessivel={produto.nome}
        invalido={Boolean(formErrors[idCampo])}
        onKeyDown={(event) => handleNavegacaoTeclado(idCampo, event)}
      />
    );
  }

  return (
    <div className="mt-4 max-h-[min(70vh,640px)] overflow-auto rounded-xl border border-slate-200">
      <div
        className={`sticky top-0 z-10 hidden border-b border-slate-300 bg-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-800 md:grid ${GRID_LINHA_PRODUTO}`}
      >
        <span>Cód.</span>
        <span>Produto</span>
        {CAMPOS_NUMERICOS.map(({ chave, label }) => (
          <span key={chave} className="text-center">
            {label}
          </span>
        ))}
      </div>

      <div className="divide-y divide-slate-200">
        {produtos.map((produto, indice) => (
          <div key={produto.id}>
            <article
              className={`p-3 md:hidden ${
                indice % 2 === 0 ? "bg-slate-50" : "bg-white"
              }`}
            >
              <p className="text-sm font-semibold leading-snug text-slate-900">
                {produto.codigoCiss} - {produto.nome}
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {CAMPOS_NUMERICOS.map((campo) =>
                  renderCampo(produto, campo, {
                    rotuloCurto: true,
                    abrevMobile: campo.abrevMobile,
                  }),
                )}
              </div>
            </article>

            <div
              className={`hidden px-3 py-2 md:grid ${GRID_LINHA_PRODUTO} ${
                indice % 2 === 0 ? "bg-slate-50" : "bg-white"
              } hover:bg-slate-100`}
            >
              <span className="font-mono text-xs font-semibold text-slate-700">
                {produto.codigoCiss}
              </span>
              <p className="min-w-0 text-sm font-medium leading-snug text-slate-900">
                {produto.nome}
              </p>
              {CAMPOS_NUMERICOS.map((campo) =>
                renderCampo(produto, campo, { rotuloCurto: true }),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-200">
        <article className="p-3 md:hidden">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-800">
            Totais
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {CAMPOS_NUMERICOS.map(({ chave, abrevMobile }) => (
              <div key={chave}>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {abrevMobile}
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {totais[chave]}
                </p>
              </div>
            ))}
          </div>
        </article>

        <div
          className={`hidden px-3 py-3 md:grid ${GRID_LINHA_PRODUTO} items-center`}
        >
          <span className="font-bold uppercase tracking-wide text-slate-800">
            Totais
          </span>
          <span />
          {CAMPOS_NUMERICOS.map(({ chave }) => (
            <span
              key={chave}
              className="text-center text-sm font-bold text-slate-900"
            >
              {totais[chave]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type FormularioPedidoExtraMobileProps = {
  produtos: ProdutoPedido[];
  linhasPedido: LinhasPedidoForm;
  onAtualizarCampo: (
    produtoId: string,
    campo: keyof CamposLinhaPedido,
    valor: string,
  ) => void;
  inputRingStyle: CSSProperties;
  formErrors?: Record<string, boolean>;
};

function FormularioPedidoExtraMobile({
  produtos,
  linhasPedido,
  onAtualizarCampo,
  inputRingStyle,
  formErrors = {},
}: FormularioPedidoExtraMobileProps) {
  function ajustarQuantidade(produtoId: string, delta: number) {
    const quantidadeAtual = quantidadePedidoExtraMobile(
      linhasPedido[produtoId]?.pedido ?? "",
    );
    const novaQuantidade = Math.max(0, quantidadeAtual + delta);

    onAtualizarCampo(
      produtoId,
      "pedido",
      novaQuantidade === 0 ? "" : String(novaQuantidade),
    );
  }

  if (produtos.length === 0) {
    return null;
  }

  return (
    <div className="mx-1 mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-0">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span>Produto</span>
        <span className="text-center">Qtde Solicitada</span>
      </div>

      <ul className="max-h-[min(60vh,520px)] divide-y divide-slate-100 overflow-y-auto">
        {produtos.map((produto) => {
          const idCampoPedido = chaveCampoFormulario(produto.id, "pedido");
          const valorPedido = linhasPedido[produto.id]?.pedido ?? "";
          const invalido = Boolean(formErrors[idCampoPedido]);

          return (
            <li
              key={produto.id}
              className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 px-3 py-3"
            >
              <p className="text-sm font-medium leading-snug text-slate-800">
                {produto.nome}
              </p>

              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  aria-label={`Diminuir quantidade de ${produto.nome}`}
                  onClick={() => ajustarQuantidade(produto.id, -1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-white"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <input
                  id={idCampoPedido}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={valorPedido}
                  aria-invalid={invalido || undefined}
                  aria-label={`Qtde solicitada de ${produto.nome}`}
                  onChange={(event) =>
                    onAtualizarCampo(produto.id, "pedido", event.target.value)
                  }
                  className={`h-9 w-12 rounded-lg border bg-white text-center text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 ${
                    invalido
                      ? "border-red-500 ring-2 ring-red-500"
                      : "border-slate-200"
                  }`}
                  style={invalido ? undefined : inputRingStyle}
                />

                <button
                  type="button"
                  aria-label={`Aumentar quantidade de ${produto.nome}`}
                  onClick={() => ajustarQuantidade(produto.id, 1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NovoPedido({
  brand,
  tipoContrato,
  statusVisita,
  lojaId,
  lojaIdentificacao = LOJA_PEDIDO_PADRAO,
  usuarioEmail,
  onLojaChange,
  onSelectLojaId,
  ignorarGeolocalizacao = false,
  modoAdministrador = false,
  regiaoId,
  promotorId,
  usuarioId,
  lojasVinculadas = [],
  otimizadoMobile = false,
  abrirFormularioInicial = false,
  pedidoExtraInicial = false,
  erroCarregamentoLojas = null,
  carregandoLojasVinculadas = false,
}: NovoPedidoProps) {
  const lojasSelectRef = useRef<LojaAtual[]>(lojasVinculadas);
  const selectLojaElementRef = useRef<HTMLSelectElement>(null);
  const atualizarLojaSelecionadaRef = useRef<(valor: string) => void>(() => {});

  useEffect(() => {
    if (lojasVinculadas.length > 0) {
      lojasSelectRef.current = lojasVinculadas;
    }
  }, [lojasVinculadas]);

  const lojasDoSelect =
    lojasVinculadas.length > 0 ? lojasVinculadas : lojasSelectRef.current;

  const ultimaLojaRef = useRef<LojaAtual>({ id: lojaId, rotulo: lojaIdentificacao });
  const lojaParaVoltarRef = useRef<LojaAtual>({ id: lojaId, rotulo: lojaIdentificacao });
  const ignorarProximaTrocaRef = useRef(false);
  const ignorarAlertaInicialRef = useRef(true);
  const lojaIdAnteriorRef = useRef<string>("");
  const requisicaoProdutosRef = useRef(0);
  const requisicaoControleRef = useRef(0);
  const exibirFormularioRef = useRef(false);
  const produtosCatalogoRef = useRef<ProdutoPedido[]>([]);
  const formularioPedidoRef = useRef<HTMLDivElement>(null);
  const salvarPedidoFormRef = useRef<HTMLFormElement>(null);
  const novoPedidoFormRef = useRef<HTMLFormElement>(null);
  const pedidoExtraFormRef = useRef<HTMLFormElement>(null);
  const sairPedidoFormRef = useRef<HTMLFormElement>(null);
  const handleSalvarPedidoRef = useRef<() => void>(() => {});
  const iniciarPedidoExtraRef = useRef<() => Promise<void>>(async () => {});
  const abrirFormularioPedidoRef = useRef<() => void>(() => {});
  const fecharFormularioPedidoRef = useRef<() => void>(() => {});
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [linhasPedido, setLinhasPedido] = useState<LinhasPedidoForm>(() => ({}));
  const [modoLancamento, setModoLancamento] = useState<ModoLancamento>("normal");
  const [exibirFormulario, setExibirFormulario] = useState(false);
  const [primeiroPedidoEnviado, setPrimeiroPedidoEnviado] = useState(false);
  const [pedidoExtraRealizado, setPedidoExtraRealizado] = useState(false);
  const [contextoAlerta, setContextoAlerta] =
    useState<ContextoAlertaDuplicado | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [modalConferenciaAberto, setModalConferenciaAberto] = useState(false);
  const duplicadoAlertaRef = useRef<HTMLDivElement>(null);
  const [produtosCatalogo, setProdutosCatalogo] =
    useState<ProdutoPedido[]>([]);
  const [regiaoIdResposta, setRegiaoIdResposta] = useState<number | undefined>();
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [verificandoControleLoja, setVerificandoControleLoja] = useState(false);
  const [controleLojaCarregado, setControleLojaCarregado] = useState(false);
  const [erroControleLoja, setErroControleLoja] = useState<string | null>(null);
  const [cercaConfig, setCercaConfig] = useState<ConfigCercaVirtualApi | null>(
    null,
  );
  const [dentroPerimetro, setDentroPerimetro] = useState<boolean | null>(null);
  const [falhaLocalizacaoCerca, setFalhaLocalizacaoCerca] = useState(false);
  const [localizacaoImprecisaCerca, setLocalizacaoImprecisaCerca] = useState(false);
  const [validandoCheckInGps, setValidandoCheckInGps] = useState(false);
  const [chaveRevalidacaoCheckIn, setChaveRevalidacaoCheckIn] = useState(0);
  const [lojaIdLocal, setLojaIdLocal] = useState("");
  const [uiClienteMontada, setUiClienteMontada] = useState(false);
  const lojaInicializadaRef = useRef(false);
  const envioEmAndamentoRef = useRef(false);
  const dentroPerimetroRef = useRef<boolean | null>(null);
  const leituraGpsEstavelRef = useRef<{
    valor: boolean | null;
    consecutivas: number;
  }>({ valor: null, consecutivas: 0 });

  useEffect(() => {
    setUiClienteMontada(true);

    if (modoAdministrador) {
      return;
    }

    const stored = lerLojaIdSession();
    if (!stored) {
      return;
    }

    setLojaIdLocal(stored);

    if (selectLojaElementRef.current) {
      selectLojaElementRef.current.value = stored;
    }

    queueMicrotask(() => {
      onSelectLojaId?.(stored);
    });
  }, [modoAdministrador, onSelectLojaId]);

  useEffect(() => {
    if (modoAdministrador || lojaInicializadaRef.current) {
      return;
    }

    lojaInicializadaRef.current = true;
  }, [modoAdministrador]);

  useEffect(() => {
    if (modoAdministrador || !lojaIdLocal || !selectLojaElementRef.current) {
      return;
    }

    selectLojaElementRef.current.value = lojaIdLocal;
  }, [modoAdministrador, lojaIdLocal, lojasDoSelect.length]);

  const lojaIdNormalizado = useMemo(() => {
    if (!modoAdministrador) {
      return String(lojaIdLocal ?? "").trim();
    }

    const idProp = String(lojaId ?? "").trim();
    return idProp || String(lojaIdLocal ?? "").trim();
  }, [lojaId, lojaIdLocal, modoAdministrador]);
  const lojaSelecionada = lojaIdNormalizado.length > 0;
  const estadoCerca = useMemo(
    () =>
      resolverEstadoCercaVirtualUi({
        config: cercaConfig,
        dentroPerimetro,
        falhaLocalizacao: falhaLocalizacaoCerca,
        primeiroPedidoEnviado,
        pedidoExtraRealizado,
      }),
    [
      cercaConfig,
      dentroPerimetro,
      falhaLocalizacaoCerca,
      primeiroPedidoEnviado,
      pedidoExtraRealizado,
    ],
  );
  const cercaExigeValidacao = Boolean(cercaConfig?.exigeValidacao);
  const chaveLojaCerca = useMemo(() => {
    if (!cercaConfig?.exigeValidacao) {
      return "";
    }

    const loja = cercaConfig.loja;

    return [
      loja.latitude,
      loja.longitude,
      obterPerimetroMaximo(loja),
    ].join("|");
  }, [cercaConfig]);
  const pedidoLiberado =
    modoAdministrador ||
    ignorarGeolocalizacao ||
    tipoContrato === "MEI" ||
    statusVisita === "em_andamento";
  const camposDesabilitados = !pedidoLiberado;
  const limitePedidosAtingido =
    modoAdministrador ? false : pedidoExtraRealizado && primeiroPedidoEnviado;
  const verificacaoConcluida =
    modoAdministrador ||
    (lojaSelecionada && controleLojaCarregado && !verificandoControleLoja);
  const fluxoLojaPronto =
    modoAdministrador
      ? lojaIdNormalizado.length > 0
      : lojaSelecionada && controleLojaCarregado && !verificandoControleLoja;
  const aguardandoAtivacaoGpsCerca =
    !modoAdministrador &&
    lojaSelecionada &&
    fluxoLojaPronto &&
    cercaExigeValidacao &&
    validandoCheckInGps &&
    !carregandoProdutos;
  const pedidoBloqueadoCerca =
    !modoAdministrador &&
    cercaExigeValidacao &&
    (estadoCerca === "bloqueado" ||
      dentroPerimetro === false ||
      falhaLocalizacaoCerca);
  const exibirTabela =
    modoAdministrador
      ? fluxoLojaPronto
      : exibirFormulario &&
        pedidoLiberado &&
        fluxoLojaPronto &&
        !pedidoBloqueadoCerca;
  const podeIniciarPedido =
    !modoAdministrador &&
    lojaSelecionada &&
    !exibirFormulario &&
    pedidoLiberado &&
    !limitePedidosAtingido;
  const exibirCaixaAcao = podeIniciarPedido;
  const exibirCarregandoGenerico =
    !modoAdministrador &&
    lojaSelecionada &&
    !falhaLocalizacaoCerca &&
    !localizacaoImprecisaCerca &&
    !pedidoBloqueadoCerca &&
    (verificandoControleLoja ||
      !controleLojaCarregado ||
      carregandoProdutos ||
      aguardandoAtivacaoGpsCerca ||
      (validandoCheckInGps &&
        cercaExigeValidacao &&
        estadoCerca === "verificando"));
  const estadosCercaComBotao =
    estadoCerca === "inativo" || estadoCerca === "visita_inicial";
  const cercaLiberadaParaPedido =
    !cercaExigeValidacao || dentroPerimetro === true;

  function revalidarCheckInCerca() {
    dentroPerimetroRef.current = null;
    leituraGpsEstavelRef.current = { valor: null, consecutivas: 0 };
    setFalhaLocalizacaoCerca(false);
    setLocalizacaoImprecisaCerca(false);
    setDentroPerimetro(null);
    setChaveRevalidacaoCheckIn((atual) => atual + 1);
  }

  function pararMonitoramentoGps() {
    setValidandoCheckInGps(false);
    dentroPerimetroRef.current = null;
    leituraGpsEstavelRef.current = { valor: null, consecutivas: 0 };
    setDentroPerimetro(null);
    setFalhaLocalizacaoCerca(false);
    setLocalizacaoImprecisaCerca(false);
  }

  const exibirBotaoNovoPedido =
    !modoAdministrador &&
    lojaIdNormalizado.length > 0 &&
    !exibirFormulario &&
    pedidoLiberado &&
    !limitePedidosAtingido &&
    !exibirCarregandoGenerico &&
    cercaLiberadaParaPedido &&
    !pedidoBloqueadoCerca &&
    produtosCatalogo.length > 0 &&
    (!primeiroPedidoEnviado || Boolean(erroControleLoja)) &&
    estadosCercaComBotao;
  const exibirBotaoPedidoExtra =
    !modoAdministrador &&
    lojaIdNormalizado.length > 0 &&
    !exibirFormulario &&
    pedidoLiberado &&
    !limitePedidosAtingido &&
    !exibirCarregandoGenerico &&
    cercaLiberadaParaPedido &&
    !pedidoBloqueadoCerca &&
    produtosCatalogo.length > 0 &&
    primeiroPedidoEnviado &&
    !pedidoExtraRealizado &&
    !erroControleLoja &&
    (estadoCerca === "inativo" || estadoCerca === "pedido_extra");
  const botaoPedidoDesabilitado = !modoAdministrador
    ? pedidoBloqueadoCerca ||
      exibirCarregandoGenerico ||
      verificandoControleLoja ||
      carregandoProdutos ||
      produtosCatalogo.length === 0 ||
      Boolean(erroControleLoja)
    : !fluxoLojaPronto ||
      verificandoControleLoja ||
      carregandoProdutos ||
      produtosCatalogo.length === 0 ||
      Boolean(erroControleLoja);
  const textoBotaoNovoPedido =
    exibirCarregandoGenerico
      ? "Carregando..."
      : erroControleLoja
        ? "Não foi possível verificar a loja"
        : cercaExigeValidacao
          ? "Fazer Pedido"
          : "+ Novo Pedido";

  const mensagemAguardandoAcao = useMemo(() => {
    if (
      modoAdministrador ||
      !uiClienteMontada ||
      !lojaSelecionada ||
      exibirFormulario ||
      exibirBotaoNovoPedido ||
      exibirBotaoPedidoExtra ||
      exibirCarregandoGenerico ||
      pedidoBloqueadoCerca ||
      localizacaoImprecisaCerca ||
      erroControleLoja ||
      limitePedidosAtingido
    ) {
      return null;
    }

    if (produtosCatalogo.length === 0 && fluxoLojaPronto && !carregandoProdutos) {
      return null;
    }

    if (cercaExigeValidacao && estadoCerca === "verificando") {
      return "Validando sua localização na loja...";
    }

    if (primeiroPedidoEnviado && !pedidoExtraRealizado) {
      return "Pedido principal já enviado hoje. Aguarde a liberação do pedido extra.";
    }

    return "Preparando o lançamento. Aguarde alguns instantes...";
  }, [
    carregandoProdutos,
    cercaExigeValidacao,
    erroControleLoja,
    estadoCerca,
    exibirBotaoNovoPedido,
    exibirBotaoPedidoExtra,
    exibirCarregandoGenerico,
    exibirFormulario,
    fluxoLojaPronto,
    limitePedidosAtingido,
    localizacaoImprecisaCerca,
    lojaSelecionada,
    modoAdministrador,
    pedidoBloqueadoCerca,
    pedidoExtraRealizado,
    primeiroPedidoEnviado,
    produtosCatalogo.length,
    uiClienteMontada,
  ]);

  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  exibirFormularioRef.current = exibirFormulario;
  produtosCatalogoRef.current = produtosCatalogo;
  ultimaLojaRef.current = { id: lojaIdNormalizado, rotulo: lojaIdentificacao };

  function limparParametrosPedidoNaUrl() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("abrirFormulario");
    params.delete("pedidoExtra");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function fecharFormularioPedido() {
    limparLojaIdSession();
    setFormErrors({});
    setExibirFormulario(false);
    setModoLancamento("normal");
    setModalConferenciaAberto(false);
    setContextoAlerta(null);
    setErroValidacao(null);
    setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogoRef.current));
    limparParametrosPedidoNaUrl();
  }

  fecharFormularioPedidoRef.current = fecharFormularioPedido;

  function rolarParaFormulario() {
    window.requestAnimationFrame(() => {
      formularioPedidoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function abrirFormularioPedido() {
    const produtos = produtosCatalogoRef.current;
    setLinhasPedido(criarLinhasPedidoIniciais(produtos));
    setModoLancamento("normal");
    setExibirFormulario(true);
    setErroValidacao(null);
    setFormErrors({});
    setMensagemSucesso(null);
    rolarParaFormulario();
  }

  abrirFormularioPedidoRef.current = abrirFormularioPedido;

  useEffect(() => {
    if (!lojaIdNormalizado) {
      setProdutosCatalogo([]);
      setRegiaoIdResposta(undefined);
      setLinhasPedido({});
      setCercaConfig(null);
      setDentroPerimetro(null);
      setFalhaLocalizacaoCerca(false);
      setCarregandoProdutos(false);
      return;
    }

    let cancelado = false;
    const requisicaoId = ++requisicaoProdutosRef.current;

    async function carregarProdutos() {
      setCarregandoProdutos(true);
      setErroValidacao(null);
      setCercaConfig(null);
      setDentroPerimetro(null);
      dentroPerimetroRef.current = null;
      leituraGpsEstavelRef.current = { valor: null, consecutivas: 0 };

      try {
        const params = new URLSearchParams({
          lojaId: String(lojaIdNormalizado),
        });

        const response = await apiFetch(`/api/pedidos?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar produtos.");
        }

        if (cancelado || requisicaoId !== requisicaoProdutosRef.current) {
          return;
        }

        const lista = Array.isArray(data.produtos) ? data.produtos : [];
        setProdutosCatalogo(lista);
        setCercaConfig(normalizarCercaVirtualApi(data.cercaVirtual ?? null));
        setFalhaLocalizacaoCerca(false);

        if (typeof data.regiaoId === "number" && data.regiaoId > 0) {
          setRegiaoIdResposta(data.regiaoId);
        }

        if (!exibirFormularioRef.current) {
          setLinhasPedido(criarLinhasPedidoIniciais(lista));
        }
      } catch (error) {
        console.error("ERRO MOBILE DETECTADO:", error);
        if (!cancelado && requisicaoId === requisicaoProdutosRef.current) {
          setProdutosCatalogo([]);
          setCercaConfig(null);
          setDentroPerimetro(null);
          if (!exibirFormularioRef.current) {
            setLinhasPedido({});
          }
          setErroValidacao(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os produtos da loja.",
          );
        }
      } finally {
        if (requisicaoId === requisicaoProdutosRef.current) {
          setCarregandoProdutos(false);
        }
      }
    }

    void carregarProdutos();

    return () => {
      cancelado = true;
    };
  }, [lojaIdNormalizado]);

  useEffect(() => {
    if (
      modoAdministrador ||
      !lojaSelecionada ||
      !cercaExigeValidacao ||
      !cercaConfig
    ) {
      if (!cercaExigeValidacao) {
        setFalhaLocalizacaoCerca(false);
        setLocalizacaoImprecisaCerca(false);
        setDentroPerimetro(null);
        setValidandoCheckInGps(false);
      }
      return;
    }

    let cancelado = false;
    setValidandoCheckInGps(true);
    setDentroPerimetro(null);
    setFalhaLocalizacaoCerca(false);
    setLocalizacaoImprecisaCerca(false);

    void (async () => {
      const validacao = await validarCheckInCercaVirtual(cercaConfig);

      if (cancelado) {
        return;
      }

      if (!validacao.permitido) {
        dentroPerimetroRef.current = false;
        setDentroPerimetro(false);
        setLocalizacaoImprecisaCerca(validacao.precisaoInvalida);
        setFalhaLocalizacaoCerca(
          !validacao.precisaoInvalida && validacao.bloqueadoCerca,
        );
        setErroValidacao(
          validacao.bloqueadoCerca || validacao.precisaoInvalida
            ? null
            : (validacao.erro ?? MENSAGEM_PEDIDO_BLOQUEADO_ENVIO),
        );
        setValidandoCheckInGps(false);
        return;
      }

      dentroPerimetroRef.current = true;
      setDentroPerimetro(true);
      setValidandoCheckInGps(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [
    cercaConfig,
    cercaExigeValidacao,
    chaveRevalidacaoCheckIn,
    lojaSelecionada,
    modoAdministrador,
  ]);

  useEffect(() => {
    return () => {
      pararMonitoramentoGps();
    };
  }, []);

  useEffect(() => {
    if (modoAdministrador || !lojaSelecionada) {
      pararMonitoramentoGps();
    }
  }, [lojaIdNormalizado, lojaSelecionada, modoAdministrador]);

  useEffect(() => {
    if (!pedidoBloqueadoCerca || modoAdministrador) {
      return;
    }

    setModalConferenciaAberto(false);

    if (exibirFormularioRef.current) {
      fecharFormularioPedidoRef.current();
    }
  }, [pedidoBloqueadoCerca, modoAdministrador]);

  useEffect(() => {
    if (modoAdministrador || !verificacaoConcluida || !abrirFormularioInicial) {
      return;
    }

    if (primeiroPedidoEnviado || pedidoExtraRealizado || limitePedidosAtingido) {
      limparParametrosPedidoNaUrl();
      return;
    }

    abrirFormularioPedidoRef.current();
  }, [
    abrirFormularioInicial,
    verificacaoConcluida,
    modoAdministrador,
    primeiroPedidoEnviado,
    pedidoExtraRealizado,
    limitePedidosAtingido,
  ]);

  useEffect(() => {
    if (modoAdministrador || !abrirFormularioInicial) {
      return;
    }

    rolarParaFormulario();
  }, [abrirFormularioInicial, modoAdministrador, exibirFormulario]);

  async function buscarControleRemoto(
    id: string,
  ): Promise<ControlePedidoLojaDia> {
    const response = await apiFetch(
      `/api/pedidos/controle-loja?lojaId=${encodeURIComponent(id)}`,
    );

    let dados: ControlePedidoLojaDia | { error?: string } | null = null;

    if (response.ok && response.status !== 204) {
      try {
        dados = await response.json();
      } catch (error) {
        console.error("Resposta não é um JSON válido", error);
      }
    }

    if (!response.ok) {
      const erroApi =
        dados && "error" in dados && typeof dados.error === "string"
          ? dados.error
          : "Não foi possível verificar os pedidos do dia.";

      throw new Error(erroApi);
    }

    if (!dados) {
      throw new Error("Não foi possível verificar os pedidos do dia.");
    }

    return dados as ControlePedidoLojaDia;
  }

  function aplicarControleLoja(remoto: ControlePedidoLojaDia | null) {
    const controle: ControlePedidoLojaDia = {
      pedidoPrincipalEnviado: remoto?.pedidoPrincipalEnviado ?? false,
      pedidoExtraRealizado: remoto?.pedidoExtraRealizado ?? false,
    };

    setPrimeiroPedidoEnviado(controle.pedidoPrincipalEnviado);
    setPedidoExtraRealizado(controle.pedidoExtraRealizado);

    return controle;
  }

  async function persistirControleEnvio(tipo: "principal" | "complementar") {
    try {
      const response = await apiFetch("/api/pedidos/controle-loja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojaId: lojaIdNormalizado, tipo }),
      });

      if (response.ok) {
        const data = (await response.json()) as ControlePedidoLojaDia;
        aplicarControleLoja(data);
      }
    } catch {
      // Controle será reconsultado na próxima troca de loja.
    }
  }

  useEffect(() => {
    if (ignorarProximaTrocaRef.current) {
      ignorarProximaTrocaRef.current = false;
      ultimaLojaRef.current = { id: lojaIdNormalizado, rotulo: lojaIdentificacao };
      lojaIdAnteriorRef.current = lojaIdNormalizado;
      ignorarAlertaInicialRef.current = true;
    }

    if (!lojaIdNormalizado) {
      setVerificandoControleLoja(false);
      setControleLojaCarregado(false);
      setErroControleLoja(null);
      setPrimeiroPedidoEnviado(false);
      setPedidoExtraRealizado(false);
      setExibirFormulario(false);
      setModoLancamento("normal");
      setContextoAlerta(null);
      lojaIdAnteriorRef.current = "";
      return;
    }

    const lojaMudou =
      lojaIdAnteriorRef.current !== "" &&
      lojaIdAnteriorRef.current !== lojaIdNormalizado;

    lojaParaVoltarRef.current = ultimaLojaRef.current;
    lojaIdAnteriorRef.current = lojaIdNormalizado;

    if (lojaMudou) {
      setErroValidacao(null);
      setMensagemSucesso(null);
      setModalConferenciaAberto(false);
      setModoLancamento("normal");
      setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogoRef.current));
      setContextoAlerta(null);
      setExibirFormulario(false);
    }

    if (modoAdministrador) {
      setPrimeiroPedidoEnviado(false);
      setPedidoExtraRealizado(false);
      setVerificandoControleLoja(false);
      setControleLojaCarregado(Boolean(lojaIdNormalizado));
      setErroControleLoja(null);
      return;
    }

    let cancelado = false;
    const requisicaoId = ++requisicaoControleRef.current;

    async function carregarControleLoja() {
      setVerificandoControleLoja(true);
      setControleLojaCarregado(false);
      setErroControleLoja(null);

      try {
        const remoto = await buscarControleRemoto(lojaIdNormalizado);

        if (cancelado || requisicaoId !== requisicaoControleRef.current) {
          return;
        }

        const controle = aplicarControleLoja(remoto);

        if (
          !ignorarAlertaInicialRef.current &&
          lojaMudou &&
          controle.pedidoPrincipalEnviado &&
          !controle.pedidoExtraRealizado
        ) {
          setContextoAlerta("troca_loja");
        }

        ignorarAlertaInicialRef.current = false;
        setControleLojaCarregado(true);
      } catch (error) {
        console.error("ERRO MOBILE DETECTADO:", error);
        if (!cancelado && requisicaoId === requisicaoControleRef.current) {
          // Falha de API: mantém a loja selecionada e libera o botão de novo pedido.
          setPrimeiroPedidoEnviado(false);
          setPedidoExtraRealizado(false);
          setControleLojaCarregado(true);
          setErroControleLoja(
            error instanceof Error
              ? error.message
              : "Não foi possível verificar os pedidos do dia.",
          );
        }
      } finally {
        if (requisicaoId === requisicaoControleRef.current) {
          setVerificandoControleLoja(false);
        }
      }
    }

    void carregarControleLoja();

    return () => {
      cancelado = true;
    };
  }, [lojaIdNormalizado, modoAdministrador]);

  useEffect(() => {
    ultimaLojaRef.current = {
      id: lojaIdNormalizado,
      rotulo: lojaIdentificacao,
    };
  }, [lojaIdNormalizado, lojaIdentificacao]);

  useEffect(() => {
    if (modoAdministrador) {
      setExibirFormulario(Boolean(lojaIdNormalizado));
    }
  }, [modoAdministrador, lojaIdNormalizado]);

  useEffect(() => {
    if (modoAdministrador || !verificacaoConcluida || !pedidoExtraInicial) {
      return;
    }

    if (!primeiroPedidoEnviado || pedidoExtraRealizado) {
      return;
    }

    void iniciarPedidoExtraRef.current();
  }, [
    pedidoExtraInicial,
    verificacaoConcluida,
    modoAdministrador,
    primeiroPedidoEnviado,
    pedidoExtraRealizado,
  ]);

  useEffect(() => {
    if (!contextoAlerta) {
      return;
    }

    window.requestAnimationFrame(() => {
      duplicadoAlertaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [contextoAlerta]);

  useEffect(() => {
    const form = salvarPedidoFormRef.current;
    if (!form) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      handleSalvarPedidoRef.current();
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [exibirTabela]);

  useEffect(() => {
    const form = pedidoExtraFormRef.current;
    if (!form) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      void iniciarPedidoExtraRef.current();
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [exibirBotaoPedidoExtra, primeiroPedidoEnviado, pedidoExtraRealizado]);

  useEffect(() => {
    const form = novoPedidoFormRef.current;
    if (!form) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      abrirFormularioPedidoRef.current();
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [exibirBotaoNovoPedido, primeiroPedidoEnviado, pedidoExtraRealizado]);

  useEffect(() => {
    const form = sairPedidoFormRef.current;
    if (!form) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      fecharFormularioPedidoRef.current();
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [exibirTabela]);

  useEffect(() => {
    if (!modoAdministrador || !lojaIdNormalizado) {
      return;
    }

    setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogo));
  }, [modoAdministrador, lojaIdNormalizado, produtosCatalogo]);

  useEffect(() => {
    if (!exibirFormulario) {
      return;
    }

    setLinhasPedido((atual) => {
      const base = criarLinhasPedidoIniciais(produtosCatalogo);
      const mesclado = { ...base };

      for (const [produtoId, campos] of Object.entries(atual)) {
        if (mesclado[produtoId]) {
          mesclado[produtoId] = { ...mesclado[produtoId], ...campos };
        }
      }

      return mesclado;
    });
  }, [produtosCatalogo, exibirFormulario]);

  function atualizarCampo(
    produtoId: string,
    campo: keyof CamposLinhaPedido,
    valor: string,
  ) {
    if (camposDesabilitados) {
      return;
    }

    if (modoLancamento === "complementar" && campo !== "pedido") {
      return;
    }

    setLinhasPedido((atual) => ({
      ...atual,
      [produtoId]: {
        ...atual[produtoId],
        [campo]: valor,
      },
    }));

    const chaveErro = chaveCampoFormulario(produtoId, campo);
    setFormErrors((atual) => {
      if (!atual[chaveErro]) {
        return atual;
      }

      const { [chaveErro]: _removido, ...restante } = atual;
      return restante;
    });
    setErroValidacao(null);
    setMensagemSucesso(null);
  }

  function handleSalvarPedido() {
    if (!pedidoLiberado || (!modoAdministrador && !exibirFormulario)) {
      return;
    }

    if (
      !modoAdministrador &&
      pedidoExtraRealizado &&
      modoLancamento === "complementar"
    ) {
      setExibirFormulario(false);
      return;
    }

    if (
      !modoAdministrador &&
      modoLancamento === "normal" &&
      primeiroPedidoEnviado
    ) {
      setExibirFormulario(false);
      setContextoAlerta("pedido_extra");
      return;
    }

    if (
      !modoAdministrador &&
      possuiValorNegativoNoCatalogo(produtosCatalogo, linhasPedido)
    ) {
      setErroValidacao(MENSAGEM_VALOR_NEGATIVO);
      return;
    }

    if (!modoAdministrador) {
      if (modoLancamento === "complementar" && otimizadoMobile) {
        const { erros, semItens } = validarPedidoExtraMobile(
          produtosCatalogo,
          linhasPedido,
        );

        if (semItens) {
          setFormErrors({});
          setErroValidacao(MENSAGEM_PEDIDO_EXTRA_SEM_ITENS);
          return;
        }

        if (Object.keys(erros).length > 0) {
          setFormErrors(erros);
          setErroValidacao(MENSAGEM_VALOR_NEGATIVO);
          return;
        }
      } else {
        const linhasParaValidar = linhasPedido;

        const errosCampos = validarErrosEstoquePedido(
          produtosCatalogo,
          linhasParaValidar,
          modoLancamento,
        );

        if (Object.keys(errosCampos).length > 0) {
          setFormErrors(errosCampos);
          setErroValidacao(MENSAGEM_ESTOQUE_PEDIDO_OBRIGATORIO);
          return;
        }
      }

      setFormErrors({});
    }

    setErroValidacao(null);
    setModalConferenciaAberto(true);
  }

  handleSalvarPedidoRef.current = handleSalvarPedido;

  function montarLinhasPayload() {
    return produtosCatalogo.map((produto) => {
      const campos = linhasPedido[produto.id] ?? {
        estoque: "",
        avaria: "",
        trocas: "",
        pedido: "",
      };

      return {
        produtoId: Number(produto.id),
        produtoCodigo: produto.codigoCiss,
        estoque: Number(campos.estoque || 0),
        avaria: Number(campos.avaria || 0),
        trocas: Number(campos.trocas || 0),
        pedido: Number(campos.pedido || 0),
      };
    });
  }

  async function handleConfirmarEnvio() {
    if (envioEmAndamentoRef.current) {
      return;
    }

    envioEmAndamentoRef.current = true;
    setSalvandoPedido(true);

    const tipoEnvio =
      modoLancamento === "complementar" ? "complementar" : "principal";

    setErroValidacao(null);

    try {
      const idPromotor = modoAdministrador ? promotorId : usuarioId;
      const idRegiao =
        regiaoId && regiaoId > 0 ? regiaoId : regiaoIdResposta;

      if (!idPromotor || !idRegiao || !lojaIdNormalizado) {
        throw new Error("Promotor, loja e região são obrigatórios.");
      }

      let coordenadasEnvio: {
        latitude: number;
        longitude: number;
        distanciaLojaMetros: number | null;
      } | null = null;

      if (!modoAdministrador) {
        const coordsEnvio = await obterCoordenadasGpsEnvioDefinitivo();
        const validacaoEnvio = validarEnvioDefinitivoPedido(
          cercaConfig,
          coordsEnvio,
        );

        if (!validacaoEnvio.permitido) {
          setModalConferenciaAberto(false);

          if (validacaoEnvio.precisaoInvalida) {
            setLocalizacaoImprecisaCerca(true);
            dentroPerimetroRef.current = false;
            setDentroPerimetro(false);
            setExibirFormulario(false);
            setModoLancamento("normal");
            setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogo));
            setErroValidacao(null);
          } else if (validacaoEnvio.bloqueadoCerca) {
            dentroPerimetroRef.current = false;
            setDentroPerimetro(false);
            setFalhaLocalizacaoCerca(true);
            setExibirFormulario(false);
            setModoLancamento("normal");
            setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogo));
            setErroValidacao(null);
          } else {
            dentroPerimetroRef.current = false;
            setDentroPerimetro(false);
            setFalhaLocalizacaoCerca(true);
            setExibirFormulario(false);
            setModoLancamento("normal");
            setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogo));
            setErroValidacao(
              validacaoEnvio.erro ?? MENSAGEM_PEDIDO_BLOQUEADO_ENVIO,
            );
          }

          return;
        }

        if (coordsEnvio) {
          coordenadasEnvio = {
            latitude: coordsEnvio.latitude,
            longitude: coordsEnvio.longitude,
            distanciaLojaMetros: validacaoEnvio.distanciaMetros,
          };
        }
      }

      const inicioVisita = obterInicioVisitaLoja(lojaIdNormalizado);

      const response = await apiFetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: idPromotor,
          lojaId: Number(lojaIdNormalizado),
          regiaoId: idRegiao,
          tipo: tipoEnvio,
          linhas: montarLinhasPayload(),
          ...(inicioVisita ? { inicio_visita: inicioVisita } : {}),
          ...(coordenadasEnvio
            ? {
                latitude_envio: coordenadasEnvio.latitude,
                longitude_envio: coordenadasEnvio.longitude,
                distancia_loja_metros: coordenadasEnvio.distanciaLojaMetros,
                latitude: coordenadasEnvio.latitude,
                longitude: coordenadasEnvio.longitude,
              }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível registrar o pedido.");
      }

      if (!modoAdministrador) {
        await persistirControleEnvio(tipoEnvio);
        limparInicioVisitaLoja(lojaIdNormalizado);
      }

      setModalConferenciaAberto(false);
      setModoLancamento("normal");
      setLinhasPedido(criarLinhasPedidoIniciais(produtosCatalogo));
      setExibirFormulario(modoAdministrador ? Boolean(lojaIdNormalizado) : false);
      setErroValidacao(null);

      if (modoAdministrador) {
        setMensagemSucesso(
          `Pedido ${data.pedido?.numeroAmigavelRotulo ?? `#${data.pedido?.id ?? ""}`} registrado para ${data.pedido?.regiaoNome ?? "a região selecionada"}. Status: ${STATUS_PEDIDO_AGUARDANDO}.`,
        );
      } else {
        setMensagemSucesso(
          tipoEnvio === "complementar"
            ? `Pedido extra ${data.pedido?.numeroAmigavelRotulo ?? `#${data.pedido?.id ?? ""}`} enviado! Status: ${STATUS_PEDIDO_AGUARDANDO}.`
            : `Pedido ${data.pedido?.numeroAmigavelRotulo ?? `#${data.pedido?.id ?? ""}`} enviado com sucesso! Status: ${STATUS_PEDIDO_AGUARDANDO}.`,
        );
      }
    } catch (error) {
      setModalConferenciaAberto(false);
      setErroValidacao(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pedido.",
      );
    } finally {
      envioEmAndamentoRef.current = false;
      setSalvandoPedido(false);
    }
  }

  async function iniciarPedidoExtra() {
    setErroValidacao(null);
    setMensagemSucesso(null);

    try {
      const response = await apiFetch(
        `/api/pedidos/principal-hoje?lojaId=${encodeURIComponent(lojaIdNormalizado)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível carregar o pedido principal.");
      }

      if (!data.linhas) {
        setPrimeiroPedidoEnviado(false);
        setPedidoExtraRealizado(false);
        setExibirFormulario(false);
        setModoLancamento("normal");
        setContextoAlerta(null);
        throw new Error(
          "Não encontramos o pedido principal de hoje nesta loja. Você pode iniciar um novo pedido.",
        );
      }

      setLinhasPedido(criarLinhasComplementares(data.linhas));
      setModoLancamento("complementar");
      setExibirFormulario(true);
      setContextoAlerta(null);
      rolarParaFormulario();
    } catch (error) {
      setErroValidacao(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o pedido extra.",
      );
    }
  }

  iniciarPedidoExtraRef.current = iniciarPedidoExtra;

  function fecharAlertaDuplicado() {
    setContextoAlerta(null);
  }

  function handleContinuarPedidoExtra() {
    void iniciarPedidoExtra();
    fecharAlertaDuplicado();
  }

  function handleVoltarAlertaDuplicado() {
    if (contextoAlerta === "troca_loja") {
      handleEscolherOutraLoja();
      return;
    }

    fecharAlertaDuplicado();
  }

  function handleEscolherOutraLoja() {
    ignorarProximaTrocaRef.current = true;
    pararMonitoramentoGps();
    onLojaChange(lojaParaVoltarRef.current);
    setExibirFormulario(false);
    setModoLancamento("normal");
    setLinhasPedido(criarLinhasPedidoIniciais());
    fecharAlertaDuplicado();
  }

  function atualizarLojaSelecionada(valor: string) {
    const id = String(valor ?? "").trim();
    setLojaIdLocal(id);
    salvarLojaIdSession(id);

    if (onSelectLojaId) {
      queueMicrotask(() => {
        onSelectLojaId(id);
      });
    }

    if (!id) {
      return;
    }

    const loja = resolverLojaPorValor(lojasDoSelect, id);
    onLojaChange({
      id: loja ? String(loja.id).trim() : id,
      rotulo: loja?.rotulo?.trim() || lojaIdentificacao || id,
      regiaoId: loja?.regiaoId,
    });
  }

  atualizarLojaSelecionadaRef.current = atualizarLojaSelecionada;

  function handleChangeSelectLoja(event: ChangeEvent<HTMLSelectElement>) {
    const valor = String(event.target.value ?? "").trim();

    if (!valor) {
      pararMonitoramentoGps();
    }

    atualizarLojaSelecionada(valor);
  }

  function sincronizarLojaDoSelectAoPerderFoco() {
    const elemento = selectLojaElementRef.current;
    if (!elemento) {
      return;
    }

    atualizarLojaSelecionada(String(elemento.value ?? "").trim());
  }

  const exibirSelectLoja =
    lojasDoSelect.length > 0 || tipoContrato === "MEI" || ignorarGeolocalizacao;

  return (
    <>
      <div
        className="relative z-0 rounded-2xl border bg-white p-3 shadow-sm sm:p-6"
        style={{ borderColor: brand.primaryLight }}
      >
        <div className="px-1 sm:px-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {exibirFormulario &&
            modoLancamento === "complementar" &&
            otimizadoMobile &&
            !modoAdministrador
              ? "Novo Pedido Extra"
              : "Novo Pedido Consignado"}
          </p>

          {exibirSelectLoja ? (
            <div className="relative z-10 mt-3 max-w-md">
              <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selecione a Loja Atual
              </p>

              <select
                id="loja-pedido"
                ref={selectLojaElementRef}
                defaultValue=""
                onChange={handleChangeSelectLoja}
                onBlur={sincronizarLojaDoSelectAoPerderFoco}
                className={
                  otimizadoMobile
                    ? portalSelectMobile
                    : "w-full rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-3 text-sm text-slate-800 outline-none focus:ring-2"
                }
                style={inputRingStyle}
              >
                <option value="">Selecione uma loja...</option>
                {lojasDoSelect.map((loja) => (
                  <option key={String(loja.id)} value={String(loja.id)}>
                    {loja.rotulo}
                  </option>
                ))}
              </select>
            </div>
          ) : lojaSelecionada ? (
            <p className="mt-2 text-sm font-medium text-slate-800">
              Loja: {lojaIdentificacao}
            </p>
          ) : null}

          {exibirFormulario &&
          !(otimizadoMobile && modoLancamento === "complementar") ? (
            <p className="mt-2 text-sm text-slate-600">
              {modoLancamento === "complementar"
                ? "Pedido complementar: estoque, avaria e trocas estão travados com os valores do primeiro lançamento. Informe apenas as novas quantidades de pedido."
                : "Digite os quantitativos diretamente nos campos. Você poderá revisar tudo antes do envio definitivo."}
            </p>
          ) : null}
        </div>

        {carregandoLojasVinculadas ? (
          <div className="mx-1 mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 sm:mx-0">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando lojas vinculadas...
          </div>
        ) : null}

        {erroCarregamentoLojas ? (
          <div
            role="alert"
            className="mx-1 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-800 sm:mx-0"
          >
            {erroCarregamentoLojas}
          </div>
        ) : null}

        {!carregandoLojasVinculadas &&
        !erroCarregamentoLojas &&
        lojasDoSelect.length === 0 &&
        !modoAdministrador ? (
          <div
            role="alert"
            className="mx-1 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-900 sm:mx-0"
          >
            Nenhuma loja vinculada ao seu cadastro. Solicite ao administrador a
            liberação de PDVs.
          </div>
        ) : null}

        {tipoContrato === "CLT" && !pedidoLiberado && !ignorarGeolocalizacao ? (
          <div
            className="mx-1 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0"
            role="alert"
          >
            🔒 Área Bloqueada: Promotores CLT precisam realizar o Check-in na
            loja antes de iniciar um pedido.
          </div>
        ) : null}

        {!lojaSelecionada && !modoAdministrador && uiClienteMontada ? (
          <p className="mx-1 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 sm:mx-0">
            Selecione a loja acima para liberar o botão de novo pedido.
          </p>
        ) : null}

        {uiClienteMontada && exibirCarregandoGenerico ? (
          <div className="mx-1 mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 sm:mx-0">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Carregando...</span>
          </div>
        ) : null}

        {uiClienteMontada &&
        lojaSelecionada &&
        !exibirFormulario &&
        !exibirBotaoNovoPedido &&
        !exibirBotaoPedidoExtra &&
        !modoAdministrador &&
        !exibirCarregandoGenerico &&
        limitePedidosAtingido ? (
          <div
            className="mx-1 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-900 sm:mx-0"
            role="alert"
          >
            {MENSAGEM_PEDIDO_EXTRA_BLOQUEADO}
          </div>
        ) : null}

        {lojaSelecionada && erroControleLoja && !modoAdministrador && uiClienteMontada ? (
          <p
            role="alert"
            className="mx-1 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-0"
          >
            {erroControleLoja}
          </p>
        ) : null}

        {uiClienteMontada && localizacaoImprecisaCerca && !modoAdministrador ? (
          <div
            role="alert"
            className="mx-1 mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-center sm:mx-0"
          >
            <p className="text-sm text-amber-900">
              {MENSAGEM_LOCALIZACAO_IMPRESA}
            </p>
            <p className="mt-2 text-xs text-amber-800">
              No celular: permissões do site → Localização → Exata.
            </p>
            <button
              type="button"
              onClick={revalidarCheckInCerca}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Tentar Novamente
            </button>
          </div>
        ) : null}

        {uiClienteMontada &&
        pedidoBloqueadoCerca &&
        !localizacaoImprecisaCerca ? (
          <div
            role="alert"
            className="mx-1 mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-5 text-center sm:mx-0"
          >
            <p className="text-lg font-bold text-red-800">
              {MENSAGEM_PEDIDO_BLOQUEADO}
            </p>
            <p className="mt-2 text-sm text-red-700">
              {MENSAGEM_PEDIDO_BLOQUEADO_SUBTITULO}
            </p>
          </div>
        ) : null}

        {!uiClienteMontada && !modoAdministrador && lojaSelecionada ? (
          <div className="mx-1 mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 sm:mx-0">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Carregando...</span>
          </div>
        ) : null}

        {uiClienteMontada && mensagemAguardandoAcao ? (
          <div className="mx-1 mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600 sm:mx-0">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{mensagemAguardandoAcao}</span>
          </div>
        ) : null}

        {uiClienteMontada && exibirBotaoNovoPedido ? (
          <form
            ref={novoPedidoFormRef}
            className="relative z-50 mx-0 mt-5 w-full"
          >
            <button
              type="button"
              disabled={botaoPedidoDesabilitado}
              onClick={() => {
                if (!botaoPedidoDesabilitado) {
                  abrirFormularioPedidoRef.current();
                }
              }}
              className={
                otimizadoMobile
                  ? `${portalCaixaAcaoMobile} box-border w-full rounded-2xl px-5 py-4 shadow-lg disabled:cursor-not-allowed disabled:opacity-60`
                  : "relative z-30 box-border flex min-h-14 w-full touch-manipulation items-center justify-center px-5 py-4 disabled:cursor-not-allowed disabled:opacity-60 sm:py-5"
              }
              style={CAIXA_TRACEJADA_STYLE}
            >
              {textoBotaoNovoPedido}
            </button>
          </form>
        ) : null}

        {uiClienteMontada && exibirBotaoPedidoExtra ? (
          <div className="mx-1 sm:mx-0">
            <form
              ref={pedidoExtraFormRef}
              className="relative z-30 mx-1 mt-6 w-full sm:mx-0"
            >
              <button
                type="button"
                onClick={() => {
                  void iniciarPedidoExtraRef.current();
                }}
                className={
                  otimizadoMobile
                    ? `${portalCaixaAcaoMobile} box-border w-full px-5 py-4`
                    : "relative z-30 box-border flex min-h-14 w-full touch-manipulation items-center justify-center px-5 py-4 sm:py-5"
                }
                style={CAIXA_TRACEJADA_STYLE}
              >
                + Pedido Extra
              </button>
            </form>
            <p className="mt-3 text-center text-sm text-slate-600">
              Inclua quantidades adicionais mantendo estoque, avaria e trocas do
              primeiro lançamento.
            </p>
          </div>
        ) : null}

        {modoLancamento === "complementar" &&
        exibirTabela &&
        !otimizadoMobile ? (
          <div
            className="mx-1 mt-4 rounded-xl border px-4 py-3 text-sm sm:mx-0"
            style={{
              borderColor: brand.primaryLight,
              backgroundColor: brand.primaryLight,
              color: brand.primary,
            }}
          >
            Pedido extra — estoque, avaria e trocas travados. Informe apenas o
            pedido adicional.
          </div>
        ) : null}

        {fluxoLojaPronto && carregandoProdutos && modoAdministrador ? (
          <div className="mx-1 mt-4 flex items-center gap-2 text-sm text-slate-500 sm:mx-0">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Carregando...</span>
          </div>
        ) : null}

        {fluxoLojaPronto &&
        !carregandoProdutos &&
        !exibirCarregandoGenerico &&
        produtosCatalogo.length === 0 ? (
          <p className="mx-1 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0">
            Nenhum produto ativo vinculado a esta loja. Solicite ao administrador
            a liberação do sortimento.
          </p>
        ) : null}

        {modoAdministrador && exibirTabela ? (
          <p className="mx-1 mt-4 text-sm text-slate-600 sm:mx-0">
            Tabela liberada para lançamento administrativo. Estoque é opcional e
            o pedido será registrado com a região selecionada.
          </p>
        ) : null}

        {exibirTabela ? (
          <div ref={formularioPedidoRef} id="formulario-pedido-mobile">
            {otimizadoMobile && modoLancamento === "complementar" ? (
              <FormularioPedidoExtraMobile
                produtos={produtosCatalogo}
                linhasPedido={linhasPedido}
                onAtualizarCampo={atualizarCampo}
                inputRingStyle={inputRingStyle}
                formErrors={formErrors}
              />
            ) : (
              <FormularioLancamentos
                produtos={produtosCatalogo}
                linhasPedido={linhasPedido}
                onAtualizarCampo={atualizarCampo}
                inputRingStyle={inputRingStyle}
                camposDesabilitados={false}
                modoLancamento={modoLancamento}
                otimizadoMobile={otimizadoMobile}
                formErrors={formErrors}
              />
            )}
          </div>
        ) : null}

        {mensagemSucesso ? (
          <p
            role="status"
            className="mx-1 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:mx-0"
          >
            {mensagemSucesso}
          </p>
        ) : null}

        {erroValidacao && !pedidoBloqueadoCerca ? (
          <p
            role="alert"
            className="mx-1 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-0"
          >
            {erroValidacao}
          </p>
        ) : null}

        {exibirTabela ? (
          <div className="relative z-30 mt-6 space-y-3 px-1 sm:px-0">
            <form ref={salvarPedidoFormRef} className="w-full">
              <button
                type="submit"
                disabled={
                  salvandoPedido ||
                  carregandoProdutos ||
                  produtosCatalogo.length === 0
                }
                className={`relative z-30 flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl text-white shadow-sm disabled:opacity-60 ${
                  otimizadoMobile ? portalBtnPrimarioMobile : "min-h-[48px] px-5 py-3.5 text-sm font-semibold"
                }`}
                style={{ backgroundColor: "#166534" }}
              >
                <Save className="h-4 w-4" />
                Salvar Pedido
              </button>
            </form>
            <form ref={sairPedidoFormRef} className="w-full">
              <button
                type="submit"
                className={`relative z-30 flex w-full touch-manipulation items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 ${
                  otimizadoMobile
                    ? portalBtnSecundarioMobile
                    : "min-h-[48px] rounded-xl px-5 py-3 text-sm font-semibold"
                }`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair sem salvar
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {modalConferenciaAberto ? (
        <ConferenciaLancamentosModal
          brand={brand}
          lojaIdentificacao={lojaIdentificacao}
          linhasPedido={linhasPedido}
          produtos={produtosCatalogo}
          onRever={() => setModalConferenciaAberto(false)}
          onConfirmar={handleConfirmarEnvio}
          confirmando={salvandoPedido}
          otimizadoMobile={otimizadoMobile}
          modoPedidoExtra={modoLancamento === "complementar"}
        />
      ) : null}

      {contextoAlerta && !modoAdministrador ? (
        <div ref={duplicadoAlertaRef}>
          <PedidoDuplicadoModal
            lojaIdentificacao={lojaIdentificacao}
            modo={contextoAlerta}
            onCriarComplementar={handleContinuarPedidoExtra}
            onEscolherOutraLoja={handleVoltarAlertaDuplicado}
            onFechar={() => setContextoAlerta(null)}
            otimizadoMobile={otimizadoMobile}
            inline={otimizadoMobile}
          />
        </div>
      ) : null}
    </>
  );
}
