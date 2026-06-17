"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isPlanningApprovedStatus, readCoordinatorPlanningMeta } from "@/lib/coordinatorPlanningMeta";
import { TripPlanningApprovalModal } from "@/components/plan/TripPlanningApprovalModal";

type PendingTrip = { id: string; name: string };

export function CoordinatorPlanningHost({ userId }: { userId?: string | null }) {
  const router = useRouter();
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshQueue = useCallback(async () => {
    if (!userId) {
      setPendingTrips([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, status, details")
        .eq("user_id", userId)
        .in("status", ["approved", "approved_for_execution"])
        .order("start_date", { ascending: true });
      if (error) throw error;
      const queue = (data || [])
        .filter((trip) => isPlanningApprovedStatus(trip.status))
        .filter((trip) => !readCoordinatorPlanningMeta(trip.details).approvalModalSeenAt)
        .map((trip) => ({ id: String(trip.id), name: String(trip.name || "טיול") }));
      setPendingTrips(queue);
    } catch (error) {
      console.error("[CoordinatorPlanningHost]", error);
      setPendingTrips([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const activeTrip = useMemo(() => (pendingTrips.length && !loading ? pendingTrips[0] : null), [pendingTrips, loading]);

  const handleAcknowledged = () => {
    if (!activeTrip) return;
    setPendingTrips((prev) => prev.filter((trip) => trip.id !== activeTrip.id));
    router.replace(`/dashboard?planning=${activeTrip.id}`);
  };

  if (!activeTrip) return null;

  return (
    <TripPlanningApprovalModal
      tripId={activeTrip.id}
      tripName={activeTrip.name}
      open
      onAcknowledged={handleAcknowledged}
    />
  );
}
