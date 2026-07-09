export type ThemeAparencia = "light" | "dark";

export const THEME_APARENCIA_STORAGE_KEY = "sistema-consignado-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_APARENCIA_STORAGE_KEY}";var t=localStorage.getItem(k);var d;if(t==="dark")d=true;else if(t==="light")d=false;else d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function themeAparenciaValido(valor: string | null): ThemeAparencia | null {
  if (valor === "dark") {
    return "dark";
  }

  if (valor === "light") {
    return "light";
  }

  return null;
}

export function preferenciaSistemaEscuro(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function lerThemeAparenciaSalvo(): ThemeAparencia | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return themeAparenciaValido(
      localStorage.getItem(THEME_APARENCIA_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function resolverThemeAparencia(): ThemeAparencia {
  const salvo = lerThemeAparenciaSalvo();

  if (salvo) {
    return salvo;
  }

  return preferenciaSistemaEscuro() ? "dark" : "light";
}

export function aplicarThemeAparenciaNoDocumento(theme: ThemeAparencia): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function salvarThemeAparencia(theme: ThemeAparencia): void {
  try {
    localStorage.setItem(THEME_APARENCIA_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
}

export function alternarThemeAparencia(atual: ThemeAparencia): ThemeAparencia {
  return atual === "dark" ? "light" : "dark";
}
