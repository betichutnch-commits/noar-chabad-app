"use client";

import { SustainabilityMotifsProvider } from "@/contexts/SustainabilityMotifsContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SustainabilityMotifsProvider>{children}</SustainabilityMotifsProvider>;
}
