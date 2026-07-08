import { Leaf } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import type { BrandTheme } from "@/lib/brands";

export const REMEMBER_EMAIL_KEY = "login-remember-email";

export const BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1550358864-518f202c02ba?auto=format&fit=crop&q=80&w=1920";

export function BrandPill({
  label,
  labelClassName,
}: {
  label: string;
  labelClassName: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur-sm">
      <Leaf
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-emerald-600"
        strokeWidth={2.25}
      />
      <span className={`text-xs font-bold uppercase tracking-wider ${labelClassName}`}>
        {label}
      </span>
    </div>
  );
}

export function LoginBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-green-900/30 to-slate-900/40 backdrop-blur-[1px]"
      />
    </>
  );
}

export function LoginGlassCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 w-full max-w-md">
      <div className="rounded-3xl border border-white/40 bg-white/85 px-8 py-10 shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

export function LoginBrandHeader() {
  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-3">
        <BrandPill label="BURITI" labelClassName="text-red-600" />
        <div className="h-6 w-px bg-slate-400/30" aria-hidden="true" />
        <BrandPill label="VIVA" labelClassName="text-emerald-600" />
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-800 sm:text-[1.65rem]">
        Sistema integrado de Pedidos Consignados
      </h1>
    </>
  );
}

export function LoginFieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
    >
      {children}
    </label>
  );
}

export function LoginPrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-700 hover:to-green-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function LoginSecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function LoginTextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-manipulation text-xs font-medium text-emerald-700 hover:text-emerald-800"
    >
      {children}
    </button>
  );
}

export function LoginErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
      {message}
    </div>
  );
}

export function LoginSuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 backdrop-blur-sm">
      {message}
    </div>
  );
}

export function criarInputRingStyle(brand: BrandTheme): CSSProperties {
  return { "--tw-ring-color": brand.primary };
}

export type AuthView =
  | "login"
  | "cadastro"
  | "recuperar"
  | "recuperar-enviado"
  | "pendente";
