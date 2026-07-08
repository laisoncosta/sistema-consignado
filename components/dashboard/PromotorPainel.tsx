"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { HistoricoPedidos } from "@/components/dashboard/HistoricoPedidos";
import { NovoPedido, type TipoContrato } from "@/components/dashboard/NovoPedido";
import { PromotorNav } from "@/components/dashboard/PromotorNav";
import { VisitaGpsCheckin } from "@/components/dashboard/VisitaGpsCheckin";
import type { BrandTheme } from "@/lib/brands";
import { LOJA_PEDIDO_PADRAO, LOJA_PEDIDO_PADRAO_ID } from "@/lib/pedido";
import { obterAbaPortal } from "@/lib/portal-navigation";
import {
  montarTituloBoasVindas,
  TEXTO_ORIENTACAO_BOAS_VINDAS,
  type GeneroUsuario,
} from "@/lib/usuario";
import type { StatusVisita } from "@/lib/visita";

type PromotorPainelProps = {
  brand: BrandTheme;
  regiao: string;
  tipoContrato: TipoContrato;
  nomeUsuario: string;
  genero: GeneroUsuario;
  usuarioEmail: string;
  ignorarGeolocalizacao?: boolean;
};

export function PromotorPainel({
  brand,
  regiao,
  tipoContrato,
  nomeUsuario,
  genero,
  usuarioEmail,
  ignorarGeolocalizacao = false,
}: PromotorPainelProps) {
  const searchParams = useSearchParams();
  const abaAtiva = obterAbaPortal(searchParams);
  const [statusVisita, setStatusVisita] = useState<StatusVisita>(
    ignorarGeolocalizacao ? "em_andamento" : "disponivel",
  );
  const [lojaId, setLojaId] = useState(LOJA_PEDIDO_PADRAO_ID);
  const [lojaRotulo, setLojaRotulo] = useState(LOJA_PEDIDO_PADRAO);

  function handleLojaChange(loja: { id: string; rotulo: string }) {
    setLojaId(loja.id);
    setLojaRotulo(loja.rotulo);
  }

  return (
    <>
      <PromotorNav brand={brand} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div
          className="rounded-3xl border bg-white p-8 shadow-sm"
          style={{ borderColor: brand.primaryLight }}
        >
          <h2 className="text-2xl font-semibold text-slate-800">
            {montarTituloBoasVindas(nomeUsuario, genero)}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
            {TEXTO_ORIENTACAO_BOAS_VINDAS}
          </p>

          {tipoContrato === "CLT" &&
          abaAtiva === "novo-pedido" &&
          !ignorarGeolocalizacao ? (
            <VisitaGpsCheckin
              brand={brand}
              regiao={regiao}
              onStatusVisitaChange={setStatusVisita}
              onLojaAtualChange={handleLojaChange}
            />
          ) : null}
        </div>

        <div className="mt-6">
          {abaAtiva === "novo-pedido" ? (
            <NovoPedido
              brand={brand}
              tipoContrato={tipoContrato}
              statusVisita={statusVisita}
              lojaId={lojaId}
              lojaIdentificacao={lojaRotulo}
              usuarioEmail={usuarioEmail}
              onLojaChange={handleLojaChange}
              ignorarGeolocalizacao={ignorarGeolocalizacao}
            />
          ) : null}

          {abaAtiva === "historico" ? (
            <HistoricoPedidos brand={brand} usuarioEmail={usuarioEmail} />
          ) : null}
        </div>
      </main>
    </>
  );
}
