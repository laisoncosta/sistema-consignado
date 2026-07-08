"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

import { MENSAGEM_PEDIDO_DUPLICADO } from "@/lib/pedido";
import {
  portalBtnPrimarioMobile,
  portalBtnSecundarioMobile,
} from "@/lib/portal-mobile-ui";

type PedidoDuplicadoModalProps = {
  lojaIdentificacao: string;
  modo?: "troca_loja" | "pedido_extra";
  onCriarComplementar: () => void;
  onEscolherOutraLoja: () => void;
  onFechar?: () => void;
  otimizadoMobile?: boolean;
  inline?: boolean;
};

export function PedidoDuplicadoModal({
  lojaIdentificacao,
  modo = "pedido_extra",
  onCriarComplementar,
  onEscolherOutraLoja,
  onFechar,
  otimizadoMobile = false,
  inline = false,
}: PedidoDuplicadoModalProps) {
  const onCriarRef = useRef(onCriarComplementar);
  const onVoltarRef = useRef(onEscolherOutraLoja);
  const criarFormRef = useRef<HTMLFormElement>(null);
  const voltarFormRef = useRef<HTMLFormElement>(null);

  onCriarRef.current = onCriarComplementar;
  onVoltarRef.current = onEscolherOutraLoja;

  useEffect(() => {
    const criarForm = criarFormRef.current;
    const voltarForm = voltarFormRef.current;
    if (!criarForm || !voltarForm) {
      return;
    }

    const onCriarSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      onCriarRef.current();
    };

    const onVoltarSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      onVoltarRef.current();
    };

    criarForm.addEventListener("submit", onCriarSubmit);
    voltarForm.addEventListener("submit", onVoltarSubmit);

    return () => {
      criarForm.removeEventListener("submit", onCriarSubmit);
      voltarForm.removeEventListener("submit", onVoltarSubmit);
    };
  }, []);

  const btnSecundario = otimizadoMobile
    ? `${portalBtnSecundarioMobile} w-full border-slate-300 bg-white text-slate-700 sm:w-auto`
    : "min-h-[48px] w-full touch-manipulation rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 sm:w-auto";

  const btnPrimario = otimizadoMobile
    ? `${portalBtnPrimarioMobile} text-white sm:min-h-11 sm:w-auto`
    : "min-h-[48px] w-full touch-manipulation rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm sm:w-auto";

  const conteudo = (
    <div
      className={
        inline
          ? "w-full rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
          : "w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="pedido-duplicado-titulo"
            className="text-lg font-semibold text-slate-900"
          >
            Lançamento existente
          </h2>
          <p className="mt-1 text-sm text-slate-600">{lojaIdentificacao}</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-slate-700 sm:text-base">
        {MENSAGEM_PEDIDO_DUPLICADO}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
        <form ref={criarFormRef} className="w-full sm:w-auto">
          <button
            type="submit"
            className={btnPrimario}
            style={{ backgroundColor: "#166534" }}
          >
            Continuar para Pedido Extra
          </button>
        </form>
        <form ref={voltarFormRef} className="w-full sm:w-auto">
          <button type="submit" className={btnSecundario}>
            {modo === "troca_loja"
              ? "Voltar / Escolher outra Loja"
              : "Voltar"}
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
        aria-labelledby="pedido-duplicado-titulo"
      >
        {conteudo}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pedido-duplicado-titulo"
      onClick={() => onFechar?.()}
    >
      {conteudo}
    </div>
  );
}
