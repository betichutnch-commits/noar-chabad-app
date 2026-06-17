"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TripPlanningHubOverlay } from "@/components/plan/TripPlanningHubOverlay";

export function TripPlanningHubHost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("planning")?.trim() || "";

  if (!tripId) return null;

  return (
    <TripPlanningHubOverlay
      tripId={tripId}
      open
      onClose={() => router.replace("/dashboard")}
    />
  );
}
