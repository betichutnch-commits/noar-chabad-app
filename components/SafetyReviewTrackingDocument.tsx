"use client";

import Image from "next/image";
import type React from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";

export type SafetyReviewTrackingRow = {
  category: string;
  title: string;
  handling: string;
  status: string;
  owner: string;
  note: string;
};

const statusDisplay = (status: string) => {
  if (status === "מוכן PDF" || status === "נבדק") return "מוכן";
  if (status === "בטיפול" || status === "מוכן לעריכה") return "בעבודה";
  if (!status || status === "להכנה") return "לטיפול";
  return status;
};

const statusTone = (status: string) => {
  const text = statusDisplay(status);
  if (text === "לטיפול דחוף") return "text-red-700";
  if (text === "לטיפול") return "text-pink-700";
  if (text === "בעבודה") return "text-orange-700";
  if (text === "מוכן") return "text-emerald-700";
  if (text === "לא נדרש") return "text-gray-700";
  return "text-pink-700";
};

export type SafetyReviewTrackingDocumentProps = {
  rows: SafetyReviewTrackingRow[];
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

const columns: Array<MasterFormColumn<SafetyReviewTrackingRow>> = [
  {
    key: "category",
    header: "קטגוריה",
    widthClassName: "w-[16%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "-")}</span>,
  },
  {
    key: "title",
    header: "שם המסמך",
    widthClassName: "w-[25%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-black">{String(value || "-")}</span>,
  },
  {
    key: "handling",
    header: "סוג טיפול",
    widthClassName: "w-[15%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
  },
  {
    key: "status",
    header: "סטטוס",
    widthClassName: "w-[13%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => {
      const text = statusDisplay(String(value || "לטיפול"));
      return <span className={`font-black ${statusTone(text)}`}>{text}</span>;
    },
  },
  {
    key: "owner",
    header: "אחראי",
    widthClassName: "w-[13%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
  },
  {
    key: "note",
    header: "הערות ביקורת",
    widthClassName: "w-[18%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap">{String(value || "-")}</div>,
  },
];

export function SafetyReviewTrackingDocument({ rows, actions }: SafetyReviewTrackingDocumentProps) {
  return (
    <MasterFormTemplate<SafetyReviewTrackingRow>
      title="טבלת מעקב לביקורת מחלקת הבטיחות"
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
      emptyStateText="אין מסמכים להצגה."
      actions={actions}
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-xs font-bold leading-6 text-brand-dark print:hidden">
          המסמך נוצר אוטומטית מטבלת מסמכי תיק הטיול. עדכון סטטוס, אחראי והערות מתבצע בטבלת מסמכי תיק הטיול.
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export default SafetyReviewTrackingDocument;
