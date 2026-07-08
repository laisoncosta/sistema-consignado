"use client";

import { useEffect } from "react";

const HYDRATION_PATTERNS = [
  /hydration/i,
  /did not match/i,
  /Text content does not match/i,
  /server rendered HTML/i,
];

export function HydrationErrorLogger({ area = "app" }: { area?: string }) {
  useEffect(() => {
    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      const texto = args
        .map((arg) => (typeof arg === "string" ? arg : String(arg)))
        .join(" ");

      if (HYDRATION_PATTERNS.some((pattern) => pattern.test(texto))) {
        originalError.call(
          console,
          `[HydrationError:${area}]`,
          ...args,
        );
      }

      originalError.call(console, ...args);
    };

    return () => {
      console.error = originalError;
    };
  }, [area]);

  return null;
}
