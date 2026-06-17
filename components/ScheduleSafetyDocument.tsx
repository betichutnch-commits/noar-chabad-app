"use client";

import Image from "next/image";
import type React from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";

export type ScheduleSafetyDocumentRow = {
  day: string;
  time: string;
  location: string;
  occurrence: string;
  risk: string;
  mitigation: string;
  notes: string;
};

export type ScheduleSafetyDocumentProps = {
  rows: ScheduleSafetyDocumentRow[];
  actions?: React.ReactNode;
};

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

const compactCell = "align-middle text-center text-[11px] leading-5";
const compactHeader = "text-[11px] leading-5";

const columns: Array<MasterFormColumn<ScheduleSafetyDocumentRow>> = [
  {
    key: "day",
    header: "יום",
    widthClassName: "w-[8%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-black">{String(value || "-")}</span>,
  },
  {
    key: "time",
    header: "שעה",
    widthClassName: "w-[9%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "-")}</span>,
  },
  {
    key: "location",
    header: "מקום",
    widthClassName: "w-[15%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap">{String(value || "-")}</div>,
  },
  {
    key: "occurrence",
    header: "התרחשות",
    widthClassName: "w-[18%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap font-bold">{String(value || "-")}</div>,
  },
  {
    key: "risk",
    header: "סיכון",
    widthClassName: "w-[16%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap">{String(value || "-")}</div>,
  },
  {
    key: "mitigation",
    header: "צמצום סיכון",
    widthClassName: "w-[19%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap">{String(value || "-")}</div>,
  },
  {
    key: "notes",
    header: "הערות",
    widthClassName: "w-[15%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap">{String(value || "-")}</div>,
  },
];

export function ScheduleSafetyDocument({ rows, actions }: ScheduleSafetyDocumentProps) {
  return (
    <MasterFormTemplate<ScheduleSafetyDocumentRow>
      title="לו״ז ודגשי בטיחות"
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
      emptyStateText="אין עדיין שורות לו״ז להצגה."
      actions={actions}
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-xs font-bold leading-6 text-brand-dark print:hidden">
          המסמך נוצר אוטומטית מתוך הלו״ז המפורט. עדכון השעות, ההתרחשויות, הסיכונים, צמצום הסיכונים וההערות מתבצע בלו״ז בלבד.
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export default ScheduleSafetyDocument;
