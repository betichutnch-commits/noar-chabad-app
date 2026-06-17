"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ScrollText } from "lucide-react";
import { RegulationMaintenanceGuide } from "@/components/manager/RegulationMaintenanceGuide";
import { RegulationSectionDeepLink } from "@/components/manager/RegulationSectionDeepLink";
import { ManagerHeader } from "@/components/layout/ManagerHeader";
import {
  ageThresholds,
  businessLicenseMatrix,
  chapterBPreparationTables,
  chapterCPreparationTables,
  circular585,
  circular450,
  circularChapters,
  coordinationRules,
  medicalEscortMatrix,
  preparationChecklist,
} from "@/lib/regulation";

function sectionDomId(sectionId: string) {
  return `regulation-section-${sectionId.replace(/\./g, "-")}`;
}

export default function RegulationSettingsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RegulationSectionDeepLink />
      </Suspense>
      <ManagerHeader title="חוזרי מנכ״ל ורגולציה" />
      <div className="mx-auto max-w-7xl space-y-6 p-4 pb-32 animate-fadeIn md:p-8">
        <Link
          href="/manager/settings"
          className="inline-flex items-center gap-2 text-sm font-black text-brand-cyan hover:underline"
        >
          <ArrowRight size={16} className="rotate-180" />
          חזרה להגדרות
        </Link>

        <div className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">
              <ScrollText size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">חוזר {circular585.siduri}</h2>
              <p className="text-sm text-gray-600">{circular585.title}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">{circular585.extractionNotes}</p>
          <p className="mt-2 text-xs font-bold text-amber-700">
            עריכת הנתונים ב-repo בלבד — מדריך עדכון מלא למטה. לא ייעוץ משפטי.
          </p>
          {circular585.sourcePdfPath ? (
            <p className="mt-2 text-xs text-gray-600">מקור: {circular585.sourcePdfPath}</p>
          ) : null}
        </div>

        <RegulationMaintenanceGuide />

        <div className="grid gap-4 md:grid-cols-3">
          {circularChapters.map((ch) => (
            <div key={ch.chapter} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-brand-cyan">{ch.priority}</p>
              <h3 className="mt-1 font-black text-gray-900">{ch.title}</h3>
              <p className="mt-2 text-xs text-gray-600">{ch.summary}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-black text-gray-800">צ׳קליסט היערכות (פרק א׳)</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {preparationChecklist.map((item) => (
              <li key={item.id} className="rounded-xl border border-gray-100 bg-slate-50/80 p-3">
                <span className="font-black">{item.topic}</span> — {item.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-black text-gray-800">תיאום מוקד טבע</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {coordinationRules.map((rule) => (
              <li key={rule.id} className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                <span className="font-black">{rule.label}</span>
                {rule.leadDaysMin ? ` (${rule.leadDaysMin} ימים)` : ""} — {rule.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-black text-gray-800">טבלת רישוי עסקים</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-xs">
              <thead className="bg-gray-100 font-black text-gray-700">
                <tr>
                  <th className="p-2">פעילות</th>
                  <th className="p-2">רישיון עסק</th>
                  <th className="p-2">היתר נוסף</th>
                </tr>
              </thead>
              <tbody>
                {businessLicenseMatrix.map((row) => (
                  <tr key={row.activityTypeId} className="border-t border-gray-100">
                    <td className="p-2 font-bold">{row.label}</td>
                    <td className="p-2">{row.requiresBusinessLicense ? "כן" : "לא"}</td>
                    <td className="p-2">{row.requiresOtherPermit ? "כן" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-black text-gray-800">טבלאות היערכות — פרק ב׳ ({chapterBPreparationTables.length})</h3>
          <p className="mb-4 text-xs text-gray-500">חולץ מ-PDF חוזר 585 — כל טבלה כוללת נושאי בדיקה לפני פעילות.</p>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {chapterBPreparationTables.map((table) => (
              <details
                key={table.circularSectionId}
                id={sectionDomId(table.circularSectionId)}
                data-regulation-section={table.circularSectionId}
                className="rounded-xl border border-gray-100 bg-slate-50/80 p-3"
              >
                <summary className="cursor-pointer text-sm font-black text-gray-800">
                  {table.circularSectionId} — {table.title} ({table.items.length} נושאים)
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

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-black text-gray-800">טבלאות היערכות — פרק ג׳ ({chapterCPreparationTables.length})</h3>
          <p className="mb-4 text-xs text-gray-500">פעילויות מים — נושאי בדיקה לפי סעיף בחוזר.</p>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {chapterCPreparationTables.map((table) => (
              <details
                key={table.circularSectionId}
                id={sectionDomId(table.circularSectionId)}
                data-regulation-section={table.circularSectionId}
                className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3"
              >
                <summary className="cursor-pointer text-sm font-black text-gray-800">
                  {table.circularSectionId} — {table.title} ({table.items.length} נושאים)
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

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-black text-gray-800">גילי סף</h3>
            <ul className="space-y-2 text-xs text-gray-700">
              {ageThresholds.map((row) => (
                <li key={row.id}>
                  {row.minAge != null ? `מגיל ${row.minAge}` : ""} — {row.notes}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-black text-gray-800">ליווי רפואי</h3>
            <ul className="space-y-2 text-xs text-gray-700">
              {medicalEscortMatrix.map((row) => (
                <li key={row.id}>
                  {row.escortType} {row.mandatory ? "(חובה)" : ""} — {row.notes}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6">
          <h3 className="font-black text-gray-700">חוזר {circular450.siduri} — בקרוב</h3>
          <p className="mt-2 text-sm text-gray-600">{circular450.extractionNotes}</p>
          <p className="mt-3 text-xs text-gray-600">
            כשיעלה חוזר 450 למאגר: לבדוק מחדש דרישות תיאום מוקד טבע ל<strong className="text-gray-800">אטרקציות</strong>,{" "}
            <strong className="text-gray-800">לינה</strong> (כולל לינת מבנה) וטיולים רב-יומיים. עד אז — הכללים לפי חוזר 585 בלבד.
          </p>
        </section>
      </div>
    </>
  );
}
