import { getHomePath, normalizeRole } from "@/lib/rbac";

export type BrandKey = "viva" | "buriti";

export type BrandTheme = {
  key: BrandKey;
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  logo: string;
  gradient: string;
};

export function getBrandByRegiao(regiaoNome: string): BrandTheme {
  if (regiaoNome.toLowerCase().includes("rio branco")) {
    return {
      key: "buriti",
      name: "Buriti",
      primary: "#C8102E",
      primaryHover: "#a50d26",
      primaryLight: "rgba(200, 16, 46, 0.12)",
      logo: "/logo-buriti.png",
      gradient: "rgba(200, 16, 46, 0.18)",
    };
  }

  return {
    key: "viva",
    name: "Viva Ecológicos",
    primary: "#499F4D",
    primaryHover: "#3d8741",
    primaryLight: "rgba(73, 159, 77, 0.12)",
    logo: "/logo-viva.png",
    gradient: "rgba(73, 159, 77, 0.22)",
  };
}

export function getBrandFromEmailHint(email: string): BrandTheme | null {
  const lower = email.trim().toLowerCase();
  if (!lower) return null;

  if (
    lower.includes("buriti") ||
    lower.includes("rio.branco") ||
    lower.includes("@buriti")
  ) {
    return getBrandByRegiao("Rio Branco");
  }

  if (lower.includes("viva") || lower.includes("@gmail")) {
    return getBrandByRegiao("Manaus");
  }

  return null;
}

export function getRedirectPath(funcao: string): string {
  const role = normalizeRole(funcao);
  return role ? getHomePath(role) : "/dashboard/portal-pedidos";
}
