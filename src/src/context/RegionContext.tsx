"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Region {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  locale: string;
}

interface RegionContextValue {
  region: Region;
  availableRegions: readonly Region[];
  currency: string;
  setRegion: (region: Region) => void;
  changeRegion: (code: string) => void;
  formatCurrency: (value: number) => string;
}

export const regions: readonly Region[] = [
  {
    code: "VE",
    name: "Venezuela",
    currency: "VES",
    symbol: "Bs.",
    locale: "es-VE",
  },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    locale: "en-US",
  },
  {
    code: "CO",
    name: "Colombia",
    currency: "COP",
    symbol: "$",
    locale: "es-CO",
  },
  {
    code: "MX",
    name: "México",
    currency: "MXN",
    symbol: "$",
    locale: "es-MX",
  },
];

const STORAGE_KEY = "credi-marketplace-region";

const defaultRegion =
  regions.find((item) => item.code === "VE") ?? regions[0];

const RegionContext = createContext<
  RegionContextValue | undefined
>(undefined);

export function RegionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [region, setRegionState] = useState<Region>(defaultRegion);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const selected = regions.find((item) => item.code === stored);

      if (selected) {
        setRegionState(selected);
        document.documentElement.dataset.region = selected.code;
        return;
      }

      document.documentElement.dataset.region = defaultRegion.code;
    } catch {
      setRegionState(defaultRegion);
      document.documentElement.dataset.region = defaultRegion.code;
    }
  }, []);

  const setRegion = useCallback((next: Region) => {
    const selected = regions.find(
      (item) => item.code === next.code,
    );

    if (!selected) {
      return;
    }

    setRegionState(selected);

    try {
      window.localStorage.setItem(STORAGE_KEY, selected.code);
      document.documentElement.dataset.region = selected.code;
    } catch {
      // La persistencia local es opcional.
    }
  }, []);

  const changeRegion = useCallback(
    (code: string) => {
      const selected = regions.find((item) => item.code === code);

      if (selected) {
        setRegion(selected);
      }
    },
    [setRegion],
  );

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(region.locale, {
        style: "currency",
        currency: region.currency,
      }).format(value),
    [region.locale, region.currency],
  );

  const value = useMemo<RegionContextValue>(
    () => ({
      region,
      availableRegions: regions,
      currency: region.currency,
      setRegion,
      changeRegion,
      formatCurrency,
    }),
    [region, setRegion, changeRegion, formatCurrency],
  );

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);

  if (!context) {
    throw new Error("useRegion debe utilizarse dentro de RegionProvider");
  }

  return context;
}
