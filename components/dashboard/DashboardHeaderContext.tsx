"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BrandTheme } from "@/lib/brands";

type DashboardHeaderState = {
  tituloRegiao: string;
  brandAtivo: BrandTheme;
};

type DashboardHeaderContextValue = {
  setHeaderState: (patch: Partial<DashboardHeaderState>) => void;
  resetHeaderState: () => void;
  brandAtivo: BrandTheme;
  tituloRegiao: string;
};

const DashboardHeaderContext = createContext<DashboardHeaderContextValue | null>(
  null,
);

type DashboardHeaderProviderProps = {
  children: ReactNode;
  tituloRegiaoInicial: string;
  brandInicial: BrandTheme;
};

export function DashboardHeaderProvider({
  children,
  tituloRegiaoInicial,
  brandInicial,
}: DashboardHeaderProviderProps) {
  const estadoInicial = useMemo(
    () => ({
      tituloRegiao: tituloRegiaoInicial,
      brandAtivo: brandInicial,
    }),
    [tituloRegiaoInicial, brandInicial],
  );

  const [state, setState] = useState(estadoInicial);

  const setHeaderState = useCallback((patch: Partial<DashboardHeaderState>) => {
    setState((atual) => ({ ...atual, ...patch }));
  }, []);

  const resetHeaderState = useCallback(() => {
    setState(estadoInicial);
  }, [estadoInicial]);

  const value = useMemo(
    () => ({
      setHeaderState,
      resetHeaderState,
      brandAtivo: state.brandAtivo,
      tituloRegiao: state.tituloRegiao,
    }),
    [setHeaderState, resetHeaderState, state.brandAtivo, state.tituloRegiao],
  );

  return (
    <DashboardHeaderContext.Provider value={value}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader(): DashboardHeaderContextValue | null {
  return useContext(DashboardHeaderContext);
}
