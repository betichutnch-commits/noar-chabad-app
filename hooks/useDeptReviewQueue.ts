"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { TripRecord } from "@/lib/types";
import { hasDeptReviewCapability } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

type QueueTrip = Pick<TripRecord, "id" | "name" | "branch" | "coordinator_name" | "start_date" | "status">;

export const useDeptReviewQueue = (user?: User | null) => {
  const [queueTrips, setQueueTrips] = useState<QueueTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueHighlight, setQueueHighlight] = useState(false);

  const department = String(user?.user_metadata?.department || "").trim();
  const enabled = hasDeptReviewCapability(user || null) && Boolean(department);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerHighlight = () => {
      setQueueHighlight(true);
      if (highlightTimer) clearTimeout(highlightTimer);
      highlightTimer = setTimeout(() => setQueueHighlight(false), 2500);
    };

    const fetchQueue = async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, name, branch, coordinator_name, start_date, status")
        .eq("department", department)
        .eq("status", "pending_dept_review")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) return;
      const nextTrips = (data || []) as QueueTrip[];
      setQueueTrips((prevTrips) => {
        if (nextTrips.length > prevTrips.length) {
          triggerHighlight();
        }
        return nextTrips;
      });
      setLoading(false);
    };

    void fetchQueue();

    const channel = supabase
      .channel(`dept_review_queue_${department}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `department=eq.${department}` },
        () => void fetchQueue(),
      )
      .subscribe();

    return () => {
      active = false;
      if (highlightTimer) clearTimeout(highlightTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, department]);

  const pendingCount = useMemo(() => queueTrips.length, [queueTrips]);

  return {
    queueTrips: enabled ? queueTrips : [],
    pendingCount: enabled ? pendingCount : 0,
    loading: enabled ? loading : false,
    enabled,
    queueHighlight: enabled ? queueHighlight : false,
  };
};
