"use client";

import { useEffect, useState } from "react";

/** Evita hidratação quebrada em acessos via IP de rede local (HTTP). */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
