"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { ManagerHeader } from "@/components/layout/ManagerHeader";
import { Check, ChevronDown, LayoutGrid, Loader2, Rows3, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { isManagerUser } from "@/lib/auth";
import type { TripRecord } from "@/lib/types";
import { useUser } from "@/hooks/useUser";
import { TripCard } from "@/components/TripCard";
import {
  readTripsViewModeFromStorage,
  persistTripsViewMode,
  type TripsViewMode,
} from "@/components/ViewModeToggle";
import { ManagerTripsCompactTable } from "@/components/ManagerTripsCompactTable";
import { getApprovalTripAlert } from "@/lib/managerTripListAlerts";
import { Tooltip } from "@/components/ui/Tooltip";

type StyledOption<T extends string> = {
  value: T;
  label: string;
};
type StatusFilter = "pending" | "approved" | "approved_for_execution" | "rejected" | "all";
const statusFilters = new Set<StatusFilter>(["pending", "approved", "approved_for_execution", "rejected", "all"]);

function StyledSingleSelect<T extends string>({
  value,
  options,
  onChange,
  triggerPrefix,
}: {
  value: T;
  options: StyledOption<T>[];
  onChange: (next: T) => void;
  triggerPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className={`relative ${isOpen ? "z-[300]" : "z-10"}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 w-full rounded-2xl border bg-gradient-to-b from-white to-gray-50 pr-3 pl-8 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-cyan-100 text-right ${
          isOpen ? "border-cyan-300 ring-2 ring-cyan-100" : "border-gray-200"
        }`}
      >
        {triggerPrefix ? `${triggerPrefix}: ${active?.label || ""}` : active?.label}
        <ChevronDown
          size={13}
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="absolute top-full mt-1.5 right-0 z-[300] min-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-fadeIn">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-right text-sm font-bold transition-colors ${
                    selected ? "bg-cyan-50 text-cyan-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AssignmentPicker({
  tripId,
  assignedToName,
  assignedToId,
  members,
  disabled,
  onAssign,
}: {
  tripId: string;
  assignedToName: string | null;
  assignedToId: string | null;
  members: Array<{ id: string; full_name: string | null }>;
  disabled?: boolean;
  onAssign: (tripId: string, assigneeId: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; width: number }>({ top: 0, right: 0, width: 180 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      if (rootRef.current) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const triggerLabel = assignedToName ? `שיוך: ${assignedToName}` : "שיוך";

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(180, Math.min(240, rect.width || 180));
      const right = Math.max(12, window.innerWidth - rect.right);
      const top = Math.min(window.innerHeight - 16, rect.bottom + 6);
      setMenuPosition({ top, right, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div
      className={`relative w-full md:w-auto ${isOpen ? "z-[300]" : ""}`}
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full md:min-w-[132px] py-2 px-3 rounded-lg border text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors ${
          assignedToName
            ? "border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
            : "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 hover:border-cyan-400"
        }`}
      >
        <span className="truncate max-w-[140px]">{triggerLabel}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen
        ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[1000] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
          style={{ top: menuPosition.top, right: menuPosition.right, width: menuPosition.width }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1.5 max-h-64 overflow-y-auto">
            {members.map((m) => {
              const isCurrent = assignedToId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onAssign(tripId, m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-right text-xs font-bold flex items-center justify-between transition-colors ${
                    isCurrent ? "bg-cyan-50 text-cyan-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{m.full_name || m.id}</span>
                  {isCurrent ? <Check size={12} className="shrink-0" /> : null}
                </button>
              );
            })}

            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => {
                onAssign(tripId, null);
                setIsOpen(false);
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-right text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              בטל שיוך
            </button>
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}

function ApprovalsPageContent() {
  const { user, profile, loading: userLoading } = useUser("/");
  const searchParams = useSearchParams();

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>(() => {
    const param = searchParams.get("filter") as StatusFilter | null;
    return param && statusFilters.has(param) ? param : "pending";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "submitted_desc" | "submitted_asc" | "trip_date_asc" | "trip_date_desc"
  >("submitted_desc");
  const [viewMode, setViewMode] = useState<TripsViewMode>(() => readTripsViewModeFromStorage());
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [assigningTripId, setAssigningTripId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [assignmentNotice, setAssignmentNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const param = searchParams.get("filter") as StatusFilter | null;
    if (param && statusFilters.has(param)) setFilter(param);
  }, [searchParams]);

  useEffect(() => {
    if (!assignmentNotice) return;
    const timer = window.setTimeout(() => {
      setAssignmentNotice(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [assignmentNotice]);

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

      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, user_id, name, branch, department, coordinator_name, start_date, status, details, created_at, safety_assignee_id, safety_assigned_at, safety_assigned_by",
        )
        .order("created_at", { ascending: false });

      if (error && /safety_assignee_id|safety_assigned_at|safety_assigned_by/i.test(error.message)) {
        // Backward compatible fallback until DB migration is applied.
        const fallback = await supabase
          .from("trips")
          .select("id, user_id, name, branch, department, coordinator_name, start_date, status, details, created_at")
          .order("created_at", { ascending: false });
        if (fallback.data) {
          setTrips(
            fallback.data.map((t) => ({
              ...t,
              safety_assignee_id: null,
              safety_assigned_at: null,
              safety_assigned_by: null,
            })),
          );
        }
      } else if (data) {
        setTrips(data);
      }

      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["safety_admin", "admin"]);
      const normalized = (members || []).map((m) => ({ id: String(m.id), full_name: m.full_name as string | null }));
      setTeamMembers(normalized);
      setLoadingTrips(false);
    };

    if (!userLoading && user) {
      fetchTrips();
    }
  }, [user, userLoading, profile]);

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const matchesStatus =
          filter === "all"
            ? true
            : filter === "approved"
              ? trip.status === "approved"
              : trip.status === filter;
        const matchesSearch =
          trip.name?.includes(searchTerm) ||
          trip.branch?.includes(searchTerm) ||
          trip.coordinator_name?.includes(searchTerm);
        const mine = trip.safety_assignee_id === user?.id;
        const unassigned = !trip.safety_assignee_id;
        const matchesAssignment =
          assignmentFilter === "all" ? true : assignmentFilter === "mine" ? mine : unassigned;
        return matchesStatus && matchesSearch && matchesAssignment;
      }),
    [trips, filter, searchTerm, assignmentFilter, user?.id],
  );

  const sortedTrips = useMemo(() => {
    const safeTime = (value?: string | null) => {
      if (!value) return 0;
      const t = new Date(value).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    return [...filteredTrips].sort((a, b) => {
      if (sortBy === "submitted_asc") return safeTime(a.created_at) - safeTime(b.created_at);
      if (sortBy === "trip_date_asc") return safeTime(a.start_date) - safeTime(b.start_date);
      if (sortBy === "trip_date_desc") return safeTime(b.start_date) - safeTime(a.start_date);
      return safeTime(b.created_at) - safeTime(a.created_at);
    });
  }, [filteredTrips, sortBy]);

  const assigneeNameMap = new Map(teamMembers.map((m) => [m.id, m.full_name || "ללא שם"]));
  const getAssignmentLabel = (trip: TripRecord) =>
    trip.safety_assignee_id ? `בטיפול: ${assigneeNameMap.get(trip.safety_assignee_id) || "לא ידוע"}` : "לא משויך";
  const getManagerTripHref = (trip: TripRecord) =>
    trip.status === "approved" || trip.status === "approved_for_execution"
      ? `/manager/approvals/${trip.id}/plan`
      : `/manager/approvals/${trip.id}`;

  const assignTrip = async (tripId: string, assigneeId: string | null) => {
    setAssigningTripId(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignmentNotice({
          type: "error",
          message:
            String(payload?.error || "").trim() ||
            "לא ניתן היה לעדכן את השיוך כרגע. נסה/י שוב.",
        });
        return;
      }
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                safety_assignee_id: assigneeId,
                safety_assigned_at: assigneeId ? new Date().toISOString() : null,
                safety_assigned_by: user?.id || null,
              }
            : t,
        ),
      );
      setAssignmentNotice({
        type: "success",
        message: assigneeId ? "השיוך עודכן בהצלחה." : "השיוך הוסר בהצלחה.",
      });
    } finally {
      setAssigningTripId(null);
    }
  };

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

      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-clip overflow-y-visible md:max-w-7xl md:mx-auto">
        {assignmentNotice && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              assignmentNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {assignmentNotice.message}
          </div>
        )}
        <div className="relative z-30 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.15fr_auto_1.1fr] gap-2.5 w-full items-center overflow-visible">
            <StyledSingleSelect
              value={filter}
              onChange={(next) => setFilter(next)}
              triggerPrefix="סטטוס"
              options={[
                { value: "pending", label: "ממתינים" },
                { value: "approved", label: "אושרו לתכנון" },
                { value: "approved_for_execution", label: "אושרו לביצוע" },
                { value: "rejected", label: "נדחו" },
                { value: "all", label: "הכל" },
              ]}
            />

            <StyledSingleSelect
              value={assignmentFilter}
              onChange={(next) => setAssignmentFilter(next)}
              triggerPrefix="שיוך"
              options={[
                { value: "all", label: "הכל" },
                { value: "mine", label: "שלי" },
                { value: "unassigned", label: "לא משויכים" },
              ]}
            />

            <StyledSingleSelect
              value={sortBy}
              onChange={(next) => setSortBy(next)}
              triggerPrefix="מיון"
              options={[
                { value: "submitted_desc", label: "זמן הגשה (חדש לישן)" },
                { value: "submitted_asc", label: "זמן הגשה (ישן לחדש)" },
                { value: "trip_date_asc", label: "תאריך טיול (קרוב לרחוק)" },
                { value: "trip_date_desc", label: "תאריך טיול (רחוק לקרוב)" },
              ]}
            />

            <div className="inline-flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm w-fit">
              <Tooltip label="כרטיסים">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("cards")}
                  className={`flex items-center justify-center rounded-lg p-1 transition-all ${
                    viewMode === "cards" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-pressed={viewMode === "cards"}
                >
                  <LayoutGrid size={14} />
                </button>
              </Tooltip>
              <Tooltip label="קומפקטי">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("table")}
                  className={`flex items-center justify-center rounded-lg p-1 transition-all ${
                    viewMode === "table" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-pressed={viewMode === "table"}
                >
                  <Rows3 size={14} />
                </button>
              </Tooltip>
            </div>

            <div className="relative w-full">
              <Input
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
          </div>
        </div>

        {sortedTrips.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium bg-surface-card rounded-2xl border border-dashed border-border-subtle">
            לא נמצאו טיולים
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {sortedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  viewerContext="manager"
                  manageHref={getManagerTripHref(trip)}
                  alert={getApprovalTripAlert(trip)}
                  managerInlineActions={
                    <AssignmentPicker
                      tripId={trip.id}
                      assignedToId={trip.safety_assignee_id || null}
                      assignedToName={trip.safety_assignee_id ? assigneeNameMap.get(trip.safety_assignee_id) || null : null}
                      members={teamMembers}
                      disabled={assigningTripId === trip.id}
                      onAssign={(tripId, assigneeId) => {
                        void assignTrip(tripId, assigneeId);
                      }}
                    />
                  }
                />
              ))}
            </div>

            <div className="hidden md:block">
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 gap-4">
                  {sortedTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      viewerContext="manager"
                      manageHref={getManagerTripHref(trip)}
                      alert={getApprovalTripAlert(trip)}
                      managerInlineActions={
                        <AssignmentPicker
                          tripId={trip.id}
                          assignedToId={trip.safety_assignee_id || null}
                          assignedToName={
                            trip.safety_assignee_id ? assigneeNameMap.get(trip.safety_assignee_id) || null : null
                          }
                          members={teamMembers}
                          disabled={assigningTripId === trip.id}
                          onAssign={(tripId, assigneeId) => {
                            void assignTrip(tripId, assigneeId);
                          }}
                        />
                      }
                    />
                  ))}
                </div>
              ) : (
                <ManagerTripsCompactTable
                  trips={sortedTrips}
                  detailHref={(id) => {
                    const trip = sortedTrips.find((t) => t.id === id);
                    if (!trip) return `/manager/approvals/${id}`;
                    return getManagerTripHref(trip);
                  }}
                  getAlert={getApprovalTripAlert}
                  getAssignmentLabel={getAssignmentLabel}
                  renderAssignmentActions={(trip) => (
                    <AssignmentPicker
                      tripId={trip.id}
                      assignedToId={trip.safety_assignee_id || null}
                      assignedToName={trip.safety_assignee_id ? assigneeNameMap.get(trip.safety_assignee_id) || null : null}
                      members={teamMembers}
                      disabled={assigningTripId === trip.id}
                      onAssign={(tripId, assigneeId) => {
                        void assignTrip(tripId, assigneeId);
                      }}
                    />
                  )}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={null}>
      <ApprovalsPageContent />
    </Suspense>
  );
}
