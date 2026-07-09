/** Classes reutilizáveis de formulário — usam variáveis CSS do tema (claro/escuro). */

export const classePainelLateral =
  "relative flex h-full w-full max-w-2xl flex-col bg-[var(--surface)] shadow-2xl dark:border-l dark:border-[var(--border)]";

export const classeCabecalhoPainel = "border-b px-6 py-5";

export const classeSubtituloPainel =
  "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]";

export const classeTituloPainel =
  "mt-1 text-xl font-semibold text-[var(--foreground)]";

export const classeBotaoFecharPainel =
  "rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]";

export const classeSecaoFormulario =
  "space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5";

export const classeSecaoFormularioCompacta =
  "rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5";

export const classeTituloSecao =
  "text-sm font-semibold text-[var(--foreground)]";

export const classeTituloSecaoComMargem =
  "mb-4 text-sm font-semibold text-[var(--foreground)]";

export const classeLabelCampo =
  "mb-2 block text-sm font-medium text-[var(--foreground)]";

export const classeInput =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-transparent focus:ring-2";

export const classeInputDesabilitado =
  "w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--muted)]";

export const classeRodapePainel = "border-t border-[var(--border)] px-6 py-5";

export const classeBotaoSecundario =
  "flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:opacity-60";

export const classeBotaoMarcarTodos =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]";

export const classeTextoAuxiliar = "text-xs text-[var(--muted)]";

export const classeItemCheckbox =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 transition hover:border-[var(--border)] hover:bg-[var(--surface)]";

export const classeTextoItemCheckbox =
  "truncate text-sm font-medium text-[var(--foreground)]";

export const classeVazioTracejado =
  "rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]";

export const classeErroFormulario =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300";

export const classeTituloLocalizacao =
  "mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]";
