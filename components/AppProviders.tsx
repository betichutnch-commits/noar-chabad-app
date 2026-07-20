"use client";

import { SustainabilityMotifsProvider } from "@/contexts/SustainabilityMotifsContext";
import { OverlayEscapeHatch } from "@/components/OverlayEscapeHatch";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SustainabilityMotifsProvider>
      <OverlayEscapeHatch />
      {children}
      <PwaInstallPrompt />
    </SustainabilityMotifsProvider>
  );
}
