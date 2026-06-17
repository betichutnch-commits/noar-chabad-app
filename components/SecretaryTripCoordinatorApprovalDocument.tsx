"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { Button } from "@/components/ui/Button";
import {
  defaultAutofillParticipantsPayload,
  getSecretaryTripCoordinatorAutofill,
  getUploadedDocumentFiles,
  type AutofillParticipantsPayload,
  type SecretaryTripCoordinatorAutofill,
  type SecretaryTripCoordinatorItineraryRow,
  type TripAutofillMeta,
} from "@/lib/tripDocumentAutofill";

const compactCell = "align-middle text-center text-[11px] leading-5";
const compactHeader = "text-[11px] leading-5";

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

function InlineField({ label, value, width = "min-w-36" }: { label?: string; value?: string; width?: string }) {
  return (
    <span className="mx-1 inline-flex items-baseline gap-2 align-baseline">
      {label ? <span className="font-black">{label}:</span> : null}
      <span className={`inline-block border-b border-brand-dark px-0 text-center font-bold leading-inherit text-brand-dark ${width}`}>{value || "\u00A0"}</span>
    </span>
  );
}

const columns: Array<MasterFormColumn<SecretaryTripCoordinatorItineraryRow>> = [
  {
    key: "date",
    header: "התאריך",
    widthClassName: "w-[12%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
  {
    key: "timeRange",
    header: "משעה עד שעה",
    widthClassName: "w-[13%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
  {
    key: "activity",
    header: "פירוט הפעילות",
    widthClassName: "w-[28%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <div className="whitespace-pre-wrap text-right font-bold leading-6">{String(value || "")}</div>,
  },
  {
    key: "safetyHighlights",
    header: "דגשים בטיחותיים",
    widthClassName: "w-[16%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
  {
    key: "response",
    header: "המענה הניתן",
    widthClassName: "w-[16%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
  {
    key: "notes",
    header: "הערות",
    widthClassName: "w-[15%]",
    headerClassName: compactHeader,
    cellClassName: compactCell,
    renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
  },
];

function LinesBlock({ title, lines = 2 }: { title: string; lines?: number }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-black text-brand-dark">{title}</div>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-7 border-b border-brand-dark/70" />
      ))}
    </div>
  );
}

function SignaturePair({ rightLabel, leftLabel }: { rightLabel: string; leftLabel: string }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-2 text-center">
        <div className="h-10 border-b border-brand-dark/70" />
        <div className="text-xs font-black text-brand-dark">{rightLabel}</div>
      </div>
      <div className="space-y-2 text-center">
        <div className="h-10 border-b border-brand-dark/70" />
        <div className="text-xs font-black text-brand-dark">{leftLabel}</div>
      </div>
    </div>
  );
}

export function SecretaryTripCoordinatorApprovalDocument({
  trip,
  autofill,
  actions,
}: {
  trip?: TripAutofillMeta | null;
  autofill?: SecretaryTripCoordinatorAutofill | null;
  actions?: React.ReactNode;
}) {
  const values =
    autofill ||
    getSecretaryTripCoordinatorAutofill({
      trip: trip || null,
      rows: [],
      participantsPayload: defaultAutofillParticipantsPayload,
    });

  return (
    <MasterFormTemplate<SecretaryTripCoordinatorItineraryRow>
      title={
        <>
          אישור תוכנית הטיול <span className="text-xl font-normal text-text-muted">(נספח ה&apos;)</span>
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
      tableData={values.itineraryRows}
      actions={actions}
      beforeTable={
        <div className="mx-auto max-w-[170mm] space-y-8 text-brand-dark">
          <section className="space-y-2 pr-[0.5cm] text-sm font-normal leading-8">
            <p>
              <span className="font-black">אל:</span> מזכ״לית הארגון
              <InlineField label="טלפון" width="min-w-32" />
            </p>
            <p>
              <span className="font-black">מאת:</span>
              <InlineField label="האחראי על הטיול" value={values.coordinatorName} width="min-w-48" />
              <InlineField label="טלפון" value={values.coordinatorPhone} width="min-w-32" />
            </p>
          </section>

          <section className="space-y-3 text-justify text-base leading-9 print:text-sm print:leading-8">
            <p className="text-justify">
              אני מבקש/ת לאשר את תוכנית הטיול לתלמידי כיתות
              <InlineField value={values.classLabel} width="min-w-24" />
              בסניף
              <InlineField value={values.branch} width="min-w-36" />
              של מחלקת
              <InlineField value={values.department} width="min-w-36" />
              שיתקיים במקום / באזור
              <InlineField value={values.tripName} width="min-w-52" />
              בתאריכים
              <InlineField value={values.tripDates} width="min-w-56" />
              למשך
              <InlineField value={values.tripDuration} width="min-w-16" />
              ימים.
            </p>

            <p className="text-justify">
              מספר התלמידים המתוכנן
              <InlineField value={values.travelerCount} width="min-w-20" />
              מקום הלינה
              <InlineField value={values.sleepLocation} width="min-w-52" />
              מספר הטלפון
              <InlineField value={values.lodgingPhone} width="min-w-32" />
            </p>

            <p className="text-justify">
              מספר האישור של הטיול מהלשכה לתיאום טיולים
              <InlineField value={values.mokedApprovalNumber} width="min-w-44" />
              חברת ההסעה
              <InlineField value={values.transportationCompany} width="min-w-36" />
              מספר הטלפון
              <InlineField value={values.transportationPhone} width="min-w-32" />
            </p>

            <p className="text-justify">
              חברת ההדרכה
              <InlineField value={values.guideCompany} width="min-w-40" />
              מספר הטלפון
              <InlineField value={values.guidePhone} width="min-w-32" />
              מספר הטלפון הסלולרי של האחראי על הטיול
              <InlineField value={values.coordinatorPhone} width="min-w-32" />
            </p>

            <p className="text-justify">
              <span className="font-black">מסלול הטיול: </span>
              תיאור ודגשים מיוחדים, כגון אטרקציות, פעילות מים, חניות, מסלול הליכה, אתרים, לינה:
            </p>
          </section>
        </div>
      }
      afterTable={
        <div className="space-y-8">
          <LinesBlock title="הערות ודגשים" lines={2} />
          <div className="mx-auto max-w-lg space-y-2 text-center">
            <div className="h-10 border-b border-brand-dark/70" />
            <div className="text-xs font-black text-brand-dark">חתימת המורה האחראי על הטיול</div>
          </div>
          <section className="space-y-8 print:break-before-page">
            <LinesBlock title="הערות מזכ״לית הארגון" lines={4} />
            <SignaturePair rightLabel="אישור מזכ״לית הארגון" leftLabel="אישור רכז הטיולים" />
          </section>
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:h-9 [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export function SecretaryTripCoordinatorApprovalDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tripId = params.id;
  const [trip, setTrip] = useState<TripAutofillMeta | null>(null);
  const [autofill, setAutofill] = useState<SecretaryTripCoordinatorAutofill | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAutofill() {
      const [planResponse, participantsResponse, documentsResponse] = await Promise.all([
        fetch(`/api/trips/${tripId}/plan`, { cache: "no-store" }),
        fetch(`/api/trips/${tripId}/plan/participants`, { cache: "no-store" }),
        fetch(`/api/trips/${tripId}/plan/documents`, { cache: "no-store" }),
      ]);
      const [planPayload, participantsPayload, documentsPayload] = await Promise.all([
        planResponse.ok ? planResponse.json() : Promise.resolve({ trip: null, rows: [] }),
        participantsResponse.ok ? participantsResponse.json() : Promise.resolve(defaultAutofillParticipantsPayload),
        documentsResponse.ok ? documentsResponse.json() : Promise.resolve({ documents: [] }),
      ]);
      if (cancelled) return;
      const nextTrip = (planPayload.trip || null) as TripAutofillMeta | null;
      const documents = Array.isArray(documentsPayload.documents) ? documentsPayload.documents : [];
      const mokedOverride = documents.find((item: { document_key?: string }) => item.document_key === "moked-teva-approval");
      const payload: AutofillParticipantsPayload = {
        participants: Array.isArray(participantsPayload.participants) ? participantsPayload.participants : [],
        staff: Array.isArray(participantsPayload.staff) ? participantsPayload.staff : [],
        buses: Array.isArray(participantsPayload.buses) ? participantsPayload.buses : [],
        assignmentSets: Array.isArray(participantsPayload.assignmentSets) ? participantsPayload.assignmentSets : [],
      };
      setTrip(nextTrip);
      setAutofill(
        getSecretaryTripCoordinatorAutofill({
          trip: nextTrip,
          rows: Array.isArray(planPayload.rows) ? planPayload.rows : [],
          participantsPayload: payload,
          uploadedFilesByDocumentKey: {
            "moked-teva-approval": getUploadedDocumentFiles(mokedOverride?.form_data, mokedOverride?.pdf_url),
          },
        }),
      );
    }
    void loadAutofill();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const actions = useMemo(
    () => (
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
    ),
    [router, tripId],
  );

  return <SecretaryTripCoordinatorApprovalDocument trip={trip} autofill={autofill} actions={actions} />;
}

export default SecretaryTripCoordinatorApprovalDocument;
