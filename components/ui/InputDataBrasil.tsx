"use client";

import { Calendar } from "lucide-react";
import { useRef, type CSSProperties, type InputHTMLAttributes } from "react";

import { formatarDataBrasil } from "@/lib/data-brasil";

type InputDataBrasilProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  style?: CSSProperties;
};

function limitarIso(valor: string, min?: string, max?: string): string {
  let resultado = valor;

  if (max && resultado > max) {
    resultado = max;
  }

  if (min && resultado < min) {
    resultado = min;
  }

  return resultado;
}

export function InputDataBrasil({
  value,
  onChange,
  min,
  max,
  className = "",
  style,
  id,
  "aria-label": ariaLabel,
}: InputDataBrasilProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const exibicao = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatarDataBrasil(value)
    : "";

  function abrirCalendario() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Alguns navegadores bloqueiam showPicker fora de gesto direto no input.
      }
    }

    input.focus({ preventScroll: true });
    input.click();
  }

  return (
    <div
      className={`relative flex min-h-[2.75rem] cursor-pointer items-center focus-within:border-transparent focus-within:ring-2 ${className}`}
      style={style}
    >
      <span
        className="pointer-events-none z-10 flex-1 truncate text-inherit"
        aria-hidden="true"
      >
        {exibicao}
      </span>

      <button
        type="button"
        tabIndex={-1}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          abrirCalendario();
        }}
        className="relative z-30 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label={
          ariaLabel ? `Abrir calendário — ${ariaLabel}` : "Abrir calendário"
        }
      >
        <Calendar className="h-4 w-4" />
      </button>

      <input
        ref={inputRef}
        id={id}
        type="date"
        lang="pt-BR"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        tabIndex={0}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-[0.01]"
        onChange={(event) => {
          onChange(limitarIso(event.target.value, min, max));
        }}
      />
    </div>
  );
}
