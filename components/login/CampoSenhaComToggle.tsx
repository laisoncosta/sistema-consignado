"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useIsMounted } from "@/lib/use-is-mounted";

type CampoSenhaComToggleProps = {
  id: string;
  name: string;
  value?: string;
  onChange?: (valor: string) => void;
  placeholder: string;
  autoComplete: string;
  inputRingStyle: React.CSSProperties;
  isMounted?: boolean;
};

export function CampoSenhaComToggle({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputRingStyle,
  isMounted: isMountedProp,
}: CampoSenhaComToggleProps) {
  const isMountedHook = useIsMounted();
  const isMounted = isMountedProp ?? isMountedHook;
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const controlado = value !== undefined && onChange !== undefined;

  return (
    <div className="campo-senha-app flex items-stretch gap-2">
      <input
        id={id}
        name={name}
        type={isMounted && mostrarSenha ? "text" : "password"}
        autoComplete={autoComplete}
        {...(controlado
          ? { value, onChange: (event) => onChange(event.target.value) }
          : {})}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/30 sm:text-sm"
        style={inputRingStyle}
        required
      />
      {isMounted ? (
        <button
          type="button"
          aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setMostrarSenha((atual) => !atual)}
          className="h-12 min-w-12 shrink-0 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {mostrarSenha ? (
            <EyeOff className="h-5 w-5 text-gray-500" />
          ) : (
            <Eye className="h-5 w-5 text-gray-500" />
          )}
        </button>
      ) : null}
    </div>
  );
}
