"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScheduleSafetyDocument, { type ScheduleSafetyDocumentRow } from "@/components/ScheduleSafetyDocument";
import { Button } from "@/components/ui/Button";

type PlanRow = {
  id: string;
  order_index: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
  notes?: string | null;
  safety?: Array<{
    id?: string;
    risk?: string | null;
    mitigation?: string | null;
  }>;
};

type PlanResponse = {
  rows?: PlanRow[];
};

const hasSafetyText = (safety: NonNullable<PlanRow["safety"]>[number]) =>
  Boolean(String(safety.risk || "").trim() || String(safety.mitigation || "").trim());

export default function ScheduleSafetyDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.id;
  const printMode = searchParams.get("print") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PlanRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/trips/${tripId}/plan`, { credentials: "include" });
        const payload = (await response.json().catch(() => ({}))) as PlanResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "טעינת לו״ז ודגשי בטיחות נכשלה");
        if (cancelled) return;
        setRows(payload.rows || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת לו״ז ודגשי בטיחות נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const documentRows = useMemo<ScheduleSafetyDocumentRow[]>(() => {
    const items: ScheduleSafetyDocumentRow[] = [];
    for (const row of [...rows].sort((a, b) => a.order_index - b.order_index)) {
      const base = {
        day: row.day_index ? `יום ${row.day_index}` : "-",
        time: row.time_text || "",
        location: row.location_text || "",
        occurrence: row.event_text || "",
        notes: row.notes || "",
      };
      const safetyItems = (row.safety || []).filter(hasSafetyText);
      if (!safetyItems.length) {
        items.push({
          ...base,
          risk: "",
          mitigation: "",
        });
        continue;
      }
      for (const safety of safetyItems) {
        items.push({
          ...base,
          risk: safety.risk || "",
          mitigation: safety.mitigation || "",
        });
      }
    }
    return items;
  }, [rows]);

  useEffect(() => {
    if (!printMode || loading) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [loading, printMode]);

  const backToDocuments = () => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`);
  const backToSchedule = () => router.push(`/dashboard/trip/${tripId}/plan`);

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען לו״ז ודגשי בטיחות...</div> : null}
      {error ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">{error}</div> : null}
      <ScheduleSafetyDocument
        rows={documentRows}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={backToDocuments} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
            <Button variant="outline" onClick={backToSchedule} className="px-4">
              <Route size={16} />
              חזרה ללו״ז המפורט
            </Button>
          </div>
        }
      />
    </>
  );
}
