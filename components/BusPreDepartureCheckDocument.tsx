"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { Button } from "@/components/ui/Button";

type CheckRow = {
  index: string;
  subject: string;
  check: string;
  status: string;
  notes: string;
};

const compactCell = "align-middle text-center text-[11px] leading-5";
const compactHeader = "text-[11px] leading-5";

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div className="flex min-h-10 items-end gap-2 border-b border-brand-dark/70 pb-1">
      <span className="shrink-0 text-xs font-black text-brand-dark">{label}:</span>
      <span className="h-5 flex-1" />
    </div>
  );
}

const columns: Array<MasterFormColumn<CheckRow>> = [
  {
    key: "index",
    header: "מס׳",
    widthClassName: "w-[6%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-black">{String(value || "")}</span>,
  },
  {
    key: "subject",
    header: "נושא",
    widthClassName: "w-[18%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-black">{String(value || "")}</span>,
  },
  {
    key: "check",
    header: "בדיקה נדרשת",
    widthClassName: "w-[42%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap text-right font-bold leading-6">{String(value || "")}</div>,
  },
  {
    key: "status",
    header: "תקין / לא תקין",
    widthClassName: "w-[16%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
  {
    key: "notes",
    header: "הערות",
    widthClassName: "w-[18%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
];

const rows: CheckRow[] = [
  {
    index: "1",
    subject: "מסמכי הנהג",
    check: "רישיון נהיגה מתאים ובתוקף, תעודה מזהה ופרטי קשר זמינים.",
    status: "",
    notes: "",
  },
  {
    index: "2",
    subject: "מסמכי האוטובוס",
    check: "רישיון רכב, ביטוח ואישור קצין בטיחות בתעבורה בתוקף.",
    status: "",
    notes: "",
  },
  {
    index: "3",
    subject: "תקינות כללית",
    check: "בדיקה חזותית של האוטובוס: צמיגים, תאורה, דלתות, חלונות ומעברים פנויים.",
    status: "",
    notes: "",
  },
  {
    index: "4",
    subject: "חגורות בטיחות",
    check: "קיום חגורות בטיחות ותקינותן לכל המקומות הנדרשים.",
    status: "",
    notes: "",
  },
  {
    index: "5",
    subject: "ציוד בטיחות",
    check: "ערכת עזרה ראשונה, מטף, פטיש חירום ושילוט יציאות חירום.",
    status: "",
    notes: "",
  },
  {
    index: "6",
    subject: "מים וציוד נלווה",
    check: "הימצאות מים לשתייה וציוד נדרש נוסף בהתאם לאופי הנסיעה והטיול.",
    status: "",
    notes: "",
  },
  {
    index: "7",
    subject: "רשימות ונוכחות",
    check: "רשימת נוסעים מעודכנת, אחראי הסעה מוגדר ומספרי טלפון זמינים.",
    status: "",
    notes: "",
  },
  {
    index: "8",
    subject: "תדרוך לפני יציאה",
    check: "תדרוך הנהג ואחראי ההסעה לגבי מסלול, נקודות עצירה, נהלי עלייה וירידה ונהלי חירום.",
    status: "",
    notes: "",
  },
];

export function BusPreDepartureCheckDocument({ actions }: { actions?: React.ReactNode }) {
  return (
    <MasterFormTemplate<CheckRow>
      title={
        <>
          בדיקת אוטובוס לפני יציאה <span className="text-xl font-normal text-text-muted">(נספח ט״ו)</span>
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
      actions={actions}
      beforeTable={
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="שם הטיול" />
          <Field label="תאריך" />
          <Field label="שעת יציאה" />
          <Field label="מס׳ אוטובוס" />
          <Field label="חברת הסעות" />
          <Field label="שם הנהג" />
          <Field label="טלפון הנהג" />
          <Field label="אחראי/ת הסעה" />
          <Field label="טלפון אחראי/ת" />
        </div>
      }
      afterTable={
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="שם הבודק/ת" />
          <Field label="חתימה" />
          <Field label="שעת אישור יציאה" />
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export function BusPreDepartureCheckDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tripId = params.id;
  return (
    <BusPreDepartureCheckDocument
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`)} className="px-4">
            <ArrowRight size={16} />
            חזרה למסמכי תיק הטיול
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="px-4">
            <FileText size={16} />
            הדפסה / PDF
          </Button>
        </div>
      }
    />
  );
}

export default BusPreDepartureCheckDocument;
