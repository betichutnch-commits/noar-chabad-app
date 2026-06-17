"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RiskManagementDocument, { type RiskDocumentRow } from "@/components/RiskManagementDocument";
import { Button } from "@/components/ui/Button";

type PlanRow = {
  id: string;
  order_index: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
  safety_done?: boolean | null;
  safety?: Array<{
    id?: string;
    risk?: string | null;
    mitigation?: string | null;
    owner?: string | null;
    risk_level_before?: number | null;
    likelihood_before?: number | null;
    risk_level_after?: number | null;
    likelihood_after?: number | null;
  }>;
};

type PlanResponse = {
  rows?: PlanRow[];
};

const formatRiskScore = (level?: number | null, likelihood?: number | null) => {
  if (typeof level !== "number" || typeof likelihood !== "number") return "לא הוזן";
  return `רמה ${level} · שכיחות ${likelihood} · ציון ${level * likelihood}`;
};

const hasSafetyContent = (safety: NonNullable<PlanRow["safety"]>[number]) =>
  Boolean(
    String(safety.risk || "").trim() ||
      String(safety.mitigation || "").trim() ||
      String(safety.owner || "").trim() ||
      safety.risk_level_before ||
      safety.likelihood_before ||
      safety.risk_level_after ||
      safety.likelihood_after,
  );

export default function RiskManagementDocumentPage() {
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
        if (!response.ok) throw new Error(payload.error || "טעינת ניהול הסיכונים נכשלה");
        if (cancelled) return;
        setRows(payload.rows || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת ניהול הסיכונים נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.order_index - b.order_index), [rows]);
  const isComplete = sortedRows.length > 0 && sortedRows.every((row) => Boolean(row.safety_done));
  const documentRows = useMemo<RiskDocumentRow[]>(() => {
    const items: RiskDocumentRow[] = [];
    for (const row of sortedRows) {
      const rowLabel = [row.time_text, row.location_text].map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
      for (const safety of row.safety || []) {
        if (!hasSafetyContent(safety)) continue;
        items.push({
          occurrence: row.event_text || row.location_text || "התרחשות ללא פירוט",
          rowLabel,
          risk: safety.risk || "",
          riskScoreBefore: formatRiskScore(safety.risk_level_before, safety.likelihood_before),
          mitigation: safety.mitigation || "",
          riskScoreAfter: formatRiskScore(safety.risk_level_after, safety.likelihood_after),
          owner: safety.owner || "",
        });
      }
    }
    return items;
  }, [sortedRows]);

  useEffect(() => {
    if (!printMode || loading) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [loading, printMode]);

  const backToDocuments = () => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`);
  const backToSafetyColumn = () => router.push(`/dashboard/trip/${tripId}/plan?focus=safety`);

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען ניהול סיכונים...</div> : null}
      {error ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">{error}</div> : null}
      <RiskManagementDocument
        rows={documentRows}
        isComplete={isComplete}
        onGoToSafetyColumn={backToSafetyColumn}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={backToDocuments} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
            {!isComplete ? (
              <Button variant="outline" onClick={backToSafetyColumn} className="px-4">
                <Route size={16} />
                מילוי בעמודת הבטיחות
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
