/** Gradiente de cabeçalho dos painéis — respeita modo claro/escuro via CSS vars. */
export function gradienteCabecalhoPainel(corDestaqueLight: string): string {
  return `linear-gradient(135deg, ${corDestaqueLight} 0%, var(--surface) 70%)`;
}

export function gradienteCabecalhoPainelAdmin(
  corDestaqueLight: string,
): string {
  return `linear-gradient(135deg, ${corDestaqueLight} 0%, color-mix(in srgb, var(--surface) 90%, transparent) 55%, var(--surface) 100%)`;
}

export function gradienteCardRegiao(corPrimaria: string): string {
  return `linear-gradient(135deg, ${corPrimaria}14 0%, var(--surface) 100%)`;
}
