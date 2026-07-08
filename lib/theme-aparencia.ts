export type ThemeAparencia = "light" | "dark";

export const THEME_APARENCIA_STORAGE_KEY = "sistema-consignado-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_APARENCIA_STORAGE_KEY}";var t=localStorage.getItem(k);var d=t==="dark";document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function themeAparenciaValido(valor: string | null): ThemeAparencia {
  return valor === "dark" ? "dark" : "light";
}

export function lerThemeAparenciaSalvo(): ThemeAparencia {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    return themeAparenciaValido(
      localStorage.getItem(THEME_APARENCIA_STORAGE_KEY),
    );
  } catch {
    return "light";
  }
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
