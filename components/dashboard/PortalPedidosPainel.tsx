"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HistoricoPedidos } from "@/components/dashboard/HistoricoPedidos";
import { NovoPedido, type TipoContrato } from "@/components/dashboard/NovoPedido";
import {
  PortalPedidosAdminFiltros,
  type PromotorResumo,
  type RegiaoResumo,
  type SelecaoPortalAdmin,
} from "@/components/dashboard/PortalPedidosAdminFiltros";
import { PromotorNav } from "@/components/dashboard/PromotorNav";
import { apiFetch } from "@/lib/api-client";
import type { BrandTheme } from "@/lib/brands";
import { CHECKIN_GPS_OBRIGATORIO } from "@/lib/pedido";
import type { LojaPortalResumo } from "@/lib/portal-lojas";
import { normalizarIdLoja, idsLojaEquivalentes } from "@/lib/portal-loja-id";
import { montarSaudacaoPortal, type GeneroUsuario } from "@/lib/usuario";
import type { StatusVisita } from "@/lib/visita";

type LojaPortal = {
  id: string;
  rotulo: string;
  regiaoId: number;
};

type PortalPedidosPainelProps = {
  brand: BrandTheme;
  regiao: string;
  tipoContrato: TipoContrato;
  nomeUsuario: string;
  genero: GeneroUsuario;
  usuarioEmail: string;
  usuarioId: number;
  regiaoId: number;
  modoGestaoAdministrativa?: boolean;
  lojasIniciais?: LojaPortalResumo[];
  abrirFormularioInicial?: boolean;
  pedidoExtraInicial?: boolean;
  abaAtiva?: "novo-pedido" | "historico";
};

function normalizarLojaPortal(
  loja: { id: string | number; rotulo: string; regiaoId?: number },
  regiaoFallback: number,
): LojaPortal {
  return {
    id: normalizarIdLoja(loja.id),
    rotulo: loja.rotulo.trim(),
    regiaoId: Number(loja.regiaoId) || regiaoFallback,
  };
}

export function PortalPedidosPainel({
  brand,
  regiao,
  tipoContrato,
  nomeUsuario,
  genero,
  usuarioEmail,
  usuarioId,
  regiaoId,
  modoGestaoAdministrativa = false,
  lojasIniciais = [],
  abrirFormularioInicial = false,
  pedidoExtraInicial = false,
  abaAtiva: abaAtivaProp = "novo-pedido",
}: PortalPedidosPainelProps) {
  const lojasIniciaisPortal = useMemo(
    () =>
      lojasIniciais.map((loja) => normalizarLojaPortal(loja, regiaoId)),
    [lojasIniciais, regiaoId],
  );

  const abaAtiva = abaAtivaProp;
  const lojasFetchIniciadoRef = useRef(false);
  const lojasSnapshotRef = useRef<LojaPortal[]>(lojasIniciaisPortal);
  const lojaIdUsuarioRef = useRef("");

  const [statusVisita] = useState<StatusVisita>(
    CHECKIN_GPS_OBRIGATORIO ? "disponivel" : "em_andamento",
  );

  const [lojaId, setLojaId] = useState("");
  const [lojaRotulo, setLojaRotulo] = useState("");
  const [regiaoIdAtiva, setRegiaoIdAtiva] = useState(0);
  const [emailContexto, setEmailContexto] = useState(usuarioEmail);
  const [promotorContexto, setPromotorContexto] = useState<PromotorResumo | null>(
    null,
  );
  const [regiaoContexto, setRegiaoContexto] = useState<RegiaoResumo | null>(null);
  const [lojasVinculadas, setLojasVinculadas] = useState<LojaPortal[]>(
    lojasIniciaisPortal,
  );
  const [carregandoLojas, setCarregandoLojas] = useState(
    !modoGestaoAdministrativa && lojasIniciaisPortal.length === 0,
  );
  const [erroLojas, setErroLojas] = useState<string | null>(null);
  const [catalogoLojasPronto, setCatalogoLojasPronto] = useState(
    lojasIniciaisPortal.length > 0,
  );

  const commitLojas = useCallback((novas: LojaPortal[]) => {
    if (novas.length === 0) {
      return;
    }

    lojasSnapshotRef.current = novas;
    setLojasVinculadas(novas);
    setCatalogoLojasPronto(true);
    setCarregandoLojas(false);
  }, []);

  const lojasParaSelect = useMemo(() => {
    if (lojasVinculadas.length > 0) {
      lojasSnapshotRef.current = lojasVinculadas;
      return lojasVinculadas;
    }

    return lojasSnapshotRef.current;
  }, [lojasVinculadas]);

  useEffect(() => {
    if (modoGestaoAdministrativa) {
      return;
    }

    if (lojasIniciaisPortal.length > 0) {
      commitLojas(lojasIniciaisPortal);
      return;
    }

    if (lojasFetchIniciadoRef.current || catalogoLojasPronto) {
      return;
    }

    lojasFetchIniciadoRef.current = true;
    const controller = new AbortController();
    let cancelado = false;

    async function carregarLojas() {
      setCarregandoLojas(true);
      setErroLojas(null);

      try {
        const response = await apiFetch("/api/portal/lojas", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar lojas.");
        }

        const lojas: LojaPortal[] = Array.isArray(data.lojas)
          ? data.lojas.map(
              (loja: { id: string | number; rotulo: string; regiaoId?: number }) =>
                normalizarLojaPortal(loja, regiaoId),
            )
          : [];

        if (!cancelado && lojas.length > 0) {
          commitLojas(lojas);
        } else if (!cancelado) {
          setErroLojas("Nenhuma loja vinculada ao seu cadastro.");
        }
      } catch (error) {
        if (cancelado || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.error("ERRO MOBILE DETECTADO:", error);

        if (!cancelado) {
          setErroLojas(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as lojas vinculadas.",
          );
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
      controller.abort();
    };
  }, [
    modoGestaoAdministrativa,
    lojasIniciaisPortal,
    regiaoId,
    commitLojas,
    catalogoLojasPronto,
  ]);

  const aplicarLojaId = useCallback(
    (valor: string, opcoes?: { permitirLimpar?: boolean }) => {
      const idNormalizado = normalizarIdLoja(valor);

      if (!idNormalizado) {
        if (lojaIdUsuarioRef.current && !opcoes?.permitirLimpar) {
          return;
        }

        lojaIdUsuarioRef.current = "";
        setLojaId("");
        setLojaRotulo("");
        return;
      }

      const lojaEncontrada = lojasSnapshotRef.current.find((item) =>
        idsLojaEquivalentes(item.id, idNormalizado),
      );
      const idFinal = lojaEncontrada
        ? normalizarIdLoja(lojaEncontrada.id)
        : idNormalizado;

      lojaIdUsuarioRef.current = idFinal;
      setLojaId(idFinal);
      setLojaRotulo(lojaEncontrada?.rotulo.trim() ?? idFinal);

      if (lojaEncontrada?.regiaoId && lojaEncontrada.regiaoId > 0) {
        setRegiaoIdAtiva(lojaEncontrada.regiaoId);
      }
    },
    [],
  );

  const handleSelectLojaId = useCallback(
    (valor: string) => {
      const idNormalizado = normalizarIdLoja(valor);
      aplicarLojaId(valor, { permitirLimpar: !idNormalizado });
    },
    [aplicarLojaId],
  );

  const handleLojaChange = useCallback(
    (loja: { id: string; rotulo: string; regiaoId?: number }) => {
      handleSelectLojaId(String(loja.id ?? ""));
    },
    [handleSelectLojaId],
  );

  const handleSelecaoAdmin = useCallback(
    (selecao: SelecaoPortalAdmin) => {
      setRegiaoContexto(selecao.regiao);
      setPromotorContexto(selecao.promotor);
      setEmailContexto(selecao.promotor?.email ?? usuarioEmail);

      if (selecao.loja) {
        aplicarLojaId(String(selecao.loja.id));
        setLojaRotulo(selecao.loja.rotulo);
        return;
      }

      aplicarLojaId("", { permitirLimpar: true });
    },
    [aplicarLojaId, usuarioEmail],
  );

  const lojaSelecionadaAdmin = Boolean(modoGestaoAdministrativa && lojaId);
  const exibirNovoPedidoPromotor = !modoGestaoAdministrativa;

  const brandContexto =
    regiaoContexto != null
      ? {
          ...brand,
          primary: regiaoContexto.primary,
          primaryLight: regiaoContexto.primaryLight,
          name: regiaoContexto.rotulo,
        }
      : brand;

  return (
    <>
      <div className="relative z-30">
        <PromotorNav
          brand={brandContexto}
          otimizadoMobile
        />
      </div>

      <main className="relative z-0 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {modoGestaoAdministrativa ? (
          <div className="space-y-6">
            <PortalPedidosAdminFiltros
              brand={brand}
              onSelecaoChange={handleSelecaoAdmin}
              otimizadoMobile
            />

            {abaAtiva === "novo-pedido" && lojaSelecionadaAdmin ? (
              <NovoPedido
                brand={brandContexto}
                tipoContrato={tipoContrato}
                statusVisita="em_andamento"
                lojaId={lojaId}
                lojaIdentificacao={lojaRotulo}
                usuarioEmail={emailContexto}
                onLojaChange={handleLojaChange}
                modoAdministrador
                regiaoId={regiaoContexto?.id}
                promotorId={promotorContexto?.id}
                otimizadoMobile
              />
            ) : null}

            {abaAtiva === "novo-pedido" && !lojaSelecionadaAdmin ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:px-6">
                Selecione a região, o promotor e a loja para visualizar a tabela
                de lançamentos.
              </div>
            ) : null}

            {abaAtiva === "historico" ? (
              <HistoricoPedidos
                brand={brandContexto}
                usuarioEmail={
                  promotorContexto?.email ?? emailContexto ?? usuarioEmail
                }
                regiaoNome={regiaoContexto?.rotulo ?? regiao}
                otimizadoMobile
              />
            ) : null}
          </div>
        ) : (
          <>
            {abaAtiva === "novo-pedido" ? (
              <div
                className="pointer-events-none relative z-0 rounded-3xl border bg-white p-4 shadow-sm sm:p-8"
                style={{ borderColor: brand.primaryLight }}
              >
                <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">
                  {montarSaudacaoPortal(nomeUsuario, genero)}
                </h2>
              </div>
            ) : null}

            <div className={abaAtiva === "novo-pedido" ? "relative z-10 mt-4 sm:mt-6" : "mt-4"}>
              {abaAtiva === "novo-pedido" ? (
                <>
                  {carregandoLojas &&
                  !catalogoLojasPronto &&
                  lojasParaSelect.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                      Carregando lojas vinculadas...
                    </div>
                  ) : null}

                  {erroLojas && lojasParaSelect.length === 0 ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-800">
                      {erroLojas}
                    </div>
                  ) : null}

                  {exibirNovoPedidoPromotor ? (
                    <NovoPedido
                      key="portal-novo-pedido-promotor"
                      brand={brand}
                      tipoContrato={tipoContrato}
                      statusVisita={statusVisita}
                      lojaId={lojaId}
                      lojaIdentificacao={lojaRotulo}
                      usuarioEmail={usuarioEmail}
                      onLojaChange={handleLojaChange}
                      onSelectLojaId={handleSelectLojaId}
                      usuarioId={usuarioId}
                      regiaoId={regiaoIdAtiva > 0 ? regiaoIdAtiva : regiaoId}
                      lojasVinculadas={lojasParaSelect}
                      ignorarGeolocalizacao={!CHECKIN_GPS_OBRIGATORIO}
                      otimizadoMobile
                      abrirFormularioInicial={abrirFormularioInicial}
                      pedidoExtraInicial={pedidoExtraInicial}
                      erroCarregamentoLojas={
                        erroLojas && lojasParaSelect.length === 0
                          ? erroLojas
                          : null
                      }
                      carregandoLojasVinculadas={
                        carregandoLojas &&
                        !catalogoLojasPronto &&
                        lojasParaSelect.length === 0
                      }
                    />
                  ) : null}
                </>
              ) : null}

              {abaAtiva === "historico" ? (
                <HistoricoPedidos
                  brand={brand}
                  usuarioEmail={usuarioEmail}
                  regiaoNome={regiao}
                  lojas={lojasParaSelect}
                  otimizadoMobile
                />
              ) : null}
            </div>
          </>
        )}
      </main>
    </>
  );
}
