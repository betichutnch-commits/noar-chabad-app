"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ManagerHeader } from "@/components/layout/ManagerHeader";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { isManagerUser } from "@/lib/auth";
import type { TripRecord } from "@/lib/types";
import { useUser } from "@/hooks/useUser";
import { TripCard } from "@/components/TripCard";
import {
  ViewModeToggle,
  readTripsViewModeFromStorage,
  persistTripsViewMode,
  type TripsViewMode,
} from "@/components/ViewModeToggle";
import { ManagerTripsCompactTable } from "@/components/ManagerTripsCompactTable";
import { getApprovalTripAlert } from "@/lib/managerTripListAlerts";

export default function ApprovalsPage() {
  const { user, profile, loading: userLoading } = useUser("/");

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<TripsViewMode>(() => readTripsViewModeFromStorage());

  const handleViewModeChange = (mode: TripsViewMode) => {
    setViewMode(mode);
    persistTripsViewMode(mode);
  };

  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;

      const isManager = isManagerUser(user, profile);
      if (!isManager) {
        window.location.href = "/dashboard";
        return;
      }

      const { data } = await supabase
        .from("trips")
        .select(
          "id, user_id, name, branch, department, coordinator_name, start_date, status, details, created_at",
        )
        .order("created_at", { ascending: false });

      if (data) setTrips(data);
      setLoadingTrips(false);
    };

    if (!userLoading && user) {
      fetchTrips();
    }
  }, [user, userLoading, profile]);

  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      filter === "all"
        ? true
        : filter === "approved"
          ? trip.status === "approved" || trip.status === "approved_for_execution"
          : trip.status === filter;
    const matchesSearch =
      trip.name?.includes(searchTerm) ||
      trip.branch?.includes(searchTerm) ||
      trip.coordinator_name?.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  if (userLoading || loadingTrips) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-cyan" size={40} />
      </div>
    );
  }

  return (
    <>
      <ManagerHeader title="אישור ובקרת טיולים" />

      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex bg-surface-card p-1 rounded-xl border border-border-subtle shadow-sm w-full md:w-auto overflow-x-auto">
            {["pending", "approved", "approved_for_execution", "rejected", "all"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none
                            ${filter === f ? "bg-gray-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {f === "pending"
                  ? "ממתינים"
                  : f === "approved"
                    ? "אושרו לתכנון"
                    : f === "approved_for_execution"
                      ? "אושרו לביצוע"
                      : f === "rejected"
                        ? "נדחו"
                        : "הכל"}
              </button>
            ))}
          </div>

          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="hidden md:flex shrink-0">
              <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
            </div>
            <div className="relative w-full md:w-80">
              <Input
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium bg-surface-card rounded-2xl border border-dashed border-border-subtle">
            לא נמצאו טיולים
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  viewerContext="manager"
                  manageHref={`/manager/approvals/${trip.id}`}
                  alert={getApprovalTripAlert(trip)}
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
                      manageHref={`/manager/approvals/${trip.id}`}
                      alert={getApprovalTripAlert(trip)}
                    />
                  ))}
                </div>
              ) : (
                <ManagerTripsCompactTable
                  trips={filteredTrips}
                  detailHref={(id) => `/manager/approvals/${id}`}
                  getAlert={getApprovalTripAlert}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
