"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ExternalLink, ScrollText } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RegulationSectionDeepLink } from "@/components/manager/RegulationSectionDeepLink";
import {
  circular585,
  getPreparationTableBySectionId,
  chapterBPreparationTables,
  chapterCPreparationTables,
} from "@/lib/regulation";
import { sanitizeInternalReturnUrl } from "@/lib/auth";

function sectionDomId(sectionId: string) {
  return `regulation-section-${sectionId.replace(/\./g, "-")}`;
}

function RegulationPageContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "";
  const returnUrl = sanitizeInternalReturnUrl(searchParams.get("returnUrl"), "/dashboard/new-trip");
  const focusedTable = section ? getPreparationTableBySectionId(section) : undefined;
  const allTables = [...chapterBPreparationTables, ...chapterCPreparationTables];

  return (
    <>
      <Suspense fallback={null}>
        <RegulationSectionDeepLink />
      </Suspense>
      <Header title="חוזר 585 — מאגר רגולציה" />

      <div className="mx-auto max-w-3xl space-y-5 p-4 pb-24 md:p-8">
        <Link
          href={returnUrl}
          className="inline-flex items-center gap-2 text-sm font-black text-brand-cyan hover:underline"
        >
          <ArrowRight size={16} className="rotate-180" />
          חזרה להמשך מילוי הבקשה
        </Link>

        <div className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            {circular585.officialUrl ? (
              <a
                href={circular585.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-cyan/30 bg-cyan-50 px-3 py-1.5 text-xs font-black text-brand-cyan hover:bg-cyan-100"
              >
                <ExternalLink size={14} />
                חוזר {circular585.siduri} — אתר מנכ״ל
              </a>
            ) : null}
          </div>
          <h1 className="text-xl font-black text-gray-900">חוזר {circular585.siduri}</h1>
          <p className="mt-1 text-sm text-gray-600">{circular585.title}</p>
          <p className="mt-3 text-xs text-gray-500">
            מידע להכוונה בלבד — אינו ייעוץ משפטי. לנוסח מחייב עיינו בחוזר המקורי.
          </p>
        </div>

        {focusedTable ? (
          <section
            id={sectionDomId(focusedTable.circularSectionId)}
            data-regulation-section={focusedTable.circularSectionId}
            className="rounded-3xl border-2 border-brand-cyan/30 bg-cyan-50/30 p-5 shadow-sm"
          >
            <h2 className="text-lg font-black text-gray-900">
              {focusedTable.circularSectionId} — {focusedTable.title}
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pr-5 text-sm text-gray-800">
              {focusedTable.items.map((item) => (
                <li key={item.id}>
                  <span className="font-bold">{item.topic}</span>
                  {item.description ? <span className="text-gray-600"> — {item.description}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : section ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            לא נמצאה טבלת היערכות לסעיף {section}. ניתן לעיין בכל הסעיפים למטה או בחוזר המקורי.
          </p>
        ) : null}

        <section className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-black text-gray-800">כל טבלאות ההיערכות</h3>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {allTables.map((table) => (
              <details
                key={table.circularSectionId}
                id={sectionDomId(table.circularSectionId)}
                data-regulation-section={table.circularSectionId}
                open={section === table.circularSectionId}
                className="rounded-xl border border-gray-100 bg-slate-50/80 p-3"
              >
                <summary className="cursor-pointer text-sm font-black text-gray-800">
                  {table.circularSectionId} — {table.title}
                </summary>
                <ol className="mt-2 list-decimal pr-5 text-xs text-gray-700">
                  {table.items.map((item) => (
                    <li key={item.id} className="mb-1">
                      {item.topic}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default function DashboardRegulationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">טוען מאגר רגולציה…</div>
      }
    >
      <RegulationPageContent />
    </Suspense>
  );
}
