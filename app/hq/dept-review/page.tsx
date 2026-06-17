"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Loader2, Search, ClipboardList } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { getCoordinatorsPluralTitle, getDeptTripsOfficerTitle, isDeptReviewOfficer } from "@/lib/auth";
import type { TripRecord } from "@/lib/types";
import { TripCard } from "@/components/TripCard";
import {
  ViewModeToggle,
  readTripsViewModeFromStorage,
  persistTripsViewMode,
  type TripsViewMode,
} from "@/components/ViewModeToggle";
import { ManagerTripsCompactTable } from "@/components/ManagerTripsCompactTable";
import { getDeptReviewTripAlert } from "@/lib/managerTripListAlerts";

type TabKey =
  | "pending_dept_review"
  | "returned_for_changes"
  | "pending"
  | "approved"
  | "approved_for_execution"
  | "rejected"
  | "all";

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: "pending_dept_review", label: "אצלי לטיפול" },
  { id: "returned_for_changes", label: "הוחזרו להערות" },
  { id: "pending", label: "אצל בטיחות" },
  { id: "approved", label: "אושרו לתכנון" },
  { id: "approved_for_execution", label: "אושרו לביצוע" },
  { id: "rejected", label: "נדחו" },
  { id: "all", label: "הכל" },
];

export default function DeptReviewListPage() {
  const { user, profile, loading: userLoading } = useUser("/");
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tab, setTab] = useState<TabKey>("pending_dept_review");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<TripsViewMode>(() => readTripsViewModeFromStorage());

  const department = profile?.department || "";

  const handleViewModeChange = (mode: TripsViewMode) => {
    setViewMode(mode);
    persistTripsViewMode(mode);
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) return;

    const isOfficer = isDeptReviewOfficer(user, profile);
    if (!isOfficer) {
      window.location.href = "/dashboard";
      return;
    }

    let cancelled = false;

    if (!department) {
      queueMicrotask(() => {
        if (!cancelled) setLoadingTrips(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const fetchTrips = async () => {
      const { data } = await supabase
        .from("trips")
        .select(
          "id, user_id, name, branch, department, coordinator_name, start_date, status, details, dept_review_notes, dept_reviewed_at, dept_forwarded_at",
        )
        .eq("department", department)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setTrips(data || []);
      setLoadingTrips(false);
    };

    void fetchTrips();

    const channel = supabase
      .channel(`dept_review_${department}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
          filter: `department=eq.${department}`,
        },
        () => void fetchTrips(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, userLoading, profile, department]);

  const counts = useMemo(() => {
    const result: Record<TabKey, number> = {
      pending_dept_review: 0,
      returned_for_changes: 0,
      pending: 0,
      approved: 0,
      approved_for_execution: 0,
      rejected: 0,
      all: trips.length,
    };
    for (const trip of trips) {
      const s = trip.status as TabKey;
      if (s in result) result[s] += 1;
    }
    return result;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesTab = tab === "all" ? true : trip.status === tab;
      const term = search.trim();
      const matchesSearch = !term
        ? true
        : [trip.name, trip.branch, trip.coordinator_name]
            .filter(Boolean)
            .some((v) => String(v).includes(term));
      return matchesTab && matchesSearch;
    });
  }, [trips, tab, search]);

  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-cyan" size={40} />
      </div>
    );
  }

  return (
    <>
      <Header title={`אישור ראשוני - ${getDeptTripsOfficerTitle(department)}`} />
      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
        {!department ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 mb-6 text-sm">
            לא נקבעה מחלקה לפרופיל שלך. יש לעדכן את שדה המחלקה כדי לראות טיולים לאישור.
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex bg-surface-card p-1 rounded-xl border border-border-subtle shadow-sm w-full md:w-auto overflow-x-auto">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              const count = counts[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2
                    ${isActive ? "bg-gray-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {t.label}
                  {count > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 rounded-full min-w-[20px] h-[18px] flex items-center justify-center font-bold
                        ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="hidden md:flex shrink-0">
              <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
            </div>
            <div className="relative w-full md:w-80">
              <Input
                placeholder="חיפוש לפי שם טיול / רכז / סניף..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
          </div>
        </div>

        <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-4 mb-6 text-sm text-cyan-900 flex items-center gap-3">
          <ClipboardList size={20} className="shrink-0 text-brand-cyan" />
          <div>
            כאן מוצגים כל הטיולים של {getCoordinatorsPluralTitle(department)} <span className="font-bold">{department || "המחלקה"}</span>. לחץ על
            &quot;לפרטים&quot; כדי לבחון, להחזיר להערות או להעביר לאישור מחלקת הבטיחות.
          </div>
        </div>

        {loadingTrips && department ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="animate-spin text-brand-cyan mx-auto" size={32} />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium bg-surface-card rounded-2xl border border-dashed border-border-subtle">
            לא נמצאו טיולים בחלק זה
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  viewerContext="manager"
                  manageHref={`/hq/dept-review/${trip.id}`}
                  showDepartmentTag={false}
                  alert={getDeptReviewTripAlert(trip)}
                />
              ))}
            </div>

            <div className="hidden md:block">
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      viewerContext="manager"
                      manageHref={`/hq/dept-review/${trip.id}`}
                      showDepartmentTag={false}
                      alert={getDeptReviewTripAlert(trip)}
                    />
                  ))}
                </div>
              ) : (
                <ManagerTripsCompactTable
                  trips={filteredTrips}
                  detailHref={(tripId) => `/hq/dept-review/${tripId}`}
                  getAlert={getDeptReviewTripAlert}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
