"use client";



import { useEffect, useRef } from "react";



import type { BrandTheme } from "@/lib/brands";

import {

  portalBtnPrimarioMobile,

  portalBtnSecundarioMobile,

} from "@/lib/portal-mobile-ui";

import {

  AVISO_CONFERENCIA,

  formatarValorConferencia,

  type CamposLinhaPedido,

  type LinhasPedidoForm,

  type ProdutoPedido,

} from "@/lib/pedido";



type ConferenciaLancamentosModalProps = {

  brand: BrandTheme;

  lojaIdentificacao: string;

  linhasPedido: LinhasPedidoForm;

  produtos: ProdutoPedido[];

  onRever: () => void;

  onConfirmar: () => void;

  confirmando?: boolean;

  otimizadoMobile?: boolean;

  inline?: boolean;

};



function linhaPossuiQuantidade(linha: CamposLinhaPedido): boolean {

  return (

    Number(linha.estoque || 0) > 0 ||

    Number(linha.avaria || 0) > 0 ||

    Number(linha.trocas || 0) > 0 ||

    Number(linha.pedido || 0) > 0

  );

}



export function ConferenciaLancamentosModal({

  brand,

  lojaIdentificacao,

  linhasPedido,

  produtos,

  onRever,

  onConfirmar,

  confirmando = false,

  otimizadoMobile = false,

  inline = false,

}: ConferenciaLancamentosModalProps) {

  const onReverRef = useRef(onRever);

  const onConfirmarRef = useRef(onConfirmar);

  const reverFormRef = useRef<HTMLFormElement>(null);

  const confirmarFormRef = useRef<HTMLFormElement>(null);



  onReverRef.current = onRever;

  onConfirmarRef.current = onConfirmar;



  useEffect(() => {

    const reverForm = reverFormRef.current;

    const confirmarForm = confirmarFormRef.current;

    if (!reverForm || !confirmarForm) {

      return;

    }



    const onReverSubmit = (event: SubmitEvent) => {

      event.preventDefault();

      onReverRef.current();

    };



    const onConfirmarSubmit = (event: SubmitEvent) => {

      event.preventDefault();

      onConfirmarRef.current();

    };



    reverForm.addEventListener("submit", onReverSubmit);

    confirmarForm.addEventListener("submit", onConfirmarSubmit);



    return () => {

      reverForm.removeEventListener("submit", onReverSubmit);

      confirmarForm.removeEventListener("submit", onConfirmarSubmit);

    };

  }, []);



  useEffect(() => {

    if (inline) {

      return;

    }



    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";



    return () => {

      document.body.style.overflow = overflowAnterior;

    };

  }, [inline]);



  const btnSecundario = otimizadoMobile

    ? `${portalBtnSecundarioMobile} w-full border-slate-300 bg-white text-slate-700 sm:w-auto`

    : "min-h-[48px] w-full touch-manipulation rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 sm:w-auto";



  const btnPrimario = otimizadoMobile

    ? `${portalBtnPrimarioMobile} text-white sm:min-h-11 sm:w-auto`

    : "min-h-[48px] w-full touch-manipulation rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm sm:w-auto";



  const produtosComLancamento = produtos.filter((produto) => {

    const linha = linhasPedido[produto.id] ?? {

      estoque: "",

      avaria: "",

      trocas: "",

      pedido: "",

    };



    return linhaPossuiQuantidade(linha);

  });



  const totaisConferencia = produtosComLancamento.reduce(

    (acc, produto) => {

      const linha = linhasPedido[produto.id] ?? {

        estoque: "",

        avaria: "",

        trocas: "",

        pedido: "",

      };



      acc.estoque += Number(linha.estoque || 0);

      acc.avaria += Number(linha.avaria || 0);

      acc.trocas += Number(linha.trocas || 0);

      acc.pedido += Number(linha.pedido || 0);



      return acc;

    },

    { estoque: 0, avaria: 0, trocas: 0, pedido: 0 },

  );



  const conteudo = (

    <div

      className={

        inline

          ? "flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"

          : "flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"

      }

    >

      <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">

        <h2

          id="conferencia-titulo"

          className="text-lg font-semibold text-slate-900"

        >

          Conferência de Lançamentos

        </h2>

        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">

          {AVISO_CONFERENCIA}

        </p>

        <p className="mt-3 text-sm font-semibold text-slate-800">

          Loja: {lojaIdentificacao}

        </p>

      </div>



      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">

        {produtosComLancamento.length === 0 ? (

          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">

            Nenhum lançamento com quantidade informada.

          </p>

        ) : (

          <div className="overflow-x-auto rounded-xl border border-slate-200">

            <table className="w-full min-w-[420px] border-collapse text-sm">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">

                  <th className="px-3 py-2.5">Produto</th>

                  <th className="px-3 py-2.5 text-center">Est.</th>

                  <th className="px-3 py-2.5 text-center">Av.</th>

                  <th className="px-3 py-2.5 text-center">Tr.</th>

                  <th className="px-3 py-2.5 text-center">Ped.</th>

                </tr>

              </thead>

              <tbody>

                {produtosComLancamento.map((produto) => {

                  const linha = linhasPedido[produto.id] ?? {

                    estoque: "",

                    avaria: "",

                    trocas: "",

                    pedido: "",

                  };



                  return (

                    <tr

                      key={produto.id}

                      className="border-b border-slate-100 last:border-b-0"

                    >

                      <td className="px-3 py-2.5 font-medium text-slate-900">

                        {produto.nome}

                      </td>

                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">

                        {formatarValorConferencia(linha.estoque)}

                      </td>

                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">

                        {formatarValorConferencia(linha.avaria)}

                      </td>

                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">

                        {formatarValorConferencia(linha.trocas)}

                      </td>

                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">

                        {formatarValorConferencia(linha.pedido)}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

              <tfoot>

                <tr className="border-t-2 border-slate-300 bg-slate-200">

                  <td
                    className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-800"
                  >

                    Totais

                  </td>

                  <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-900">

                    {totaisConferencia.estoque}

                  </td>

                  <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-900">

                    {totaisConferencia.avaria}

                  </td>

                  <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-900">

                    {totaisConferencia.trocas}

                  </td>

                  <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-900">

                    {totaisConferencia.pedido}

                  </td>

                </tr>

              </tfoot>

            </table>

          </div>

        )}

      </div>



      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

        <form ref={reverFormRef} className="w-full sm:w-auto">

          <button type="submit" className={btnSecundario}>

            Rever

          </button>

        </form>

        <form ref={confirmarFormRef} className="w-full sm:w-auto">

          <button

            type="submit"

            disabled={confirmando}

            className={btnPrimario}

            style={{ backgroundColor: brand.primary }}

          >

            {confirmando ? "Enviando..." : "Confirmar e Enviar"}

          </button>

        </form>

      </div>

    </div>

  );



  if (inline) {

    return (

      <div

        className="relative z-40 mx-1 mt-6 sm:mx-0"

        role="dialog"

        aria-modal="true"

        aria-labelledby="conferencia-titulo"

      >

        {conteudo}

      </div>

    );

  }



  return (

    <div

      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"

      role="dialog"

      aria-modal="true"

      aria-labelledby="conferencia-titulo"

    >

      {conteudo}

    </div>

  );

}


