"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SafetyReviewTrackingDocument, { type SafetyReviewTrackingRow } from "@/components/SafetyReviewTrackingDocument";
import { Button } from "@/components/ui/Button";
import { documentCatalog, type DocumentHandlingKind } from "@/lib/tripDocumentsCatalog";

type DocumentOverride = {
  document_key: string;
  status?: string | null;
  owner?: string | null;
  note?: string | null;
  pdf_url?: string | null;
};

type DocumentsResponse = {
  documents?: DocumentOverride[];
};

type PlanRow = {
  order_index: number;
  safety_done?: boolean | null;
  safety?: Array<{
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

const handlingLabels: Record<DocumentHandlingKind, string> = {
  "internal-form": "טופס פנימי",
  "auto-generated": "אוטומטי",
  "upload-or-link": "העלאה/קישור",
  "fixed-guidance": "הנחיות קבועות",
};

const isCompletedStatus = (status?: string | null, pdfUrl?: string | null) =>
  status === "מוכן PDF" || status === "לא נדרש" || Boolean(String(pdfUrl || "").trim());

const normalizeDocumentStatus = (status?: string | null) => {
  const value = String(status || "").trim();
  if (!value || value === "להכנה") return "לטיפול";
  if (value === "בטיפול" || value === "מוכן לעריכה") return "בעבודה";
  if (value === "נבדק") return "מוכן PDF";
  return value;
};

const READY_BY_DEFAULT_DOCUMENT_KEYS = new Set(["emergency-incident-report", "medical-referral", "casualties-summary", "emergency-procedure"]);

export default function SafetyReviewTrackingDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.id;
  const printMode = searchParams.get("print") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<DocumentOverride[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [documentsResponse, planResponse] = await Promise.all([
          fetch(`/api/trips/${tripId}/plan/documents`, { credentials: "include" }),
          fetch(`/api/trips/${tripId}/plan`, { credentials: "include" }),
        ]);
        const documentsPayload = (await documentsResponse.json().catch(() => ({}))) as DocumentsResponse & { error?: string };
        const planPayload = (await planResponse.json().catch(() => ({}))) as PlanResponse & { error?: string };
        if (!documentsResponse.ok) throw new Error(documentsPayload.error || "טעינת מסמכי תיק הטיול נכשלה");
        if (!planResponse.ok) throw new Error(planPayload.error || "טעינת הלו״ז נכשלה");
        if (cancelled) return;
        setDocuments(documentsPayload.documents || []);
        setPlanRows(planPayload.rows || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת טבלת המעקב נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const rows = useMemo<SafetyReviewTrackingRow[]>(() => {
    const overridesByKey = new Map(documents.map((document) => [document.document_key, document]));
    const sortedPlanRows = [...planRows].sort((a, b) => a.order_index - b.order_index);
    return documentCatalog
      .filter((document) => document.key !== "safety-department-review-tracking")
      .map((document) => {
        const override = overridesByKey.get(document.key);
        const isScheduleDocument = document.key === "schedule-safety-highlights";
        const overrideStatus = override?.pdf_url && override?.status !== "לא נדרש" ? "מוכן PDF" : override?.status ? normalizeDocumentStatus(override.status) : READY_BY_DEFAULT_DOCUMENT_KEYS.has(document.key) ? "מוכן PDF" : "לטיפול";
        const status = isScheduleDocument && sortedPlanRows.length
            ? normalizeDocumentStatus(override?.status || "בעבודה")
            : normalizeDocumentStatus(overrideStatus || (isCompletedStatus(override?.status, override?.pdf_url) ? "מוכן PDF" : "לטיפול"));

        return {
          category: document.category,
          title: document.title,
          handling: handlingLabels[document.handlingKind],
          status,
          owner: override?.owner || "-",
          note: override?.note || "-",
        };
      });
  }, [documents, planRows]);

  useEffect(() => {
    if (!printMode || loading) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [loading, printMode]);

  const backToDocuments = () => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`);

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען טבלת מעקב...</div> : null}
      {error ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">{error}</div> : null}
      <SafetyReviewTrackingDocument
        rows={rows}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={backToDocuments} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
          </div>
        }
      />
    </>
  );
}
