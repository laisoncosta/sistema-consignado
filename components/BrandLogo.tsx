"use client";

import Image from "next/image";
import { useState } from "react";

import type { BrandTheme } from "@/lib/brands";

type BrandLogoProps = {
  brand: BrandTheme;
  className?: string;
};

export function BrandLogo({ brand, className = "h-16 w-48" }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-dashed px-4 text-center text-sm font-semibold tracking-wide ${className}`}
        style={{
          borderColor: brand.primary,
          color: brand.primary,
          backgroundColor: brand.primaryLight,
        }}
      >
        {brand.name}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={brand.logo}
        alt={`Logo ${brand.name}`}
        fill
        className="pointer-events-none object-contain object-center"
        priority
        onError={() => setHasError(true)}
      />
    </div>
  );
}
