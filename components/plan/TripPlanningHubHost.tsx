"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TripPlanningHubOverlay } from "@/components/plan/TripPlanningHubOverlay";

export function TripPlanningHubHost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("planning")?.trim() || "";

  const clearPlanningParam = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("planning");
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
  };

  if (!tripId) return null;

  return (
    <TripPlanningHubOverlay
      tripId={tripId}
      open
      onClose={clearPlanningParam}
    />
  );
}
