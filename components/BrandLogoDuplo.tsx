"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_MANAUS, BRAND_RIO_BRANCO } from "@/lib/identidade-gestao-lojas";

type BrandLogoDuploProps = {
  className?: string;
};

export function BrandLogoDuplo({ className = "h-12" }: BrandLogoDuploProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandLogo brand={BRAND_RIO_BRANCO} className="h-12 w-28" />
      <div aria-hidden="true" className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
      <BrandLogo brand={BRAND_MANAUS} className="h-12 w-28" />
    </div>
  );
}
