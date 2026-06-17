"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Phone, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { Button } from "@/components/ui/Button";

type ContactRow = {
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  extraPhone: string;
  email: string;
  notes: string;
};

type ContactsPayload = {
  contacts?: ContactRow[];
  error?: string;
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

const baseColumn = (key: keyof ContactRow, header: string, widthClassName: string): MasterFormColumn<ContactRow> => ({
  key,
  header,
  widthClassName,
  headerClassName: compactHeader,
  cellClassName: compactCell,
  renderView: (value) => <span className="font-bold">{String(value || "-")}</span>,
});

const columns: Array<MasterFormColumn<ContactRow>> = [
  baseColumn("role", "תפקיד", "w-[18%]"),
  baseColumn("firstName", "שם פרטי", "w-[11%]"),
  baseColumn("lastName", "שם משפחה", "w-[13%]"),
  baseColumn("phone", "טלפון", "w-[12%]"),
  baseColumn("extraPhone", "טלפון נוסף", "w-[12%]"),
  baseColumn("email", "אימייל", "w-[17%]"),
  baseColumn("notes", "הערות", "w-[17%]"),
];

export function TripContactsDocument({ rows, actions }: { rows: ContactRow[]; actions?: React.ReactNode }) {
  return (
    <MasterFormTemplate<ContactRow>
      title="רשימת קשר חיונית לטיול"
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
      emptyStateText="אין עדיין אנשי קשר להצגה."
      actions={actions}
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-xs font-bold leading-6 text-brand-dark print:hidden">
          המסמך מסונכרן עם אייקון רשימת הקשר בתכנון הטיול. עדכון אנשי הצוות, שיוך אחראי בטיחות או תקני החובה יתעדכן כאן אוטומטית.
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export function TripContactsDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tripId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ContactsPayload>({});

  const loadContacts = useCallback(async (options?: { cancelled?: () => boolean }) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/trips/${tripId}/contacts`, { credentials: "include", cache: "no-store" });
      const nextPayload = (await response.json().catch(() => ({}))) as ContactsPayload;
      if (!response.ok) throw new Error(nextPayload.error || "טעינת רשימת הקשר נכשלה");
      if (!options?.cancelled?.()) setPayload(nextPayload);
    } catch (err) {
      if (!options?.cancelled?.()) setError(err instanceof Error ? err.message : "טעינת רשימת הקשר נכשלה");
    } finally {
      if (!options?.cancelled?.()) setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    void loadContacts({ cancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [loadContacts]);

  const rows = useMemo(() => payload.contacts || [], [payload.contacts]);

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען רשימת קשר...</div> : null}
      {error ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">{error}</div> : null}
      <TripContactsDocument
        rows={rows}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`)} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan?quickAction=contacts`)} className="px-4">
              <Phone size={16} />
              חזרה לרשימת הקשר
            </Button>
            <Button variant="outline" onClick={() => void loadContacts()} className="px-4">
              <RefreshCw size={16} />
              רענון
            </Button>
          </div>
        }
      />
    </>
  );
}

export default TripContactsDocument;
