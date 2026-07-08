import type { FiltroRegiaoProduto } from "@/lib/admin-produtos";
import { getBrandByRegiao, type BrandTheme } from "@/lib/brands";

export const BRAND_MANAUS = getBrandByRegiao("Manaus");
export const BRAND_RIO_BRANCO = getBrandByRegiao("Rio Branco");

export function brandPorFiltroLoja(filtro: FiltroRegiaoProduto): BrandTheme {
  if (filtro === "manaus") {
    return BRAND_MANAUS;
  }

  if (filtro === "rio-branco") {
    return BRAND_RIO_BRANCO;
  }

  return BRAND_MANAUS;
}

export function tituloGestaoLojas(filtro: FiltroRegiaoProduto): string {
  if (filtro === "manaus") {
    return "Gestão de Lojas - Manaus";
  }

  if (filtro === "rio-branco") {
    return "Gestão de Lojas - Acre";
  }

  return "Gestão de Lojas";
}

export function tituloRegiaoHeader(filtro: FiltroRegiaoProduto): string {
  if (filtro === "manaus") {
    return "Amazonas - Manaus";
  }

  if (filtro === "rio-branco") {
    return "Acre - Rio Branco";
  }

  return "Amazonas e Acre";
}

export function tituloRegiaoHeaderPorSessao(regiaoNome: string): string {
  if (regiaoNome.toLowerCase().includes("rio branco")) {
    return "Acre - Rio Branco";
  }

  return "Amazonas - Manaus";
}

export function corAbaRegiaoLoja(filtro: FiltroRegiaoProduto): string {
  if (filtro === "manaus") {
    return BRAND_MANAUS.primary;
  }

  if (filtro === "rio-branco") {
    return BRAND_RIO_BRANCO.primary;
  }

  return "#475569";
}
