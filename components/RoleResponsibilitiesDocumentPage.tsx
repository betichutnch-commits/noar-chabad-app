"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleResponsibilitiesDocument, type RoleResponsibilitiesDocumentVariant } from "@/components/RoleResponsibilitiesDocument";
import { Button } from "@/components/ui/Button";
import { formatHebrewDate } from "@/lib/dateUtils";
import {
  allResponsibilitiesColumnsDone,
  buildAssigneeBoards,
  filterBoardsForTripLeader,
  type PlanRowForAssigneeBoard,
} from "@/lib/planAssigneeResponsibilities";
import { normalizePlanRowTasks } from "@/lib/planRowTasks";

type PlanRow = PlanRowForAssigneeBoard & {
  responsibilities_done?: boolean | null;
  tasks?: Array<{
    id?: string;
    phase?: string | null;
    task_text?: string | null;
    assignee_name?: string | null;
  }>;
};

type PlanResponse = {
  trip?: {
    coordinator_name?: string | null;
    start_date?: string | null;
    details?: Record<string, unknown> | null;
  };
  rows?: PlanRow[];
};

export function RoleResponsibilitiesDocumentPage({ variant }: { variant: RoleResponsibilitiesDocumentVariant }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.id;
  const printMode = searchParams.get("print") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/trips/${tripId}/plan`, { credentials: "include" });
        const payload = (await response.json().catch(() => ({}))) as PlanResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "טעינת אחריות מהלו״ז נכשלה");
        if (cancelled) return;
        const details = (payload.trip?.details || {}) as Record<string, unknown>;
        const coord =
          String(details.coordName || "").trim() || String(payload.trip?.coordinator_name || "").trim();
        setCoordinatorName(coord);
        setTripStartDate(payload.trip?.start_date || null);
        setRows(
          (payload.rows || []).map((row) => ({
            ...row,
            tasks: normalizePlanRowTasks(row.tasks),
          })),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת אחריות מהלו״ז נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const getDayDisplay = useCallback(
    (dayIndex: number) => {
      if (!tripStartDate || !dayIndex) return { greg: "", heb: "" };
      const start = new Date(tripStartDate);
      if (Number.isNaN(start.getTime())) return { greg: "", heb: "" };
      const target = new Date(start);
      target.setDate(start.getDate() + dayIndex - 1);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        greg: target.toLocaleDateString("he-IL"),
        heb: formatHebrewDate(iso),
      };
    },
    [tripStartDate],
  );

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.order_index - b.order_index), [rows]);
  const allBoards = useMemo(
    () => buildAssigneeBoards(sortedRows, (dayIndex) => getDayDisplay(dayIndex)),
    [getDayDisplay, sortedRows],
  );
  const boards = useMemo(
    () => (variant === "trip-leader" ? filterBoardsForTripLeader(allBoards, coordinatorName) : allBoards),
    [allBoards, coordinatorName, variant],
  );
  const isComplete = allResponsibilitiesColumnsDone(sortedRows);

  useEffect(() => {
    if (!printMode || loading) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [loading, printMode]);

  const backToDocuments = () => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`);
  const backToSchedule = () => router.push(`/dashboard/trip/${tripId}/plan`);

  return (
    <>
      {loading ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">
          טוען אחריות מהלו״ז...
        </div>
      ) : null}
      {error ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">
          {error}
        </div>
      ) : null}
      <RoleResponsibilitiesDocument
        variant={variant}
        boards={boards}
        coordinatorName={coordinatorName}
        isComplete={isComplete}
        onGoToSchedule={backToSchedule}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={backToDocuments} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
            {!isComplete ? (
              <Button variant="outline" onClick={backToSchedule} className="px-4">
                <Route size={16} />
                מילוי בעמודת באחריות
              </Button>
            ) : (
              <span className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-black text-emerald-700">
                <CheckCircle2 size={16} />
                המסמך מוכן
              </span>
            )}
          </div>
        }
      />
    </>
  );
}
