"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SustainabilityMotifsContextValue = {
  enabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SustainabilityMotifsContext = createContext<SustainabilityMotifsContextValue | null>(null);

export function SustainabilityMotifsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/sustainability", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setEnabled(false);
        return;
      }
      const payload = (await res.json()) as { enabled?: boolean };
      setEnabled(payload.enabled === true);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const value = useMemo(() => ({ enabled, loading, refresh }), [enabled, loading, refresh]);

  return <SustainabilityMotifsContext.Provider value={value}>{children}</SustainabilityMotifsContext.Provider>;
}

export function useSustainabilityMotifsEnabled(): boolean {
  const context = useContext(SustainabilityMotifsContext);
  if (!context || context.loading) return false;
  return context.enabled;
}

export function useSustainabilityMotifsSetting() {
  const context = useContext(SustainabilityMotifsContext);
  if (!context) {
    return { enabled: false, loading: false, refresh: async () => {} };
  }
  return context;
}
