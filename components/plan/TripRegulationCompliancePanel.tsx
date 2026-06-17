"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import type { ComplianceItem, ComplianceItemStatus } from "@/lib/regulation/types";

type CompliancePayload = {
  compliance: {
    items: ComplianceItem[];
    summary: {
      mandatoryOpen: number;
      recommendedOpen: number;
      met: number;
      notApplicable: number;
    };
    disclaimer: string;
  };
  meta?: {
    circular?: { siduri: number; title: string; officialUrl: string };
    preparationChecklist?: Array<{ id: string; topic: string; description: string }>;
  };
};

type FilterMode = "all" | "mandatory" | "recommended" | "coordination";

const statusLabel: Record<ComplianceItemStatus, string> = {
  met: "מולא",
  missing: "חסר",
  not_applicable: "לא רלוונטי",
  unknown: "לא נבדק",
};

const statusTone: Record<ComplianceItemStatus, string> = {
  met: "bg-emerald-50 text-emerald-800 border-emerald-200",
  missing: "bg-red-50 text-red-800 border-red-200",
  not_applicable: "bg-gray-50 text-gray-600 border-gray-200",
  unknown: "bg-amber-50 text-amber-800 border-amber-200",
};

function documentHref(tripId: string, documentKey?: string) {
  if (!documentKey) return null;
  return `/dashboard/trip/${tripId}/plan?quickAction=documents&doc=${encodeURIComponent(documentKey)}`;
}

export function TripRegulationCompliancePanel({ tripId, compact = false }: { tripId: string; compact?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [payload, setPayload] = useState<CompliancePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/regulation-compliance`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה בטעינת ציות");
      setPayload(data as CompliancePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const list = payload?.compliance.items || [];
    if (filter === "mandatory") return list.filter((i) => i.severity === "mandatory");
    if (filter === "recommended") return list.filter((i) => i.severity === "recommended");
    if (filter === "coordination") return list.filter((i) => i.category === "coordination");
    return list;
  }, [filter, payload]);

  const summary = payload?.compliance.summary;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        טוען ציות לחוזר 585…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
        {error}
        <button type="button" onClick={() => void load()} className="mt-2 block text-brand-cyan underline">
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {summary ? (
        <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-3">
            <p className="text-[11px] font-black text-red-700">חובה — חסר</p>
            <p className="text-2xl font-black text-red-900">{summary.mandatoryOpen}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
            <p className="text-[11px] font-black text-amber-700">מומלץ — חסר</p>
            <p className="text-2xl font-black text-amber-900">{summary.recommendedOpen}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
            <p className="text-[11px] font-black text-emerald-700">מולא</p>
            <p className="text-2xl font-black text-emerald-900">{summary.met}</p>
          </div>
          {!compact ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-black text-gray-600">לא רלוונטי</p>
              <p className="text-2xl font-black text-gray-800">{summary.notApplicable}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["all", "הכל"],
            ["mandatory", "חובה"],
            ["recommended", "מומלץ"],
            ["coordination", "תיאום מוקד טבע"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
              filter === id ? "border-brand-cyan bg-cyan-50 text-brand-cyan" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="max-h-[min(52vh,520px)] space-y-2 overflow-auto pr-1">
        {items.map((item) => {
          const docHref = documentHref(tripId, item.linkedDocumentKey);
          return (
            <li key={item.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "met" ? (
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                    ) : item.status === "missing" ? (
                      <AlertTriangle size={16} className="shrink-0 text-red-500" />
                    ) : (
                      <ShieldCheck size={16} className="shrink-0 text-gray-400" />
                    )}
                    <span className="font-black text-gray-900">{item.title}</span>
                    <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${statusTone[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{item.description}</p>
                  {item.sourceSection ? (
                    <p className="mt-1 text-[10px] font-bold text-gray-400">מקור: {item.sourceSection}</p>
                  ) : null}
                </div>
                {docHref ? (
                  <Link
                    href={docHref}
                    className="shrink-0 rounded-xl border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-brand-cyan hover:bg-cyan-100"
                  >
                    למסמך
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {payload?.meta?.preparationChecklist?.length && !compact ? (
        <details className="rounded-2xl border border-gray-100 bg-slate-50/80 p-3">
          <summary className="cursor-pointer text-sm font-black text-gray-800">צ׳קליסט היערכות — פרק א׳</summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-700">
            {payload.meta.preparationChecklist.map((row) => (
              <li key={row.id}>
                <span className="font-black">{row.topic}:</span> {row.description}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-[10px] leading-5 text-gray-500">{payload?.compliance.disclaimer}</p>
      {payload?.meta?.circular?.officialUrl ? (
        <a
          href={payload.meta.circular.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-black text-brand-cyan hover:underline"
        >
          מאגר מנכ״ל — חוזר {payload.meta.circular.siduri}
          <ExternalLink size={12} />
        </a>
      ) : null}
    </div>
  );
}
