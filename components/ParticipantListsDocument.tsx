"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { Button } from "@/components/ui/Button";

type ParticipantType = "participant" | "staff";
type AssignmentAudience = "participants" | "staff" | "both";

type Participant = {
  id: string;
  type: ParticipantType;
  name: string;
  parentApproval: string;
  role: string;
  busId?: string | null;
  localNotes?: string | null;
  raw?: Record<string, unknown> | null;
};

type PlanBus = {
  id: string;
  name: string;
  bus_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  company?: string | null;
  capacity: number;
  leader_name?: string | null;
  leader_phone?: string | null;
  leader_email?: string | null;
  notes?: string | null;
};

type AssignmentSet = {
  id: string;
  kind: string;
  audience: AssignmentAudience;
  title: string;
  orderIndex: number;
  items: Array<{
    id: string;
    busId?: string | null;
    name: string;
    orderIndex: number;
    members: Array<{ id: string; participantId: string }>;
  }>;
};

type ParticipantsPayload = {
  participants?: Participant[];
  staff?: Participant[];
  buses?: PlanBus[];
  assignmentSets?: AssignmentSet[];
  error?: string;
};

type DocumentVariant = "parent-approvals" | "entry-registration" | "staff-list" | "participant-groups" | "bus-assignments" | "transport-control";
type DocumentRow = Record<string, string>;

const documentTitles: Record<DocumentVariant, string> = {
  "parent-approvals": "רשימת חניכים + אישורי הורים",
  "entry-registration": "רישום לכניסה חניכים + צוות",
  "staff-list": "רשימה של הצוות",
  "participant-groups": "רשימת חניכים לפי קבוצות",
  "bus-assignments": "רשימת חניכים לפי הסעות",
  "transport-control": "טבלת שליטה בהסעות",
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

const rawText = (person: Participant, key: string) => String(person.raw?.[key] ?? "").trim();
const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};
const fullName = (person: Participant) => {
  const split = splitName(person.name);
  return [rawText(person, "firstName") || split.firstName, rawText(person, "lastName") || split.lastName].filter(Boolean).join(" ") || person.name || "-";
};
const parentNames = (person: Participant) => [rawText(person, "fatherName"), rawText(person, "motherName")].filter(Boolean).join(" / ");
const ageFromBirthDate = (birthDate: string) => {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
};

const audienceAllows = (set: AssignmentSet, person: Participant) =>
  set.audience === "both" || (set.audience === "participants" && person.type === "participant") || (set.audience === "staff" && person.type === "staff");

const assignmentValue = (set: AssignmentSet, person: Participant) => {
  if (!audienceAllows(set, person)) return "";
  const item = set.items.find((candidate) => candidate.members.some((member) => member.participantId === person.id));
  return item?.name || "";
};

const busLabel = (bus?: PlanBus | null, fallback?: string) => {
  if (!bus) return fallback || "";
  return bus.bus_number || bus.name || fallback || "";
};

const assignmentColumns = (sets: AssignmentSet[]) =>
  [...sets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((set) => ({
      key: `assignment_${set.id}`,
      header: set.title,
      widthClassName: "w-[11%]",
    }));

const baseColumn = (key: string, header: string, widthClassName: string): MasterFormColumn<DocumentRow> => ({
  key,
  header,
  widthClassName,
  headerClassName: compactHeader,
  cellClassName: compactCell,
  renderView: (value) => <span className="font-bold">{String(value || "-")}</span>,
});

const buildColumns = (variant: DocumentVariant, sets: AssignmentSet[]): Array<MasterFormColumn<DocumentRow>> => {
  const assignments = assignmentColumns(sets).map((column) => baseColumn(column.key, column.header, column.widthClassName));
  if (variant === "bus-assignments") {
    return [
      baseColumn("bus", "אוטובוס", "w-[14%]"),
      baseColumn("fullName", "שם פרטי ומשפחה", "w-[20%]"),
      baseColumn("identity", "ת.ז.", "w-[13%]"),
      baseColumn("branch", "סניף", "w-[12%]"),
      baseColumn("grade", "כיתה", "w-[9%]"),
      baseColumn("leader", "אחראי הסעה", "w-[14%]"),
      baseColumn("leaderPhone", "טל׳ אחראי", "w-[10%]"),
      baseColumn("notes", "הערות", "w-[8%]"),
    ];
  }
  if (variant === "transport-control") {
    return [
      baseColumn("bus", "מס׳ אוטובוס", "w-[11%]"),
      baseColumn("company", "חברת האוטובוס", "w-[13%]"),
      baseColumn("driver", "שם הנהג", "w-[12%]"),
      baseColumn("driverPhone", "טל׳ הנהג", "w-[11%]"),
      baseColumn("capacity", "מקומות", "w-[8%]"),
      baseColumn("assigned", "משובצים", "w-[8%]"),
      baseColumn("leader", "אחראי הסעה", "w-[12%]"),
      baseColumn("leaderPhone", "טל׳ אחראי", "w-[11%]"),
      baseColumn("leaderEmail", "אימייל אחראי", "w-[14%]"),
    ];
  }
  if (variant === "parent-approvals") {
    return [
      baseColumn("fullName", "שם פרטי ומשפחה", "w-[22%]"),
      baseColumn("identity", "ת.ז.", "w-[14%]"),
      baseColumn("branch", "סניף", "w-[14%]"),
      baseColumn("grade", "כיתה", "w-[10%]"),
      baseColumn("parents", "שם הורים", "w-[20%]"),
      baseColumn("parentApproval", "אישור הורים", "w-[20%]"),
    ];
  }
  if (variant === "staff-list") {
    return [
      baseColumn("role", "תפקיד", "w-[12%]"),
      baseColumn("fullName", "שם פרטי ומשפחה", "w-[18%]"),
      baseColumn("identity", "ת.ז.", "w-[12%]"),
      baseColumn("branch", "סניף", "w-[10%]"),
      baseColumn("grade", "כיתה", "w-[8%]"),
      baseColumn("parents", "שם הורים", "w-[14%]"),
      baseColumn("parentApproval", "אישור הורים", "w-[13%]"),
      baseColumn("policeApproval", "אישור משטרה מעל גיל 18", "w-[13%]"),
    ];
  }
  if (variant === "participant-groups") {
    return [baseColumn("fullName", "שם פרטי ומשפחה", "w-[22%]"), baseColumn("branch", "סניף", "w-[12%]"), baseColumn("grade", "כיתה", "w-[10%]"), ...assignments];
  }
  return [baseColumn("fullName", "שם פרטי ומשפחה", "w-[20%]"), baseColumn("identity", "ת.ז.", "w-[13%]"), baseColumn("branch", "סניף", "w-[12%]"), baseColumn("grade", "כיתה", "w-[10%]"), ...assignments];
};

const personBase = (person: Participant): DocumentRow => ({
  fullName: fullName(person),
  identity: rawText(person, "identity"),
  branch: rawText(person, "branch") || person.role,
  grade: rawText(person, "grade"),
  parents: parentNames(person),
  parentApproval: person.parentApproval || rawText(person, "parentApproval"),
});

const buildRows = (variant: DocumentVariant, payload: ParticipantsPayload): DocumentRow[] => {
  const participants = payload.participants || [];
  const staff = payload.staff || [];
  const sets = payload.assignmentSets || [];
  const buses = payload.buses || [];
  const peopleById = new Map([...participants, ...staff].map((person) => [person.id, person]));
  const busesById = new Map(buses.map((bus) => [bus.id, bus]));
  if (variant === "transport-control") {
    const busAssignmentItems = sets.filter((set) => set.kind === "buses").flatMap((set) => set.items);
    return buses.map((bus) => {
      const assignedFromSet = busAssignmentItems.filter((item) => item.busId === bus.id).reduce((sum, item) => sum + item.members.length, 0);
      const assignedFromDirect = [...participants, ...staff].filter((person) => person.busId === bus.id).length;
      return {
        bus: busLabel(bus),
        company: bus.company || "",
        driver: bus.driver_name || "",
        driverPhone: bus.driver_phone || "",
        capacity: String(bus.capacity || ""),
        assigned: String(assignedFromSet || assignedFromDirect || 0),
        leader: bus.leader_name || "",
        leaderPhone: bus.leader_phone || "",
        leaderEmail: bus.leader_email || "",
      };
    });
  }
  if (variant === "bus-assignments") {
    const rows: DocumentRow[] = [];
    const busSets = sets.filter((set) => set.kind === "buses");
    for (const set of busSets) {
      for (const item of [...set.items].sort((a, b) => a.orderIndex - b.orderIndex)) {
        const bus = item.busId ? busesById.get(item.busId) : null;
        for (const member of item.members) {
          const person = peopleById.get(member.participantId);
          if (!person || person.type !== "participant") continue;
          rows.push({
            ...personBase(person),
            bus: busLabel(bus, item.name),
            leader: bus?.leader_name || "",
            leaderPhone: bus?.leader_phone || "",
            notes: person.localNotes || "",
          });
        }
      }
    }
    if (rows.length) return rows;
    return participants
      .filter((person) => Boolean(person.busId))
      .map((person) => {
        const bus = person.busId ? busesById.get(person.busId) : null;
        return {
          ...personBase(person),
          bus: busLabel(bus),
          leader: bus?.leader_name || "",
          leaderPhone: bus?.leader_phone || "",
          notes: person.localNotes || "",
        };
      });
  }
  const people = variant === "staff-list" ? staff : variant === "entry-registration" ? [...participants, ...staff] : participants;

  return people.map((person) => {
    const row = personBase(person);
    for (const set of sets) row[`assignment_${set.id}`] = assignmentValue(set, person);
    if (variant === "staff-list") {
      const age = ageFromBirthDate(rawText(person, "birthDate"));
      row.role = rawText(person, "staffRole") || person.role;
      row.policeApproval = age !== null && age < 18 ? "לא נדרש" : rawText(person, "policeApproval");
    }
    return row;
  });
};

export function ParticipantListsDocument({ variant, rows, columns, actions }: { variant: DocumentVariant; rows: DocumentRow[]; columns: Array<MasterFormColumn<DocumentRow>>; actions?: React.ReactNode }) {
  return (
    <MasterFormTemplate<DocumentRow>
      title={documentTitles[variant]}
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
      emptyStateText="אין עדיין נתונים להצגה."
      actions={actions}
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-xs font-bold leading-6 text-brand-dark print:hidden">
          המסמך נוצר אוטומטית מתוך לשונית פרטי חניכים וצוות והשיבוצים. עדכון הנתונים מתבצע שם בלבד.
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    />
  );
}

export function ParticipantListsDocumentPage({ variant }: { variant: DocumentVariant }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tripId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ParticipantsPayload>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/trips/${tripId}/plan/participants`, { credentials: "include" });
        const nextPayload = (await response.json().catch(() => ({}))) as ParticipantsPayload;
        if (!response.ok) throw new Error(nextPayload.error || "טעינת נתוני חניכים וצוות נכשלה");
        if (!cancelled) setPayload(nextPayload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת נתוני חניכים וצוות נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const columns = useMemo(() => buildColumns(variant, payload.assignmentSets || []), [payload.assignmentSets, variant]);
  const rows = useMemo(() => buildRows(variant, payload), [payload, variant]);

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען רשימה...</div> : null}
      {error ? <div className="fixed right-4 top-4 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700 shadow-md print:hidden">{error}</div> : null}
      <ParticipantListsDocument
        variant={variant}
        rows={rows}
        columns={columns}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`)} className="px-4">
              <ArrowRight size={16} />
              חזרה למסמכי תיק הטיול
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan`)} className="px-4">
              <UsersRound size={16} />
              חזרה לפרטי חניכים וצוות
            </Button>
          </div>
        }
      />
    </>
  );
}

export default ParticipantListsDocument;
