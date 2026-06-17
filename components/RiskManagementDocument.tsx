"use client";

import Image from "next/image";
import type React from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { RiskMitigationDisplay } from "@/components/plan/RiskMitigationDisplay";

export type RiskDocumentRow = {
  occurrence: string;
  rowLabel: string;
  risk: string;
  riskScoreBefore: string;
  mitigation: string;
  riskScoreAfter: string;
  owner: string;
};

export type RiskManagementDocumentProps = {
  rows: RiskDocumentRow[];
  isComplete?: boolean;
  onGoToSafetyColumn?: () => void;
  actions?: React.ReactNode;
};

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

const columns: Array<MasterFormColumn<RiskDocumentRow>> = [
  {
    key: "occurrence",
    header: "התרחשות / שלב בטיול",
    widthClassName: "w-[18%]",
    cellClassName: "align-middle text-center",
    renderView: (value, row) => (
      <div className="space-y-1 text-center">
        <div className="whitespace-pre-wrap font-black">{String(value || "-")}</div>
        {row.rowLabel ? <div className="text-[11px] font-bold leading-5 text-text-secondary">{row.rowLabel}</div> : null}
      </div>
    ),
  },
  {
    key: "risk",
    header: "הסיכון",
    widthClassName: "w-[19%]",
    cellClassName: "align-middle text-center",
    renderView: (value) => <div className="whitespace-pre-wrap text-center leading-6">{String(value || "לא הוזן סיכון")}</div>,
  },
  {
    key: "riskScoreBefore",
    header: "דירוג לפני צמצום",
    widthClassName: "w-[13%]",
    cellClassName: "align-middle text-center",
    renderView: (value) => <span className="font-black">{String(value || "לא הוזן")}</span>,
  },
  {
    key: "mitigation",
    header: "פעולות לצמצום הסיכון",
    widthClassName: "w-[22%]",
    cellClassName: "align-middle text-center",
    renderView: (value) => <RiskMitigationDisplay mitigation={String(value || "")} variant="document" />,
  },
  {
    key: "riskScoreAfter",
    header: "דירוג אחרי צמצום",
    widthClassName: "w-[13%]",
    cellClassName: "align-middle text-center",
    renderView: (value) => <span className="font-black">{String(value || "לא הוזן")}</span>,
  },
  {
    key: "owner",
    header: "אחראי",
    widthClassName: "w-[15%]",
    cellClassName: "align-middle text-center",
    renderView: (value) => <span className="font-bold">{String(value || "לא הוגדר")}</span>,
  },
];

export function RiskManagementDocument({ rows, isComplete = false, onGoToSafetyColumn, actions }: RiskManagementDocumentProps) {
  return (
    <MasterFormTemplate<RiskDocumentRow>
      title={
        <>
          ניהול סיכונים <span className="text-xl font-normal text-text-muted">(נספח ט״ז)</span>
        </>
      }
      departmentName=""
      blessingPosition="right"
      blessingClassName="text-xs font-normal"
      headerLogo={<OrganizationLogo />}
      organizationName=""
      submissionInstructions=""
      signatureFields={[]}
      hideHeaderRule
      hideFooterRule
      showTable
      tableColumns={columns}
      tableData={rows}
      emptyStateText="אין עדיין סיכונים שהוזנו בעמודת הבטיחות בלו״ז המפורט."
      actions={actions}
      beforeTable={
        <>
          {!isComplete ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 print:hidden md:flex-row md:items-center md:justify-between">
              <span>המילוי והעריכה של ניהול הסיכונים מתבצעים בעמודת הבטיחות שבלו״ז המפורט.</span>
              {onGoToSafetyColumn ? (
                <button
                  type="button"
                  onClick={onGoToSafetyColumn}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 text-xs font-black text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100"
                >
                  לעמודת הבטיחות בלו״ז
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      }
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-sm font-bold leading-7 text-brand-dark">
          המסמך נוצר אוטומטית מתוך עמודת הבטיחות בלו״ז המפורט. עדכון הסיכונים, פעולות הצמצום והאחראים מתבצע בלו״ז בלבד, ולא מתוך המסמך.
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export default RiskManagementDocument;
