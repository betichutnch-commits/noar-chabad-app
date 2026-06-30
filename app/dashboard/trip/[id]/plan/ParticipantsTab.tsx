"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeInfo,
  Building2,
  Bus,
  CalendarDays,
  CheckCircle2,
  CircleUser,
  ClipboardCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  HeartPulse,
  Hash,
  IdCard,
  Loader2,
  Mail,
  Pencil,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  School,
  ShieldCheck,
  Trash2,
  Upload,
  Unlink,
  Users,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DragScrollArea } from "@/components/ui/DragScrollArea";
import { Select } from "@/components/ui/Select";
import { DEFAULT_REQUIRED_ROLE_RULES, REQUIRED_STAFF_RAW } from "@/lib/tripRequiredRoles";
import { canAddPlaceholderToMerge, staffRoleKeyLabel, validateStaffRoleMerge } from "@/lib/staffRoleMerge";
import { getTripParticipantLabels, type TripParticipantLabels } from "@/lib/tripParticipantLabels";
import { canSplitStaffRole, roleLabelSlotIndex } from "@/lib/staffRoleSplit";
import {
  applyRegistrationSnapshotToDraft,
  mergeRegistrationSnapshot,
  readParticipantRawField,
  readRegistrationFieldsFromRaw,
  resolveParticipantIdentity,
  STAFF_REGISTRATION_DRAFT_FIELDS,
  PARTICIPANT_REGISTRATION_DRAFT_FIELDS,
  type RegistrationSnapshot,
} from "@/lib/participantRegistrationFill";
import {
  formatStaffRoleLabelForGender,
  normalizeIdentityNumber,
  normalizeStaffGender,
  requiresStaffPoliceApproval,
  resolveStaffGender,
  staffGenderLabel,
  staffGenderShortLabel,
  type StaffGender,
} from "@/lib/staffGender";

const STAFF_SLOT_PLACEHOLDER_FIRST_NAME = "תקן חסר:";

const isRequiredStaffPlaceholderFullName = (name: string) => /^תקן\s+חסר/i.test(name.trim());

const isStaffSlotPlaceholderFirstName = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || trimmed === STAFF_SLOT_PLACEHOLDER_FIRST_NAME || trimmed.startsWith("תקן חסר") || trimmed === "תקן";
};

const staffPlaceholderRoleLabels = (
  raw: Record<string, unknown> | null | undefined,
  staffRole = "",
  personRole = "",
) => {
  const labels = requiredRoleLabels(raw);
  const role = staffRole.trim() || String(personRole || "").trim();
  return Array.from(new Set([...labels, role].filter(Boolean)));
};

const isStaffSlotPlaceholderNamePart = (
  value: string,
  raw: Record<string, unknown> | null | undefined,
  staffRole = "",
  personRole = "",
) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (isStaffSlotPlaceholderFirstName(trimmed)) return true;
  if (/^חסר:/i.test(trimmed)) return true;
  const candidates = staffPlaceholderRoleLabels(raw, staffRole, personRole);
  if (candidates.includes(trimmed)) return true;
  return candidates.some((label) => trimmed.endsWith(label) || trimmed.includes(label));
};

const normalizeStaffSlotPlaceholderFirstName = (value: string) => (isStaffSlotPlaceholderFirstName(value) ? "" : value.trim());

type ParticipantType = "participant" | "staff";
type ParticipantSource = "manual" | "excel" | "airtable";
type AssignmentKind = "groups" | "buses" | "rooms" | "other";
type AssignmentAudience = "participants" | "staff" | "both";
type PeopleSectionTab = "participants" | "staff" | "assignments";
type TableTone = "cyan" | "amber";
type Participant = {
  id: string;
  source: ParticipantSource;
  sourceRecordId?: string | null;
  type: ParticipantType;
  name: string;
  phone: string;
  contactPhone: string;
  registrationStatus: string;
  paymentStatus: string;
  parentApproval: string;
  medicalNotes: string;
  role: string;
  notes: string;
  busId?: string | null;
  groupId?: string | null;
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
  kind: AssignmentKind;
  customKindLabel: string;
  audience: AssignmentAudience;
  title: string;
  orderIndex: number;
  items: AssignmentItem[];
};
type AssignmentItem = {
  id: string;
  busId?: string | null;
  name: string;
  orderIndex: number;
  members: AssignmentMember[];
};
type AssignmentMember = {
  id: string;
  participantId: string;
};
type Payload = {
  airtable: { configured: boolean; error: string | null; refreshedAt: string };
  participants: Participant[];
  staff: Participant[];
  buses: PlanBus[];
  groups: Array<{ id: string; name: string; target_size: number; notes?: string | null }>;
  assignmentSets: AssignmentSet[];
  localSchemaMissing?: boolean;
  registrationByIdentity?: Record<string, RegistrationSnapshot>;
  staffGenderByIdentity?: Record<string, StaffGender>;
  tripDepartment?: string | null;
};
type Props = {
  tripId: string;
  active: boolean;
  mode: "participants" | "transport";
  tourPeopleSection?: "participants" | "staff" | "assignments" | null;
};

type ParticipantDraft = {
  id: string;
  savedId?: string;
  source?: ParticipantSource;
  sourceRecordId?: string | null;
  type: ParticipantType;
  staffRole: string;
  firstName: string;
  lastName: string;
  identity: string;
  birthDate: string;
  grade: string;
  branch: string;
  gender: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  personalPhone: string;
  personalEmail: string;
  fatherEmail: string;
  medicalNotes: string;
  paymentStatus: string;
  parentApproval: string;
  policeApproval: string;
  raw?: Record<string, unknown> | null;
};

type DraftField = keyof Omit<ParticipantDraft, "id" | "savedId" | "source" | "sourceRecordId" | "type" | "raw">;

const openParticipantFields: DraftField[] = ["firstName", "lastName", "grade", "branch"];
const openStaffFields: DraftField[] = ["staffRole", "firstName", "lastName", "branch"];
const staffExcludedFields: DraftField[] = ["grade", "fatherEmail"];
const staffOnlyFields: DraftField[] = ["personalPhone", "personalEmail", "gender"];
const staffParentFields: DraftField[] = ["fatherName", "fatherPhone", "motherName", "motherPhone", "parentApproval"];

const participantFieldMeta: Record<
  DraftField,
  { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; kind?: "phone" | "email" | "gender" }
> = {
  staffRole: { label: "תפקיד", Icon: UserRoundCheck },
  firstName: { label: "שם פרטי", Icon: Users },
  lastName: { label: "שם משפחה", Icon: Users },
  identity: { label: "ת.ז.", Icon: IdCard },
  birthDate: { label: "ת. לידה", Icon: CalendarDays },
  gender: { label: "מגדר", Icon: CircleUser, kind: "gender" },
  grade: { label: "כיתה", Icon: School },
  branch: { label: "סניף", Icon: BadgeInfo },
  personalPhone: { label: "טלפון אישי", Icon: PhoneCall, kind: "phone" },
  personalEmail: { label: "דוא\"ל אישי", Icon: Mail, kind: "email" },
  fatherName: { label: "שם אבא", Icon: Users },
  fatherPhone: { label: "טל' אבא", Icon: PhoneCall, kind: "phone" },
  motherName: { label: "שם אמא", Icon: Users },
  motherPhone: { label: "טל' אמא", Icon: PhoneCall, kind: "phone" },
  fatherEmail: { label: "דוא\"ל אבא", Icon: Mail, kind: "email" },
  medicalNotes: { label: "רגישות רפואית", Icon: HeartPulse },
  paymentStatus: { label: "תשלום", Icon: CreditCard },
  parentApproval: { label: "אישור השתתפות", Icon: ClipboardCheck },
  policeApproval: { label: "אישור משטרה", Icon: ShieldCheck },
};

const missingValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return !normalized || ["לא", "no", "false", "חסר", "טרם", "לא שילם", "לא שולם"].some((token) => normalized.includes(token));
};

const rawText = (raw: Record<string, unknown> | null | undefined, key: DraftField) => String(raw?.[key] ?? "").trim();
const rawStringArray = (raw: Record<string, unknown> | null | undefined, key: string) => {
  const value = raw?.[key];
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
};
const isRequiredStaffPlaceholder = (person: Participant) => Boolean(person.raw?.[REQUIRED_STAFF_RAW.placeholder]);
const isRequiredStaffProtected = (row: ParticipantDraft) => Boolean(row.raw?.[REQUIRED_STAFF_RAW.protected]);
const requiredRoleLabels = (raw: Record<string, unknown> | null | undefined) => rawStringArray(raw, REQUIRED_STAFF_RAW.roleLabels);

const isStaffSlotPlaceholderLastName = (value: string, row: ParticipantDraft) =>
  isStaffSlotPlaceholderNamePart(value, row.raw, row.staffRole);

const normalizeStaffSlotPlaceholderLastName = (value: string, person: Participant) => {
  const staffRole = rawText(person.raw, "staffRole") || person.role || "";
  return isStaffSlotPlaceholderNamePart(value, person.raw, staffRole, person.role) ? "" : value.trim();
};

const STAFF_ROLE_LABEL_ORDER: Array<[string, number]> = [
  ["אחראי טיול", 0],
  ["אחראי נוסף", 5],
  ["מלווה אוטובוס", 10],
  ["צוות בוגר", 20],
  ["מלווה רפואי", 30],
  ["חובש", 30],
  ["מאבטח", 40],
  ["נשק", 40],
];

const staffRoleOrderIndex = (person: Participant): number => {
  const keys = rawStringArray(person.raw, REQUIRED_STAFF_RAW.roleKeys);
  if (keys.length) {
    const orders = keys.map((key) => DEFAULT_REQUIRED_ROLE_RULES.find((rule) => rule.role_key === key)?.order_index ?? 500);
    return Math.min(...orders);
  }
  const label = [requiredRoleLabels(person.raw)[0], person.role, person.name].filter(Boolean).join(" ");
  for (const [token, order] of STAFF_ROLE_LABEL_ORDER) {
    if (label.includes(token)) return order;
  }
  return isRequiredStaffPlaceholder(person) ? 700 : 800;
};

const staffRoleSlotIndex = (person: Participant): number => {
  const label = requiredRoleLabels(person.raw)[0] || person.role || person.name || "";
  const fromLabel = roleLabelSlotIndex(label);
  if (fromLabel > 0) return fromLabel;
  const sourceId = String(person.sourceRecordId || "");
  if (sourceId.startsWith("split-role:")) return 9999;
  const sourceMatch = sourceId.match(/:(\d+)$/);
  if (sourceMatch) return Number(sourceMatch[1]);
  return 0;
};

const compareStaffMembers = (a: Participant, b: Participant): number => {
  const orderDiff = staffRoleOrderIndex(a) - staffRoleOrderIndex(b);
  if (orderDiff !== 0) return orderDiff;
  const slotDiff = staffRoleSlotIndex(a) - staffRoleSlotIndex(b);
  if (slotDiff !== 0) return slotDiff;
  const placeholderDiff = Number(isRequiredStaffPlaceholder(a)) - Number(isRequiredStaffPlaceholder(b));
  if (placeholderDiff !== 0) return placeholderDiff;
  return a.name.localeCompare(b.name, "he");
};

const splitParticipantName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const resolveStaffPersonalPhone = (person: Participant) => {
  const raw = person.raw || {};
  return (
    readParticipantRawField(raw, "personalPhone") ||
    readParticipantRawField(raw, "motherPhone") ||
    person.phone ||
    person.contactPhone ||
    ""
  );
};

const resolveStaffPersonalEmail = (person: Participant) => {
  const raw = person.raw || {};
  return readParticipantRawField(raw, "personalEmail") || readParticipantRawField(raw, "fatherEmail") || "";
};

const STAFF_GENDER_OPTIONS: Array<{ value: StaffGender; label: string }> = [
  { value: "male", label: "זכר" },
  { value: "female", label: "נקבה" },
];

const buildDraftFromRaw = (person: Participant): ParticipantDraft => {
  const raw = person.raw || {};
  const isStaff = person.type === "staff";
  const identity = resolveParticipantIdentity(raw, person.notes);
  const placeholderStaff = isStaff && isRequiredStaffPlaceholder(person);
  const nameFallback =
    placeholderStaff && isRequiredStaffPlaceholderFullName(person.name)
      ? { firstName: "", lastName: "" }
      : splitParticipantName(person.name);
  return {
    id: person.id,
    savedId: person.id,
    source: person.source,
    sourceRecordId: person.sourceRecordId,
    type: person.type,
    staffRole: rawText(raw, "staffRole") || person.role,
    firstName:
      placeholderStaff
        ? normalizeStaffSlotPlaceholderFirstName(readParticipantRawField(raw, "firstName") || nameFallback.firstName)
        : readParticipantRawField(raw, "firstName") || nameFallback.firstName,
    lastName:
      placeholderStaff
        ? normalizeStaffSlotPlaceholderLastName(readParticipantRawField(raw, "lastName") || nameFallback.lastName, person)
        : readParticipantRawField(raw, "lastName") || nameFallback.lastName,
    identity,
    birthDate: readParticipantRawField(raw, "birthDate"),
    grade: readParticipantRawField(raw, "grade"),
    branch: readParticipantRawField(raw, "branch"),
    gender: isStaff ? normalizeStaffGender(readParticipantRawField(raw, "gender")) : "",
    personalPhone: isStaff ? resolveStaffPersonalPhone(person) : "",
    fatherName: readParticipantRawField(raw, "fatherName"),
    fatherPhone: readParticipantRawField(raw, "fatherPhone") || person.contactPhone,
    motherName: readParticipantRawField(raw, "motherName"),
    motherPhone: isStaff ? readParticipantRawField(raw, "motherPhone") : readParticipantRawField(raw, "motherPhone") || person.phone,
    personalEmail: isStaff ? resolveStaffPersonalEmail(person) : "",
    fatherEmail: isStaff ? "" : readParticipantRawField(raw, "fatherEmail"),
    medicalNotes: person.medicalNotes || readParticipantRawField(raw, "medicalNotes"),
    paymentStatus: person.paymentStatus || readParticipantRawField(raw, "paymentStatus"),
    parentApproval: person.parentApproval || readParticipantRawField(raw, "parentApproval"),
    policeApproval: readParticipantRawField(raw, "policeApproval"),
    raw,
  };
};

const draftFromParticipant = (
  person: Participant,
  registrationByIdentity: Record<string, RegistrationSnapshot> = {},
): ParticipantDraft => {
  const baseDraft = buildDraftFromRaw(person);
  const identity = resolveParticipantIdentity(baseDraft.raw, person.notes, baseDraft.identity);
  const registration = identity ? registrationByIdentity[identity] : undefined;
  const rawRegistration = readRegistrationFieldsFromRaw(baseDraft.raw);
  const mergedRegistration = registration ? mergeRegistrationSnapshot(rawRegistration, registration) : rawRegistration;
  const fields = baseDraft.type === "staff" ? STAFF_REGISTRATION_DRAFT_FIELDS : PARTICIPANT_REGISTRATION_DRAFT_FIELDS;
  return applyRegistrationSnapshotToDraft(baseDraft, mergedRegistration, fields);
};

const genderedStaffRoleDisplay = (label: string, gender: StaffGender) =>
  formatStaffRoleLabelForGender(label, gender);

const canonicalStaffRoleLabel = (label: string) => formatStaffRoleLabelForGender(label, "male");

function StaffRoleBadges({
  roleLabels,
  rowGender,
  placeholderRequired,
  saving,
  savedId,
  onSplitStaffRole,
}: {
  roleLabels: string[];
  rowGender: StaffGender;
  placeholderRequired: boolean;
  saving: boolean;
  savedId?: string;
  onSplitStaffRole?: (participantId: string, roleLabel: string) => Promise<void>;
}) {
  if (!roleLabels.length) return null;

  return (
    <div className="flex max-w-[148px] flex-wrap justify-center gap-0.5">
      {roleLabels.map((label) => {
        const displayLabel = genderedStaffRoleDisplay(label, rowGender);
        const splittable =
          !placeholderRequired && canSplitStaffRole(roleLabels) && Boolean(savedId && onSplitStaffRole);
        if (splittable) {
          return (
            <button
              key={label}
              type="button"
              data-no-drag-scroll
              disabled={saving}
              title={`הפרד "${displayLabel}" לתקן חסר נפרד`}
              onClick={() => {
                if (savedId && onSplitStaffRole) void onSplitStaffRole(savedId, label);
              }}
              className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800 transition-colors hover:border-amber-300 hover:bg-amber-100 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {displayLabel}
              <Unlink size={10} className="shrink-0 opacity-80" aria-hidden />
            </button>
          );
        }
        return (
          <span
            key={label}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${placeholderRequired ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
          >
            {displayLabel}
          </span>
        );
      })}
    </div>
  );
}

const emptyParticipantDraft = (type: ParticipantType = "participant"): ParticipantDraft => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  source: "manual",
  type,
  staffRole: "",
  firstName: "",
  lastName: "",
  identity: "",
  birthDate: "",
  grade: "",
  branch: "",
  gender: "",
  fatherName: "",
  fatherPhone: "",
  motherName: "",
  motherPhone: "",
  personalPhone: "",
  personalEmail: "",
  fatherEmail: "",
  medicalNotes: "",
  paymentStatus: "",
  parentApproval: "",
  policeApproval: "",
  raw: {},
});

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
const isValidPhone = (value: string) => {
  const normalized = normalizePhone(value);
  if (!normalized) return true;
  return /^(\+972|0)?[2-9]\d{7,8}$/.test(normalized);
};
const isValidEmail = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

const calculateAge = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  const date = match
    ? new Date(Number(match[3].length === 2 ? `20${match[3]}` : match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const beforeBirthday = today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

const requiresPoliceApproval = (row: ParticipantDraft) =>
  requiresStaffPoliceApproval({ type: row.type, birthDate: row.birthDate, gender: row.gender, calculateAge });

const isStaffAdult = (row: ParticipantDraft) => {
  if (row.type !== "staff") return false;
  const age = calculateAge(row.birthDate);
  return age !== null && age >= 18;
};

const isOptionalStaffParentField = (row: ParticipantDraft, field: DraftField) =>
  isStaffAdult(row) && staffParentFields.includes(field);

const formatBirthDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

type BusDraft = {
  id: string;
  savedId?: string;
  busNumber: string;
  driverName: string;
  driverPhone: string;
  company: string;
  capacity: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
};

const busFieldMeta: Record<keyof Omit<BusDraft, "id" | "savedId">, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; kind?: "phone" | "email" | "number" }> = {
  busNumber: { label: "מס' אוטובוס", Icon: Hash },
  driverName: { label: "שם הנהג", Icon: Users },
  driverPhone: { label: "טל' הנהג", Icon: PhoneCall, kind: "phone" },
  company: { label: "חברת האוטובוס", Icon: Building2 },
  capacity: { label: "מס' מקומות", Icon: Bus, kind: "number" },
  leaderName: { label: "אחראי/ת הסעה", Icon: UserRoundCheck },
  leaderPhone: { label: "טל' אחראית הסעה", Icon: PhoneCall, kind: "phone" },
  leaderEmail: { label: "אימייל אחראית הסעה", Icon: Mail, kind: "email" },
};

const busFields = Object.keys(busFieldMeta) as Array<keyof Omit<BusDraft, "id" | "savedId">>;

const assignmentKindMeta: Record<AssignmentKind, { label: string; itemPrefix: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  groups: { label: "קבוצות", itemPrefix: "קבוצה מס׳", Icon: Users },
  buses: { label: "אוטובוסים", itemPrefix: "אוטובוס מס׳", Icon: Bus },
  rooms: { label: "חדרים", itemPrefix: "חדר מס׳", Icon: Building2 },
  other: { label: "אחר", itemPrefix: "קבוצה מס׳", Icon: ClipboardCheck },
};

const audienceLabel = (audience: AssignmentAudience, labels: TripParticipantLabels) => {
  if (audience === "participants") return labels.audienceParticipants;
  if (audience === "staff") return "צוות";
  return labels.audienceBoth;
};

const emptyBusDraft = (): BusDraft => ({
  id: `temp-bus-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  busNumber: "",
  driverName: "",
  driverPhone: "",
  company: "",
  capacity: "",
  leaderName: "",
  leaderPhone: "",
  leaderEmail: "",
});

const draftFromBus = (bus: PlanBus): BusDraft => ({
  id: bus.id,
  savedId: bus.id,
  busNumber: bus.bus_number || bus.name || "",
  driverName: bus.driver_name || "",
  driverPhone: bus.driver_phone || "",
  company: bus.company || "",
  capacity: bus.capacity && Number(bus.capacity) > 0 ? String(bus.capacity) : "",
  leaderName: bus.leader_name || "",
  leaderPhone: bus.leader_phone || "",
  leaderEmail: bus.leader_email || "",
});

const isDraftFieldInvalid = (row: ParticipantDraft, field: DraftField) => {
  const value = row[field];
  const meta = participantFieldMeta[field];
  if (meta.kind === "phone") return !isValidPhone(value);
  if (meta.kind === "email") return !isValidEmail(value);
  return false;
};

const draftToPayload = (row: ParticipantDraft) => {
  const isStaffSlotPlaceholder = row.type === "staff" && Boolean(row.raw?.[REQUIRED_STAFF_RAW.placeholder]);
  const staffRoleForStorage =
    row.type === "staff" ? canonicalStaffRoleLabel(row.staffRole.trim()) : row.staffRole.trim();
  const roleLabel = requiredRoleLabels(row.raw)[0] || staffRoleForStorage;
  const storedFirstName = row.firstName.trim() || (isStaffSlotPlaceholder ? STAFF_SLOT_PLACEHOLDER_FIRST_NAME : "");
  const name = isStaffSlotPlaceholder ? `תקן חסר: ${roleLabel}` : [storedFirstName, row.lastName.trim()].filter(Boolean).join(" ");
  const staffPersonalPhone = row.personalPhone.trim() || row.motherPhone.trim();
  const staffPersonalEmail = row.personalEmail.trim() || row.fatherEmail.trim();
  const raw = {
    ...(row.raw || {}),
    ...Object.fromEntries((Object.keys(participantFieldMeta) as DraftField[]).map((field) => [field, row[field].trim()])),
    ...(isStaffSlotPlaceholder && !row.firstName.trim() ? { firstName: STAFF_SLOT_PLACEHOLDER_FIRST_NAME, lastName: "" } : {}),
    ...(row.type === "staff" && staffPersonalPhone ? { personalPhone: staffPersonalPhone } : {}),
    ...(row.type === "staff" && staffPersonalEmail ? { personalEmail: staffPersonalEmail, fatherEmail: "" } : {}),
    ...(row.type === "staff" && staffRoleForStorage ? { staffRole: staffRoleForStorage } : {}),
  };
  return {
    type: row.type,
    source: row.source || "manual",
    sourceRecordId: row.sourceRecordId ?? null,
    name,
    phone: row.type === "staff" ? staffPersonalPhone || null : row.motherPhone || row.fatherPhone || null,
    contactPhone: row.fatherPhone || row.motherPhone || null,
    registrationStatus: row.parentApproval || null,
    paymentStatus: row.paymentStatus || null,
    parentApproval: row.parentApproval || null,
    medicalNotes: row.medicalNotes || null,
    role: row.type === "staff" ? staffRoleForStorage || null : row.branch || null,
    notes: row.identity ? `ת.ז. ${row.identity}` : null,
    raw,
  };
};

export function ParticipantsTab({ tripId, active, mode, tourPeopleSection }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missingPayment" | "missingApproval" | "medical">("all");
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelUploadType, setExcelUploadType] = useState<ParticipantType>("participant");
  const [peopleSectionTab, setPeopleSectionTab] = useState<PeopleSectionTab>("participants");
  const [extraRoleLabel, setExtraRoleLabel] = useState("");
  const [showAddRolePanel, setShowAddRolePanel] = useState(false);
  const [mergeTargetStaffId, setMergeTargetStaffId] = useState("");
  const [mergePlaceholderIds, setMergePlaceholderIds] = useState<string[]>([]);
  useEffect(() => {
    if (!active || !tourPeopleSection) return;
    setPeopleSectionTab(tourPeopleSection);
  }, [active, tourPeopleSection]);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/participants`, { credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || getTripParticipantLabels(payload?.tripDepartment).loadError));
      setData(payload as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : getTripParticipantLabels(data?.tripDepartment).loadError);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!active) return;
    void load();
    const timer = window.setInterval(() => void load(), 180_000);
    return () => window.clearInterval(timer);
  }, [active, load]);

  const participantLabels = useMemo(
    () => getTripParticipantLabels(data?.tripDepartment),
    [data?.tripDepartment],
  );

  const allPeople = useMemo(() => [...(data?.participants || []), ...(data?.staff || [])], [data]);
  const assignablePeople = useMemo(() => allPeople.filter((person) => !isRequiredStaffPlaceholder(person)), [allPeople]);
  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPeople.filter((person) => {
      const matchesSearch =
        !q ||
        [person.name, person.phone, person.contactPhone, person.role, person.registrationStatus, person.paymentStatus]
          .join(" ")
          .toLowerCase()
          .includes(q);
      if (!matchesSearch) return false;
      if (filter === "missingPayment") return missingValue(person.paymentStatus);
      if (filter === "missingApproval") return missingValue(person.parentApproval);
      if (filter === "medical") return Boolean(person.medicalNotes.trim());
      return true;
    });
  }, [allPeople, filter, search]);
  const filteredParticipants = useMemo(() => filteredPeople.filter((person) => person.type === "participant"), [filteredPeople]);
  const filteredStaff = useMemo(
    () => filteredPeople.filter((person) => person.type === "staff").sort(compareStaffMembers),
    [filteredPeople],
  );

  const activePeople = useMemo(() => (peopleSectionTab === "staff" ? data?.staff || [] : data?.participants || []), [data?.participants, data?.staff, peopleSectionTab]);
  const filteredActivePeople = useMemo(() => (peopleSectionTab === "staff" ? filteredStaff : filteredParticipants), [filteredParticipants, filteredStaff, peopleSectionTab]);
  const countableActivePeople = useMemo(
    () => activePeople.filter((person) => !(person.type === "staff" && isRequiredStaffPlaceholder(person))),
    [activePeople],
  );
  const activePeopleSummary = useMemo(
    () => ({
      total: countableActivePeople.length,
      filtered: filteredActivePeople.filter((person) => !(person.type === "staff" && isRequiredStaffPlaceholder(person))).length,
      missingPayment: countableActivePeople.filter((person) => missingValue(person.paymentStatus)).length,
      missingApproval: countableActivePeople.filter((person) => missingValue(person.parentApproval)).length,
      medical: countableActivePeople.filter((person) => person.medicalNotes.trim()).length,
      missingPoliceApproval: countableActivePeople.filter((person) => {
        const draft = draftFromParticipant(person);
        return person.type === "staff" && requiresPoliceApproval(draft) && missingValue(draft.policeApproval);
      }).length,
    }),
    [countableActivePeople, filteredActivePeople],
  );
  const assignmentSummary = useMemo(() => {
    const sets = data?.assignmentSets || [];
    const assignedIds = new Set<string>();
    let items = 0;
    let overCapacity = 0;
    for (const set of sets) {
      items += set.items.length;
      for (const item of set.items) {
        item.members.forEach((member) => assignedIds.add(member.participantId));
        if (set.kind === "buses" && item.busId) {
          const bus = data?.buses.find((candidate) => candidate.id === item.busId);
          if (bus?.capacity && item.members.length > bus.capacity) overCapacity += 1;
        }
      }
    }
    return {
      sets: sets.length,
      items,
      assigned: assignedIds.size,
      unassigned: Math.max(0, assignablePeople.length - assignedIds.size),
      overCapacity,
    };
  }, [assignablePeople.length, data?.assignmentSets, data?.buses]);
  const activeUploadType: ParticipantType = peopleSectionTab === "staff" ? "staff" : "participant";
  const activeTemplateKind = activeUploadType === "staff" ? "staff" : "participants";
  const activePeopleLabel = activeUploadType === "staff" ? "צוות" : participantLabels.participants;

  const saveBusDraft = async (row: BusDraft) => {
    const invalidPhone = (!isValidPhone(row.driverPhone) && "טל' הנהג") || (!isValidPhone(row.leaderPhone) && "טל' אחראית הסעה");
    if (invalidPhone) {
      setError(`יש לתקן את השדה: ${invalidPhone}`);
      return false;
    }
    if (!isValidEmail(row.leaderEmail)) {
      setError("יש לתקן את השדה: אימייל אחראית הסעה");
      return false;
    }
    const payload = {
      name: row.busNumber.trim() || "אוטובוס חדש",
      busNumber: row.busNumber.trim() || null,
      driverName: row.driverName.trim() || null,
      driverPhone: row.driverPhone.trim() || null,
      company: row.company.trim() || null,
      capacity: row.capacity.trim() ? Number(row.capacity) : 0,
      leaderName: row.leaderName.trim() || null,
      leaderPhone: row.leaderPhone.trim() || null,
      leaderEmail: row.leaderEmail.trim() || null,
    };
    const ok = await mutate(row.savedId ? { action: "updateBus", id: row.savedId, ...payload } : { action: "createBus", ...payload });
    return Boolean(ok);
  };

  const deleteBusDraft = async (row: BusDraft) => {
    if (!row.savedId) return true;
    const ok = await mutate({ action: "deleteBus", id: row.savedId });
    return Boolean(ok);
  };

  const mutate = async (body: Record<string, unknown>, reload = true) => {
    setMutating(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/participants`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "השמירה נכשלה"));
      if (reload) await load();
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
      return null;
    } finally {
      setMutating(false);
    }
  };

  const saveParticipantDraft = async (row: ParticipantDraft) => {
    if (!row.firstName.trim() || !row.lastName.trim()) {
      setError("שם פרטי ושם משפחה הם שדות חובה");
      return false;
    }
    const invalidField = (Object.keys(participantFieldMeta) as DraftField[]).find((field) => isDraftFieldInvalid(row, field));
    if (invalidField) {
      setError(`יש לתקן את השדה: ${participantFieldMeta[invalidField].label}`);
      return false;
    }
    const payload = draftToPayload(row);
    const ok = await mutate(row.savedId ? { action: "updateParticipant", id: row.savedId, ...payload } : { action: "createParticipant", ...payload });
    return Boolean(ok);
  };

  const deleteParticipantDraft = async (row: ParticipantDraft) => {
    if (!row.savedId) return true;
    const ok = await mutate({ action: "deleteParticipant", id: row.savedId });
    return Boolean(ok);
  };

  const assignRequiredRole = async (placeholderId: string, participantId: string) => {
    const ok = await mutate({ action: "assignRequiredRole", placeholderId, participantId });
    return Boolean(ok);
  };

  const addStaffRoleSlot = async () => {
    const roleLabel = extraRoleLabel.trim();
    if (!roleLabel) {
      setError("יש להזין שם תפקיד");
      return;
    }
    const ok = await mutate({
      action: "addStaffRoleSlot",
      roleLabel,
      roleKey: roleLabel.replace(/\s+/g, "_").toLowerCase(),
    });
    if (ok) {
      setExtraRoleLabel("");
      setShowAddRolePanel(false);
      setError("");
    }
  };

  const openRolePlaceholders = useMemo(
    () => (data?.staff || []).filter((person) => isRequiredStaffPlaceholder(person)).sort(compareStaffMembers),
    [data?.staff],
  );
  const staffedPeople = useMemo(
    () => (data?.staff || []).filter((person) => !isRequiredStaffPlaceholder(person)),
    [data?.staff],
  );

  const mergeRolesToParticipant = async () => {
    if (!mergeTargetStaffId || mergePlaceholderIds.length === 0) {
      setError("בחרו איש צוות ולפחות תפקיד אחד למיזוג");
      return;
    }
    const mergeTarget = staffedPeople.find((person) => person.id === mergeTargetStaffId);
    const selectedPlaceholders = openRolePlaceholders.filter((person) => mergePlaceholderIds.includes(person.id));
    const validation = validateStaffRoleMerge(mergeTarget, selectedPlaceholders);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const ok = await mutate({
      action: "assignRolesToParticipant",
      participantId: mergeTargetStaffId,
      placeholderIds: mergePlaceholderIds,
    });
    if (ok) {
      setMergePlaceholderIds([]);
      setMergeTargetStaffId("");
      setError("");
    }
  };

  const splitStaffRole = async (participantId: string, roleLabel: string) => {
    const ok = await mutate({
      action: "splitStaffRole",
      participantId,
      roleLabel,
    });
    if (ok) setError("");
  };

  const pruneMergePlaceholderSelection = (targetId: string, selectedIds: string[]) => {
    const target = staffedPeople.find((person) => person.id === targetId);
    const kept: string[] = [];
    for (const id of selectedIds) {
      const person = openRolePlaceholders.find((item) => item.id === id);
      if (!person) continue;
      const others = kept
        .map((keptId) => openRolePlaceholders.find((item) => item.id === keptId))
        .filter(Boolean) as Participant[];
      if (canAddPlaceholderToMerge(target, others, person)) kept.push(id);
    }
    return kept;
  };

  const toggleMergePlaceholder = (person: Participant, checked: boolean) => {
    if (checked) {
      setMergePlaceholderIds((prev) => prev.filter((id) => id !== person.id));
      return;
    }
    const target = staffedPeople.find((item) => item.id === mergeTargetStaffId);
    const selected = openRolePlaceholders.filter((item) => mergePlaceholderIds.includes(item.id));
    if (!canAddPlaceholderToMerge(target, selected, person)) {
      const roleKey = rawStringArray(person.raw, REQUIRED_STAFF_RAW.roleKeys)[0];
      setError(`לא ניתן לבחור שני תפקידים מאותה קטגוריה (${staffRoleKeyLabel(roleKey || "unknown")}).`);
      return;
    }
    setMergePlaceholderIds((prev) => [...prev, person.id]);
    setError("");
  };

  const uploadExcel = async (file: File | null) => {
    if (!file) return;
    setMutating(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("participantType", excelUploadType);
      const res = await fetch(`/api/trips/${tripId}/plan/participants/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "ייבוא האקסל נכשל"));
      setExcelFile(null);
      setShowExcelModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ייבוא האקסל נכשל");
    } finally {
      setMutating(false);
    }
  };

  const importAirtable = async () => {
    await mutate({ action: "importAirtable" });
  };

  const assignmentMembershipByPerson = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const set of data?.assignmentSets || []) {
      for (const item of set.items) {
        for (const member of item.members) {
          const personAssignments = map.get(member.participantId) || new Map<string, string>();
          personAssignments.set(set.id, item.name);
          map.set(member.participantId, personAssignments);
        }
      }
    }
    return map;
  }, [data?.assignmentSets]);

  const peopleByBus = useMemo(() => {
    const map = new Map<string, Participant[]>();
    const peopleById = new Map(assignablePeople.map((person) => [person.id, person]));
    for (const person of assignablePeople) {
      if (!person.busId) continue;
      map.set(person.busId, [...(map.get(person.busId) || []), person]);
    }
    for (const set of data?.assignmentSets || []) {
      if (set.kind !== "buses") continue;
      for (const item of set.items) {
        if (!item.busId) continue;
        const existing = map.get(item.busId) || [];
        const next = [...existing];
        const seen = new Set(existing.map((person) => person.id));
        for (const member of item.members) {
          const person = peopleById.get(member.participantId);
          if (person && !seen.has(person.id)) next.push(person);
        }
        map.set(item.busId, next);
      }
    }
    return map;
  }, [assignablePeople, data?.assignmentSets]);

  const createAssignmentSet = (kind: AssignmentKind, audience: AssignmentAudience, customKindLabel: string) =>
    mutate({ action: "createAssignmentSet", kind, audience, customKindLabel });
  const renameAssignmentSet = (setId: string, title: string) => mutate({ action: "renameAssignmentSet", id: setId, title });
  const deleteAssignmentSet = (setId: string) => mutate({ action: "deleteAssignmentSet", id: setId });
  const createAssignmentItem = (setId: string, name: string, busId?: string | null) => mutate({ action: "createAssignmentItem", assignmentSetId: setId, name, busId });
  const renameAssignmentItem = (itemId: string, name: string) => mutate({ action: "renameAssignmentItem", id: itemId, name });
  const deleteAssignmentItem = (itemId: string) => mutate({ action: "deleteAssignmentItem", id: itemId });
  const assignMembersToItem = (setId: string, itemId: string, participantIds: string[]) => mutate({ action: "assignMembersToItem", assignmentSetId: setId, assignmentItemId: itemId, participantIds });
  const removeAssignmentMember = (memberId: string) => mutate({ action: "removeAssignmentMember", memberId });

  return (
    <div className="space-y-4">
      <div
        data-plan-tour={mode === "transport" ? "transport-header" : "participants-header"}
        className="relative z-20 -mt-px rounded-b-3xl border border-t-0 border-cyan-100 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.10)]"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-800">{mode === "transport" ? "ניהול הסעות וקבוצות" : participantLabels.participantsAndStaff}</h2>
            <p className="text-xs font-bold text-gray-500">
              {data?.airtable.refreshedAt ? `רוענן לאחרונה: ${new Date(data.airtable.refreshedAt).toLocaleTimeString("he-IL")}` : "מאגר משתתפים מקומי"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === "participants" ? (
              <>
                {peopleSectionTab === "assignments" ? (
                  <SourceActionButton
                    label="ניהול שיבוצים"
                    helper={`${assignmentSummary.sets} לשוניות פעילות`}
                    tone="purple"
                    icon={<ClipboardCheck size={16} />}
                    onClick={() => setPeopleSectionTab("assignments")}
                    disabled={mutating}
                  />
                ) : (
                  <>
                    <SourceActionButton
                      label={`הורד תבנית ${activePeopleLabel}`}
                      helper="קובץ אקסל מוכן"
                      tone="emerald"
                      icon={<Download size={16} />}
                      onClick={() => {
                        window.location.href = `/api/trips/${tripId}/plan/participants/template?kind=${activeTemplateKind}`;
                      }}
                    />
                    <SourceActionButton
                      label={`העלה אקסל ${activePeopleLabel}`}
                      helper={`ייבוא ${activePeopleLabel}`}
                      tone="purple"
                      icon={<Upload size={16} />}
                      onClick={() => {
                        setExcelUploadType(activeUploadType);
                        setShowExcelModal(true);
                      }}
                      disabled={mutating}
                    />
                    <SourceActionButton
                      label="ייבא מאיירטייבל"
                      helper="רענון רשימות"
                      tone="amber"
                      icon={<FileSpreadsheet size={16} />}
                      onClick={() => void importAirtable()}
                      disabled={mutating}
                    />
                  </>
                )}
                <SourceActionButton
                  label="רענן"
                  helper="טעינה מחדש"
                  tone="slate"
                  icon={loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  onClick={() => void load()}
                  disabled={loading}
                />
              </>
            ) : null}
          </div>
        </div>

        {!data?.airtable.configured ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            איירטייבל לא מוגדר. עדיין אפשר לעבוד ידנית או דרך אקסל.
          </div>
        ) : null}
        {data?.airtable.error ? <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">שגיאת איירטייבל: {data.airtable.error}</div> : null}
        {data?.localSchemaMissing ? <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-800">יש להריץ את מיגרציות המשתתפים כדי לשמור נתונים.</div> : null}
        {error ? <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div> : null}
      </div>

      {mode === "participants" ? (
        <>
          <div data-plan-tour="participants-section-tabs" className="flex flex-wrap gap-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm">
            <PeopleSectionButton
              active={peopleSectionTab === "participants"}
              tone="cyan"
              icon={<Users size={16} />}
              label={participantLabels.participants}
              count={filteredParticipants.length}
              onClick={() => setPeopleSectionTab("participants")}
            />
            <PeopleSectionButton
              active={peopleSectionTab === "staff"}
              tone="amber"
              icon={<UserRoundCheck size={16} />}
              label="צוות"
              count={filteredStaff.filter((person) => !isRequiredStaffPlaceholder(person)).length}
              onClick={() => setPeopleSectionTab("staff")}
            />
            <PeopleSectionButton
              active={peopleSectionTab === "assignments"}
              tone="purple"
              icon={<ClipboardCheck size={16} />}
              label="שיבוצים"
              count={data?.assignmentSets.length || 0}
              onClick={() => setPeopleSectionTab("assignments")}
            />
          </div>
          <div data-plan-tour="participants-summary" className="grid gap-3 md:grid-cols-5">
            {peopleSectionTab === "assignments" ? (
              <>
                <SummaryCard label="לשוניות שיבוץ" value={assignmentSummary.sets} icon={<ClipboardCheck size={16} />} tone="cyan" />
                <SummaryCard label="קבוצות / פריטים" value={assignmentSummary.items} icon={<Users size={16} />} tone="cyan" />
                <SummaryCard label="משובצים" value={assignmentSummary.assigned} tone="cyan" />
                <SummaryCard label="עדיין לא שובצו" value={assignmentSummary.unassigned} tone={assignmentSummary.unassigned ? "amber" : "cyan"} />
                <SummaryCard label="חריגות קיבולת" value={assignmentSummary.overCapacity} tone={assignmentSummary.overCapacity ? "red" : "cyan"} />
              </>
            ) : peopleSectionTab === "staff" ? (
              <>
                <SummaryCard label="צוות" value={activePeopleSummary.total} icon={<UserRoundCheck size={16} />} tone="amber" />
                <SummaryCard label="מוצגים בסינון" value={activePeopleSummary.filtered} tone="amber" />
                <SummaryCard label="חסר אישור משטרה" value={activePeopleSummary.missingPoliceApproval} tone={activePeopleSummary.missingPoliceApproval ? "red" : "cyan"} />
                <SummaryCard label="חסר אישור / סטטוס" value={activePeopleSummary.missingApproval} tone={activePeopleSummary.missingApproval ? "amber" : "cyan"} />
                <SummaryCard label="רגישויות רפואיות" value={activePeopleSummary.medical} tone="cyan" />
              </>
            ) : (
              <>
                <SummaryCard label={participantLabels.participants} value={activePeopleSummary.total} icon={<Users size={16} />} />
                <SummaryCard label="מוצגים בסינון" value={activePeopleSummary.filtered} tone="cyan" />
                <SummaryCard label="לא שילמו / חסר תשלום" value={activePeopleSummary.missingPayment} tone="amber" />
                <SummaryCard label="חסר אישור הורים" value={activePeopleSummary.missingApproval} tone="red" />
                <SummaryCard label="רגישויות רפואיות" value={activePeopleSummary.medical} tone="cyan" />
              </>
            )}
          </div>
        </>
      ) : null}

      {mode === "transport" ? (
        <TransportView
          buses={data?.buses || []}
          peopleByBus={peopleByBus}
          saving={mutating}
          onSaveBus={saveBusDraft}
          onDeleteBus={deleteBusDraft}
        />
      ) : (
        <>
          {peopleSectionTab !== "assignments" ? (
            <div data-plan-tour="participants-search" className="flex flex-col gap-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`חיפוש ${activePeopleLabel} לפי שם, טלפון, תפקיד או סטטוס`}
                  className="h-10 w-full rounded-2xl border border-gray-200 pr-9 pl-3 text-sm font-bold outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <Select
                value={filter}
                onChange={(value) => {
                  if (value) setFilter(value);
                }}
                placeholder="כולם"
                clearable={false}
                accent="pink"
                className="w-full shrink-0 md:w-52"
                buttonClassName="!rounded-2xl"
                options={[
                  { value: "all", label: "כולם" },
                  { value: "missingPayment", label: "חסר תשלום" },
                  { value: "missingApproval", label: "חסר אישור" },
                  { value: "medical", label: "יש רגישות רפואית" },
                ]}
              />
            </div>
          ) : null}

          <div
            data-plan-tour={
              peopleSectionTab === "participants"
                ? "participants-table"
                : peopleSectionTab === "staff"
                  ? "participants-staff-panel"
                  : "participants-assignments"
            }
            className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="p-3">
              {peopleSectionTab === "participants" ? (
                <EditableParticipantsTable
                  key={filteredParticipants.map((person) => person.id).join("|") || "empty"}
                  title={participantLabels.participants}
                  type="participant"
                  tone="cyan"
                  people={filteredParticipants}
                  assignmentSets={data?.assignmentSets || []}
                  assignmentMembershipByPerson={assignmentMembershipByPerson}
                  saving={mutating}
                  onSave={saveParticipantDraft}
                  onDelete={deleteParticipantDraft}
                  onAssignRequiredRole={assignRequiredRole}
                  registrationByIdentity={data?.registrationByIdentity || {}}
                  participantLabels={participantLabels}
                />
              ) : null}
              {peopleSectionTab === "staff" ? (
                <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
                  <p className="text-xs font-black text-amber-900">מיזוג כמה תפקידים לאדם אחד</p>

                  {showAddRolePanel ? (
                    <div className="mt-2 flex gap-2 rounded-xl border border-amber-200/80 bg-white p-2">
                      <input
                        value={extraRoleLabel}
                        onChange={(event) => setExtraRoleLabel(event.target.value)}
                        placeholder="למשל מלווה הסעה נוסף"
                        className="h-8 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-xs font-bold outline-none focus:border-amber-400"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && extraRoleLabel.trim() && !mutating) {
                            void addStaffRoleSlot();
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={mutating || !extraRoleLabel.trim()}
                        onClick={() => void addStaffRoleSlot()}
                        className="h-8 shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-black text-white disabled:opacity-50"
                      >
                        הוסף
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={mergeTargetStaffId}
                      onChange={(nextTargetId) => {
                        setMergeTargetStaffId(nextTargetId);
                        setMergePlaceholderIds((prev) => pruneMergePlaceholderSelection(nextTargetId, prev));
                      }}
                      placeholder="בחרו איש צוות..."
                      accent="amber"
                      disabled={mutating}
                      className="min-w-0 flex-1"
                      buttonClassName="!h-9 !rounded-xl !text-xs"
                      options={staffedPeople.map((person) => ({ value: person.id, label: person.name }))}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRolePanel((open) => {
                          if (open) setExtraRoleLabel("");
                          return !open;
                        });
                      }}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      <Plus size={14} />
                      {showAddRolePanel ? "סגור" : "הוסף תפקיד"}
                    </button>
                    <button
                      type="button"
                      disabled={mutating || !mergeTargetStaffId || mergePlaceholderIds.length === 0}
                      onClick={() => void mergeRolesToParticipant()}
                      className="h-9 shrink-0 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
                    >
                      מזג {mergePlaceholderIds.length > 0 ? `${mergePlaceholderIds.length} תפקידים` : "תפקידים נבחרים"}
                    </button>
                  </div>

                  {openRolePlaceholders.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {openRolePlaceholders.map((person) => {
                        const labels = requiredRoleLabels(person.raw);
                        const checked = mergePlaceholderIds.includes(person.id);
                        const mergeTarget = staffedPeople.find((item) => item.id === mergeTargetStaffId);
                        const selectedOthers = openRolePlaceholders.filter(
                          (item) => mergePlaceholderIds.includes(item.id) && item.id !== person.id,
                        );
                        const mergeBlocked =
                          !checked && !canAddPlaceholderToMerge(mergeTarget, selectedOthers, person);
                        return (
                          <label
                            key={person.id}
                            title={mergeBlocked ? "לא ניתן למזג שני תפקידים מאותה קטגוריה" : undefined}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                              checked
                                ? "cursor-pointer border-amber-500 bg-amber-500 text-white"
                                : mergeBlocked
                                  ? "cursor-not-allowed border-amber-100 bg-amber-50/60 text-amber-400"
                                  : "cursor-pointer border-amber-200 bg-white text-amber-900 hover:border-amber-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              disabled={mergeBlocked}
                              onChange={() => toggleMergePlaceholder(person, checked)}
                            />
                            {labels[0] || person.role || person.name}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] font-bold text-amber-700/70">אין תקנים פנויים למיזוג</p>
                  )}
                </div>
              ) : null}
              {peopleSectionTab === "staff" ? (
                <EditableParticipantsTable
                  key={filteredStaff.map((person) => person.id).join("|") || "empty-staff"}
                  title="צוות הטיול"
                  type="staff"
                  tone="amber"
                  people={filteredStaff}
                  assignmentSets={data?.assignmentSets || []}
                  assignmentMembershipByPerson={assignmentMembershipByPerson}
                  saving={mutating}
                  onSave={saveParticipantDraft}
                  onDelete={deleteParticipantDraft}
                  onAssignRequiredRole={assignRequiredRole}
                  onSplitStaffRole={splitStaffRole}
                  registrationByIdentity={data?.registrationByIdentity || {}}
                />
              ) : null}
              {peopleSectionTab === "assignments" ? (
                <AssignmentsPanel
                  people={assignablePeople}
                  buses={data?.buses || []}
                  assignmentSets={data?.assignmentSets || []}
                  saving={mutating}
                  participantLabels={participantLabels}
                  onCreateSet={createAssignmentSet}
                  onRenameSet={renameAssignmentSet}
                  onDeleteSet={deleteAssignmentSet}
                  onCreateItem={createAssignmentItem}
                  onRenameItem={renameAssignmentItem}
                  onDeleteItem={deleteAssignmentItem}
                  onAssignMembers={assignMembersToItem}
                  onRemoveMember={removeAssignmentMember}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
      {showExcelModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setShowExcelModal(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowExcelModal(false)}
              className="absolute left-4 top-4 rounded-full bg-gray-50 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="סגור חלון העלאת אקסל"
            >
              <X size={18} />
            </button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
              <FileSpreadsheet size={26} />
            </div>
            <h3 className="mt-4 text-xl font-black text-gray-800">מה מעלים מאקסל?</h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500">
              {participantLabels.excelChoiceHint}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExcelUploadType("participant")}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  excelUploadType === "participant"
                    ? "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm"
                    : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Users size={18} className="mx-auto" />
                <span className="mt-1 block text-sm font-black">{participantLabels.participants}</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelUploadType("staff")}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  excelUploadType === "staff"
                    ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm"
                    : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <UserRoundCheck size={18} className="mx-auto" />
                <span className="mt-1 block text-sm font-black">צוות</span>
              </button>
            </div>
            <a
              href={`/api/trips/${tripId}/plan/participants/template?kind=${excelUploadType === "staff" ? "staff" : "participants"}`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Download size={16} />
              הורד תבנית {excelUploadType === "staff" ? "צוות" : participantLabels.participants}
            </a>
            <label className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-4 py-5 text-purple-700 transition-colors hover:bg-purple-50">
              <Upload size={22} />
              <span className="mt-2 text-sm font-black">{excelFile ? excelFile.name : "בחר קובץ אקסל להעלאה"}</span>
              <span className="mt-1 text-xs font-bold text-purple-500">קבצי xlsx / xls בלבד</span>
              <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
            </label>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowExcelModal(false)}>
                ביטול
              </Button>
              <Button className="flex-1" onClick={() => void uploadExcel(excelFile)} disabled={!excelFile || mutating}>
                {mutating ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                העלה
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sourceToneClass(tone: "cyan" | "emerald" | "purple" | "amber" | "slate") {
  const tones = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700 hover:border-cyan-200 hover:bg-cyan-100",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100",
    purple: "border-purple-100 bg-purple-50 text-purple-700 hover:border-purple-200 hover:bg-purple-100",
    amber: "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100",
    slate: "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100",
  };
  return tones[tone];
}

function SourceActionButton({
  label,
  helper,
  icon,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  helper: string;
  icon: React.ReactNode;
  tone: "cyan" | "emerald" | "purple" | "amber" | "slate";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex h-12 min-w-[118px] items-center gap-2 rounded-2xl border px-3 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${sourceToneClass(tone)}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm transition-transform group-hover:scale-105">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-black">{label}</span>
        <span className="block text-[10px] font-bold opacity-75">{helper}</span>
      </span>
    </button>
  );
}

function peopleSectionToneClass(tone: "cyan" | "amber" | "purple", active: boolean) {
  const tones = {
    cyan: active ? "border-cyan-200 bg-brand-cyan text-white shadow-md" : "border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    amber: active ? "border-amber-200 bg-amber-500 text-white shadow-md" : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100",
    purple: active ? "border-purple-200 bg-purple-600 text-white shadow-md" : "border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100",
  };
  return tones[tone];
}

function PeopleSectionButton({
  active,
  tone,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  tone: "cyan" | "amber" | "purple";
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-black transition-all hover:-translate-y-0.5 ${peopleSectionToneClass(tone, active)}`}
    >
      {icon}
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/20 text-white" : "bg-white/80"}`}>{count}</span>
    </button>
  );
}

function editableTableToneClasses(tone: TableTone) {
  if (tone === "amber") {
    return {
      border: "border-amber-100",
      headerBg: "bg-amber-50",
      headerText: "text-amber-900",
      helperText: "text-amber-700",
      rowBorder: "border-amber-50",
      addRowBg: "bg-amber-50/70",
      buttonHover: "hover:border-amber-200 hover:text-amber-600",
      filledIcon: "border-amber-200 bg-amber-500 text-white",
      addButton: "border-amber-200 bg-white text-amber-600 hover:bg-amber-50",
      headerTooltip: "border-amber-100",
    };
  }
  return {
    border: "border-cyan-100",
    headerBg: "bg-cyan-50",
    headerText: "text-cyan-900",
    helperText: "text-cyan-700",
    rowBorder: "border-cyan-50",
    addRowBg: "bg-cyan-50/70",
    buttonHover: "hover:border-cyan-200 hover:text-brand-cyan",
    filledIcon: "border-cyan-200 bg-brand-cyan text-white",
    addButton: "border-cyan-200 bg-white text-brand-cyan hover:bg-cyan-50",
    headerTooltip: "border-cyan-100",
  };
}

function EditableParticipantsTable({
  title,
  type,
  tone,
  people,
  assignmentSets,
  assignmentMembershipByPerson,
  saving,
  onSave,
  onDelete,
  onAssignRequiredRole,
  onSplitStaffRole,
  registrationByIdentity = {},
  participantLabels,
}: {
  title: string;
  type: ParticipantType;
  tone: TableTone;
  people: Participant[];
  assignmentSets: AssignmentSet[];
  assignmentMembershipByPerson: Map<string, Map<string, string>>;
  saving: boolean;
  onSave: (row: ParticipantDraft) => Promise<boolean>;
  onDelete: (row: ParticipantDraft) => Promise<boolean>;
  onAssignRequiredRole?: (placeholderId: string, participantId: string) => Promise<boolean>;
  onSplitStaffRole?: (participantId: string, roleLabel: string) => Promise<void>;
  registrationByIdentity?: Record<string, RegistrationSnapshot>;
  participantLabels?: TripParticipantLabels;
}) {
  const registrationDraftFields = type === "staff" ? STAFF_REGISTRATION_DRAFT_FIELDS : PARTICIPANT_REGISTRATION_DRAFT_FIELDS;
  const [rows, setRows] = useState<ParticipantDraft[]>(() => {
    const existing = people.map((person) => draftFromParticipant(person, registrationByIdentity));
    return existing.length ? existing : [emptyParticipantDraft(type)];
  });
  const peopleSignature = useMemo(
    () =>
      people
        .map((person) =>
          [
            person.id,
            person.name,
            person.phone,
            person.contactPhone,
            person.role,
            person.sourceRecordId || "",
            JSON.stringify(person.raw || {}),
          ].join(":"),
        )
        .join("|"),
    [people],
  );
  useEffect(() => {
    const nextRows = people.map((person) => draftFromParticipant(person, registrationByIdentity));
    setRows((prev) => {
      const unsavedRows = prev.filter((row) => !row.savedId);
      if (!nextRows.length) return unsavedRows.length ? unsavedRows : [emptyParticipantDraft(type)];
      const merged = nextRows.map((row) => {
        const editing = prev.find((item) => item.savedId === row.savedId);
        if (!editing) return row;
        const hasLocalEdits = (Object.keys(participantFieldMeta) as DraftField[]).some((field) => editing[field] !== row[field]);
        return hasLocalEdits ? { ...row, ...editing, raw: { ...(row.raw || {}), ...(editing.raw || {}) } } : row;
      });
      const extraUnsaved = unsavedRows.filter((row) => !merged.some((item) => item.id === row.id));
      return [...merged, ...extraUnsaved];
    });
  }, [peopleSignature, type, people, registrationByIdentity]);
  const [expandedFields, setExpandedFields] = useState<Set<DraftField>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<ParticipantDraft | null>(null);
  const [requiredRoleTargets, setRequiredRoleTargets] = useState<Record<string, string>>({});
  const saveTimersRef = useRef<Record<string, number>>({});

  const canAutosave = (row: ParticipantDraft) =>
    Boolean(row.firstName.trim() && row.lastName.trim()) &&
    !(Object.keys(participantFieldMeta) as DraftField[]).some((field) => isDraftFieldInvalid(row, field));

  const scheduleAutosave = (row: ParticipantDraft) => {
    window.clearTimeout(saveTimersRef.current[row.id]);
    if (!canAutosave(row)) return;
    saveTimersRef.current[row.id] = window.setTimeout(() => {
      void onSave(row);
    }, 900);
  };

  const applyRegistrationHints = (row: ParticipantDraft, identityValue: string) => {
    const identity = normalizeIdentityNumber(identityValue);
    const registration = identity ? registrationByIdentity[identity] : undefined;
    if (!registration) return row;
    return applyRegistrationSnapshotToDraft(row, registration, registrationDraftFields);
  };

  const updateRow = (rowId: string, field: DraftField, value: string) => {
    const nextValue = field === "birthDate" ? formatBirthDateInput(value) : value;
    const current = rows.find((row) => row.id === rowId);
    if (current) {
      let nextRow: ParticipantDraft = { ...current, [field]: nextValue };
      if (field === "identity") {
        nextRow = applyRegistrationHints(nextRow, nextValue);
      }
      scheduleAutosave(nextRow);
    }
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let nextRow: ParticipantDraft = { ...row, [field]: nextValue };
        if (field === "identity") {
          nextRow = applyRegistrationHints(nextRow, nextValue);
        }
        return nextRow;
      }),
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyParticipantDraft(type)]);
  const confirmDeleteRow = async () => {
    const row = pendingDelete;
    if (!row) return;
    if (isRequiredStaffProtected(row)) {
      setPendingDelete(null);
      return;
    }
    const ok = row.savedId ? await onDelete(row) : true;
    if (ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
    setPendingDelete(null);
  };
  const inputClass = "h-8 w-full rounded-lg border border-gray-200 bg-white px-1.5 text-center text-xs font-bold outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100";
  const toneClasses = editableTableToneClasses(tone);
  const allFields = (Object.keys(participantFieldMeta) as DraftField[]).filter((field) => {
    if (type === "staff") return !staffExcludedFields.includes(field);
    return !staffOnlyFields.includes(field) && field !== "policeApproval" && field !== "staffRole";
  });
  const visibleAssignmentSets = assignmentSets.filter((set) => set.audience === "both" || (type === "participant" && set.audience === "participants") || (type === "staff" && set.audience === "staff"));
  const assignableStaffRows = rows.filter((row) => type === "staff" && row.savedId && !row.raw?.[REQUIRED_STAFF_RAW.placeholder]);
  const tooltipClass =
    "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-gray-100 bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100";
  const headerTooltipClass =
    `pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl border ${toneClasses.headerTooltip} bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100`;

  const toggleField = (field: DraftField) => {
    const alwaysOpenFields = type === "staff" ? openStaffFields : openParticipantFields;
    if (alwaysOpenFields.includes(field)) return;
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const headerIconButtonClass =
    "group relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700";
  const headerOpenColumnClass =
    "inline-flex items-center justify-center gap-1 rounded-lg bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700";
  const optionalParentHeaderHint = (label: string) => `${label} (לא חובה מעל גיל 18)`;
  const optionalParentEmptyCellClass = "border-gray-100 bg-gray-50 text-gray-300";
  const optionalParentEmptyInputClass =
    "border-gray-100 bg-gray-50 text-gray-500 placeholder:text-gray-400 focus:border-gray-200 focus:ring-gray-100";
  const staffFieldFilledClass = (filled: boolean, slotPlaceholder: boolean, invalid: boolean) =>
    type === "staff" && filled && !slotPlaceholder && !invalid
      ? "border-amber-200 bg-amber-50/60 text-gray-800 focus:border-amber-300 focus:ring-amber-100"
      : "";

  return (
    <div className={`overflow-hidden rounded-3xl border ${toneClasses.border} bg-white shadow-sm`}>
      <div className={`border-b ${toneClasses.border} ${toneClasses.headerBg} px-4 py-3`}>
        <h3 className={`font-black ${toneClasses.headerText}`}>{title}</h3>
        <p className={`text-xs font-bold ${toneClasses.helperText}`}>
          אפשר להזין ישירות בטבלה. העמודות עם האייקונים נפתחות בלחיצה; כתום מסמן שדה מלא, אפור ריק מסמן שדה לא חובה (הורים מעל גיל 18), ואדום מסמן טלפון/אימייל לא תקינים. ניתן לגרור את הטבלה עם העכבר לגלילה.
          {type === "staff" ? " תגי התפקיד בעמודה הראשונה; לחיצה עם סמל הפרדה מחזירה תפקיד לתקן חסר." : ""}
          {type === "staff" ? " לצוות מעל גיל 18, שדות הורים ריקים מסומנים באפור ואינם חובה. אישור משטרה נדרש לגברים מעל גיל 18." : ""}
        </p>
      </div>
      <DragScrollArea className="max-h-[min(82vh,calc(100dvh-10rem))] overflow-auto">
        <table className="min-w-[1320px] w-full text-center text-xs">
          <thead className="sticky top-0 z-20 bg-gray-200 text-gray-800 shadow-sm">
            <tr>
              {allFields.map((field) => {
                const meta = participantFieldMeta[field];
                const alwaysOpenFields = type === "staff" ? openStaffFields : openParticipantFields;
                const open = alwaysOpenFields.includes(field) || expandedFields.has(field);
                const optionalStaffParentHeader = type === "staff" && staffParentFields.includes(field);
                return (
                  <th key={field} className={`${open ? (field === "staffRole" && type === "staff" ? "min-w-[148px]" : "min-w-[118px]") + " px-1 py-0.5" : "w-12 p-0.5"} text-center font-black`}>
                    {open ? (
                      <button type="button" onClick={() => toggleField(field)} className={headerOpenColumnClass}>
                        <meta.Icon size={12} />
                        {meta.label}
                      </button>
                    ) : (
                      <button type="button" onClick={() => toggleField(field)} className={headerIconButtonClass}>
                        <meta.Icon size={14} />
                        <span className={headerTooltipClass}>
                          {optionalStaffParentHeader ? optionalParentHeaderHint(meta.label) : meta.label}
                        </span>
                      </button>
                    )}
                  </th>
                );
              })}
              {visibleAssignmentSets.map((set) => {
                const meta = assignmentKindMeta[set.kind];
                const label = set.title || meta.label;
                return (
                  <th key={set.id} className="w-12 p-0.5 text-center font-black">
                    <span className="group relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm">
                      <meta.Icon size={14} />
                      <span className={headerTooltipClass}>{label}</span>
                    </span>
                  </th>
                );
              })}
              <th className="w-14 px-0.5 py-0.5 text-center font-black">סטטוס</th>
              <th className="w-12 px-1 py-0.5 text-center font-black">מחיקה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const roleLabels = requiredRoleLabels(row.raw);
              const rowGender = normalizeStaffGender(row.gender);
              const protectedRequired = isRequiredStaffProtected(row);
              const placeholderRequired = Boolean(row.raw?.[REQUIRED_STAFF_RAW.placeholder]);
              return (
              <tr key={row.id} className={`border-t ${toneClasses.rowBorder} ${placeholderRequired ? "bg-amber-50/60" : protectedRequired ? "bg-emerald-50/45" : "bg-white/70"} hover:bg-white`}>
                {allFields.map((field) => {
                  const meta = participantFieldMeta[field];
                  const alwaysOpenFields = type === "staff" ? openStaffFields : openParticipantFields;
                  const open = alwaysOpenFields.includes(field) || expandedFields.has(field);
                  const value = row[field];
                  const invalid = isDraftFieldInvalid(row, field);
                  const slotPlaceholderNameField =
                    placeholderRequired &&
                    ((field === "firstName" && isStaffSlotPlaceholderFirstName(value)) ||
                      (field === "lastName" && isStaffSlotPlaceholderLastName(value, row)));
                  const displayValue =
                    field === "staffRole" && type === "staff"
                      ? genderedStaffRoleDisplay(slotPlaceholderNameField ? "" : value, rowGender)
                      : slotPlaceholderNameField
                        ? ""
                        : value;
                  const filled = slotPlaceholderNameField ? false : Boolean(value.trim());
                  const age = field === "birthDate" ? calculateAge(value) : null;
                  const gender = field === "gender" ? normalizeStaffGender(value) : normalizeStaffGender(row.gender);
                  const disabledPoliceApproval = field === "policeApproval" && !requiresPoliceApproval(row);
                  const policeApprovalSkipReason =
                    field === "policeApproval" && disabledPoliceApproval
                      ? normalizeStaffGender(row.gender) === "female"
                        ? "לא נדרש (נקבה)"
                        : calculateAge(row.birthDate) !== null && calculateAge(row.birthDate)! < 18
                          ? "לא נדרש (מתחת לגיל 18)"
                          : "לא נדרש"
                      : "";
                  const optionalParentField = isOptionalStaffParentField(row, field);
                  const inputPlaceholder = slotPlaceholderNameField
                    ? "תקן חסר"
                    : optionalParentField && !filled
                      ? `${meta.label} (לא חובה)`
                      : meta.label;
                  const tooltip = invalid
                    ? `${meta.label}: ערך לא תקין`
                    : field === "birthDate" && age !== null
                      ? `${meta.label}: גיל ${age}`
                      : field === "gender" && gender
                        ? `${meta.label}: ${staffGenderLabel(gender)}`
                      : optionalParentField
                        ? `${meta.label}: ${filled ? "מלא, לא חובה" : "לא חובה"} (מעל גיל 18)`
                        : filled
                          ? `${meta.label}: מלא`
                          : meta.label;
                  return (
                    <td key={field} className={`${open ? "px-1.5 py-0.5" : "p-0.5"} align-middle text-center`}>
                      {disabledPoliceApproval ? (
                        <span className="inline-flex h-8 items-center justify-center rounded-lg bg-gray-50 px-2 text-[10px] font-bold text-gray-400" title={policeApprovalSkipReason}>
                          לא נדרש
                        </span>
                      ) : open ? (
                        field === "staffRole" && type === "staff" && roleLabels.length > 0 ? (
                          <StaffRoleBadges
                            roleLabels={roleLabels}
                            rowGender={rowGender}
                            placeholderRequired={placeholderRequired}
                            saving={saving}
                            savedId={row.savedId}
                            onSplitStaffRole={onSplitStaffRole}
                          />
                        ) : meta.kind === "gender" ? (
                          <Select
                            value={normalizeStaffGender(value)}
                            onChange={(next) => updateRow(row.id, field, next)}
                            placeholder="מגדר"
                            options={STAFF_GENDER_OPTIONS}
                            accent={tone === "amber" ? "amber" : "cyan"}
                            buttonClassName="!h-8 !text-xs"
                          />
                        ) : (
                        <input
                          className={`${inputClass} ${invalid ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-100" : slotPlaceholderNameField ? "border-amber-100 bg-amber-50/50 text-gray-700 placeholder:text-gray-400 placeholder:font-bold focus:border-amber-200 focus:ring-amber-100" : staffFieldFilledClass(filled, slotPlaceholderNameField, invalid) || (optionalParentField && !filled ? optionalParentEmptyInputClass : "")}`}
                          value={displayValue}
                          placeholder={inputPlaceholder}
                          inputMode={field === "birthDate" ? "numeric" : meta.kind === "phone" ? "tel" : meta.kind === "email" ? "email" : "text"}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              field,
                              field === "staffRole" && type === "staff"
                                ? canonicalStaffRoleLabel(e.target.value)
                                : e.target.value,
                            )
                          }
                        />
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleField(field)}
                          className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition-colors ${
                            invalid
                              ? "border-red-200 bg-red-100 text-red-700"
                              : filled
                                ? toneClasses.filledIcon
                                : optionalParentField
                                  ? optionalParentEmptyCellClass
                                  : "border-gray-200 bg-white text-gray-400"
                          }`}
                        >
                          {field === "birthDate" && age !== null ? (
                            <span className="text-xs font-black leading-none">{age}</span>
                          ) : field === "gender" && gender ? (
                            <span className="text-xs font-black leading-none">{staffGenderShortLabel(gender)}</span>
                          ) : (
                            <meta.Icon size={14} />
                          )}
                          <span className={tooltipClass}>{tooltip}</span>
                        </button>
                      )}
                    </td>
                  );
                })}
                {visibleAssignmentSets.map((set) => {
                  const itemName = assignmentMembershipByPerson.get(row.savedId || row.id)?.get(set.id) || "";
                  const meta = assignmentKindMeta[set.kind];
                  return (
                    <td key={set.id} className="p-0.5 align-middle text-center">
                      <span
                        className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm ${
                          itemName ? "border-emerald-200 bg-emerald-500 text-white" : "border-gray-200 bg-white text-gray-400"
                        }`}
                      >
                        <meta.Icon size={14} />
                        <span className={tooltipClass}>{itemName || set.title}</span>
                      </span>
                    </td>
                  );
                })}
                <td className="px-0.5 py-0.5 align-middle text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {placeholderRequired && row.savedId && onAssignRequiredRole ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={requiredRoleTargets[row.savedId] || ""}
                          onChange={(targetId) =>
                            setRequiredRoleTargets((prev) => ({ ...prev, [row.savedId || row.id]: targetId }))
                          }
                          placeholder="מזג לאיש צוות..."
                          accent="amber"
                          disabled={saving}
                          className="max-w-36"
                          buttonClassName="!h-7 !rounded-lg !px-1.5 !text-[10px]"
                          menuClassName="min-w-[10rem]"
                          options={assignableStaffRows.map((staffRow) => ({
                            value: staffRow.savedId || staffRow.id,
                            label: [staffRow.firstName, staffRow.lastName].filter(Boolean).join(" ") || staffRow.staffRole,
                          }))}
                        />
                        <button
                          type="button"
                          disabled={saving || !requiredRoleTargets[row.savedId]}
                          onClick={() => {
                            const targetId = requiredRoleTargets[row.savedId || ""];
                            if (targetId && row.savedId) void onAssignRequiredRole(row.savedId, targetId);
                          }}
                          className="h-7 rounded-lg bg-amber-500 px-2 text-[10px] font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          מיזוג
                        </button>
                      </div>
                    ) : (
                      <span
                        title={canAutosave(row) ? "נשמר אוטומטית" : "ממתין לפרטים"}
                        className={`inline-flex h-7 w-7 cursor-default items-center justify-center rounded-lg border ${canAutosave(row) ? "border-cyan-100 bg-cyan-50 text-cyan-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : canAutosave(row) ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-0.5 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => setPendingDelete(row)}
                    disabled={saving || protectedRequired}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      protectedRequired ? "border-gray-100 bg-gray-50 text-gray-300" : "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                    aria-label={protectedRequired ? "תקן חובה מוגן ממחיקה" : "מחק שורה"}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )})}
            <tr className={`border-t ${toneClasses.border} ${toneClasses.addRowBg}`}>
              <td colSpan={allFields.length + visibleAssignmentSets.length + 2} className="p-2 align-middle text-center">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={saving}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${toneClasses.addButton} shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60`}
                  aria-label={type === "participant" ? participantLabels?.addParticipantRow || "הוסף שורת חניך" : "הוסף שורת צוות"}
                >
                  <Plus size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </DragScrollArea>
      {pendingDelete ? (
        <DeleteConfirmDialog
          title={type === "staff" ? "מחיקת איש צוות" : participantLabels?.deleteParticipantTitle || "מחיקת חניך"}
          message="האם למחוק את השורה הזו? הפעולה תמחק את הנתונים מהטבלה."
          deleting={saving}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDeleteRow()}
        />
      ) : null}
    </div>
  );
}

function AssignmentsPanel({
  people,
  buses,
  assignmentSets,
  saving,
  onCreateSet,
  onRenameSet,
  onDeleteSet,
  onCreateItem,
  onRenameItem,
  onDeleteItem,
  onAssignMembers,
  onRemoveMember,
  participantLabels,
}: {
  people: Participant[];
  buses: PlanBus[];
  assignmentSets: AssignmentSet[];
  saving: boolean;
  participantLabels: TripParticipantLabels;
  onCreateSet: (kind: AssignmentKind, audience: AssignmentAudience, customKindLabel: string) => Promise<unknown>;
  onRenameSet: (setId: string, title: string) => Promise<unknown>;
  onDeleteSet: (setId: string) => Promise<unknown>;
  onCreateItem: (setId: string, name: string, busId?: string | null) => Promise<{ itemId?: string } | null>;
  onRenameItem: (itemId: string, name: string) => Promise<unknown>;
  onDeleteItem: (itemId: string) => Promise<unknown>;
  onAssignMembers: (setId: string, itemId: string, participantIds: string[]) => Promise<unknown>;
  onRemoveMember: (memberId: string) => Promise<unknown>;
}) {
  const [activeSetId, setActiveSetId] = useState("");
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftName, setDraftName] = useState("");
  const [draftBusId, setDraftBusId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ type: "set" | "item"; id: string; title: string } | null>(null);
  const [editingSet, setEditingSet] = useState<{ id: string; title: string } | null>(null);

  const activeSet = assignmentSets.find((set) => set.id === activeSetId) || assignmentSets[0] || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const eligiblePeople = useMemo(() => {
    if (!activeSet) return [];
    return people.filter((person) => activeSet.audience === "both" || (activeSet.audience === "participants" && person.type === "participant") || (activeSet.audience === "staff" && person.type === "staff"));
  }, [activeSet, people]);
  const assignedIds = useMemo(() => new Set(activeSet?.items.flatMap((item) => item.members.map((member) => member.participantId)) || []), [activeSet]);
  const unassignedCount = eligiblePeople.filter((person) => !assignedIds.has(person.id)).length;
  const selectedCount = selectedIds.size;
  const setIcon = activeSet ? assignmentKindMeta[activeSet.kind].Icon : Users;
  const SetIcon = setIcon;
  const defaultItemLabel = activeSet ? assignmentKindMeta[activeSet.kind].itemPrefix : "קבוצה מס׳";

  const togglePerson = (personId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const createItemAndAssign = async () => {
    if (!activeSet || selectedIds.size === 0) return;
    const busId = activeSet.kind === "buses" ? draftBusId || null : null;
    if (activeSet.kind === "buses" && !busId) return;
    const result = await onCreateItem(activeSet.id, draftName, busId);
    if (result?.itemId) {
      await onAssignMembers(activeSet.id, result.itemId, Array.from(selectedIds));
      setSelectedIds(new Set());
      setDraftName("");
      setDraftBusId("");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "set") await onDeleteSet(pendingDelete.id);
    else await onDeleteItem(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
      <div className="border-b border-purple-100 bg-purple-50 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black text-purple-900">שיבוצים</h3>
            <p className="text-xs font-bold text-purple-700">אפשר לפתוח לשוניות שיבוץ לקבוצות, אוטובוסים, חדרים או סוג אחר. {participantLabels.assignTablesHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateSet(true)}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 text-sm font-black text-purple-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            לשונית שיבוץ
          </button>
        </div>
      </div>

      {assignmentSets.length ? (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {assignmentSets.map((set) => {
              const Icon = assignmentKindMeta[set.kind].Icon;
              const active = activeSet?.id === set.id;
              return (
                <div
                  key={set.id}
                  className={`inline-flex h-11 items-center overflow-hidden rounded-2xl border text-sm font-black shadow-sm transition-colors ${
                    active ? "border-purple-200 bg-purple-600 text-white" : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSetId(set.id);
                      setSelectedIds(new Set());
                    }}
                    className="inline-flex h-full items-center gap-2 px-4"
                  >
                    <Icon size={16} />
                    {set.title}
                  </button>
                  <span className={`h-6 w-px ${active ? "bg-white/25" : "bg-gray-200"}`} />
                  <button
                    type="button"
                    onClick={() => setEditingSet({ id: set.id, title: set.title })}
                    disabled={saving}
                    className={`inline-flex h-full w-10 items-center justify-center transition-colors ${active ? "hover:bg-white/15" : "hover:bg-white"} disabled:cursor-not-allowed disabled:opacity-60`}
                    aria-label={`ערוך שם גיליון ${set.title}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ type: "set", id: set.id, title: set.title })}
                    disabled={saving}
                    className={`inline-flex h-full w-10 items-center justify-center transition-colors ${active ? "hover:bg-white/15" : "hover:bg-red-50 hover:text-red-600"} disabled:cursor-not-allowed disabled:opacity-60`}
                    aria-label={`מחק גיליון ${set.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {activeSet ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <SummaryCard label={activeSet.kind === "buses" ? "אוטובוסים" : activeSet.kind === "rooms" ? "חדרים" : "קבוצות"} value={activeSet.items.length} icon={<SetIcon size={16} />} />
                <SummaryCard label="משובצים" value={assignedIds.size} tone="cyan" />
                <SummaryCard label="טרם שובצו" value={unassignedCount} tone={unassignedCount ? "amber" : "cyan"} />
                <SummaryCard label="קהל יעד" value={eligiblePeople.length} icon={<Users size={16} />} />
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    key={activeSet.id}
                    defaultValue={activeSet.title}
                    onBlur={(event) => {
                      const nextTitle = event.target.value.trim();
                      if (nextTitle && nextTitle !== activeSet.title) void onRenameSet(activeSet.id, nextTitle);
                    }}
                    className="h-10 rounded-2xl border border-purple-100 bg-white px-3 text-center text-sm font-black text-purple-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                    aria-label="שם לשונית שיבוץ"
                  />
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-purple-700">מיועד ל: {audienceLabel(activeSet.audience, participantLabels)}</span>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ type: "set", id: activeSet.id, title: activeSet.title })}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 md:mr-auto"
                  >
                    <Trash2 size={14} />
                    מחק לשונית
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-sm font-black text-gray-800">סימון לשיבוץ</h4>
                      <p className="text-xs font-bold text-gray-500">בחר אנשים ואז סגור אותם כ{activeSet.kind === "buses" ? "אוטובוס" : activeSet.kind === "rooms" ? "חדר" : "קבוצה"}.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-600">נבחרו {selectedCount}</span>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full min-w-[720px] text-center text-xs">
                      <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                        <tr>
                          <th className="w-16 p-2">סימון</th>
                          <th className="p-2">שם פרטי</th>
                          <th className="p-2">שם משפחה</th>
                          <th className="p-2">סניף / תפקיד</th>
                          <th className="p-2">כיתה</th>
                          <th className="p-2">שיבוץ נוכחי</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligiblePeople.map((person) => {
                          const draft = draftFromParticipant(person);
                          const currentItem = activeSet.items.find((item) => item.members.some((member) => member.participantId === person.id));
                          return (
                            <tr key={person.id} className="border-t border-gray-100 bg-white hover:bg-purple-50/30">
                              <td className="p-2 align-middle">
                                <input type="checkbox" checked={selectedIds.has(person.id)} onChange={() => togglePerson(person.id)} className="h-4 w-4 accent-purple-600" />
                              </td>
                              <td className="p-2 align-middle font-bold text-gray-800">{draft.firstName || person.name}</td>
                              <td className="p-2 align-middle font-bold text-gray-800">{draft.lastName}</td>
                              <td className="p-2 align-middle font-bold text-gray-600">
                                {person.type === "staff"
                                  ? genderedStaffRoleDisplay(draft.staffRole || draft.branch, normalizeStaffGender(draft.gender)) || draft.branch
                                  : draft.branch}
                              </td>
                              <td className="p-2 align-middle font-bold text-gray-600">{person.type === "participant" ? draft.grade : ""}</td>
                              <td className="p-2 align-middle">
                                <span className={`rounded-full px-3 py-1 text-[11px] font-black ${currentItem ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"}`}>
                                  {currentItem?.name || "לא שובץ"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-white p-3 shadow-sm">
                  <h4 className="text-sm font-black text-purple-900">סגירת מסומנים</h4>
                  <p className="mt-1 text-xs font-bold text-gray-500">שם ריק יקבל ברירת מחדל כמו {defaultItemLabel}.</p>
                  {activeSet.kind === "buses" ? (
                    <Select
                      value={draftBusId}
                      onChange={setDraftBusId}
                      placeholder="בחר אוטובוס"
                      accent="purple"
                      disabled={saving}
                      className="mt-3"
                      buttonClassName="!rounded-2xl"
                      options={buses.map((bus) => ({
                        value: bus.id,
                        label: `${bus.bus_number || bus.name}${bus.capacity ? ` (${bus.capacity} מקומות)` : ""}`,
                      }))}
                    />
                  ) : null}
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder={`שם, למשל ${defaultItemLabel} 1`}
                    className="mt-3 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-sm font-bold outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                  />
                  <Button className="mt-3 w-full" onClick={() => void createItemAndAssign()} disabled={saving || selectedIds.size === 0 || (activeSet.kind === "buses" && !draftBusId)}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    סגור את המסומנים
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {activeSet.items.map((item) => {
                  const bus = item.busId ? buses.find((candidate) => candidate.id === item.busId) : null;
                  const memberPeople = item.members.map((member) => ({ member, person: peopleById.get(member.participantId) })).filter((row): row is { member: AssignmentMember; person: Participant } => Boolean(row.person));
                  const staff = memberPeople.filter((row) => row.person.type === "staff");
                  const participants = memberPeople.filter((row) => row.person.type === "participant");
                  const overCapacity = Boolean(bus?.capacity && memberPeople.length > bus.capacity);
                  return (
                    <div key={item.id} className={`rounded-2xl border p-3 shadow-sm ${overCapacity ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          defaultValue={item.name}
                          onBlur={(event) => {
                            const nextName = event.target.value.trim();
                            if (nextName && nextName !== item.name) void onRenameItem(item.id, nextName);
                          }}
                          className="h-10 flex-1 rounded-2xl border border-gray-200 bg-white px-3 text-center text-sm font-black outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                          aria-label="שם פריט שיבוץ"
                        />
                        <span className={`rounded-full px-3 py-2 text-xs font-black ${overCapacity ? "bg-red-100 text-red-700" : "bg-cyan-50 text-cyan-700"}`}>
                          {memberPeople.length}
                          {bus?.capacity ? `/${bus.capacity}` : ""} משובצים
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ type: "item", id: item.id, title: item.name })}
                          disabled={saving}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="מחק פריט שיבוץ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {overCapacity ? <p className="mt-2 text-xs font-black text-red-700">יש יותר משובצים ממספר המקומות באוטובוס.</p> : null}
                      <div className="mt-3 space-y-2">
                        {[...staff, ...participants].map(({ member, person }) => {
                          const draft = draftFromParticipant(person);
                          return (
                            <div key={member.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                              <span>
                                {person.type === "staff" ? "צוות: " : "חניך: "}
                                {draft.firstName} {draft.lastName}
                              </span>
                              <button type="button" onClick={() => void onRemoveMember(member.id)} disabled={saving} className="text-red-600 hover:text-red-700 disabled:opacity-50">
                                ביטול
                              </button>
                            </div>
                          );
                        })}
                        {!memberPeople.length ? <div className="rounded-xl bg-gray-50 px-3 py-2 text-center text-xs font-bold text-gray-400">אין משובצים עדיין</div> : null}
                      </div>
                      {selectedIds.size ? (
                        <Button variant="outline" className="mt-3 w-full" onClick={() => void onAssignMembers(activeSet.id, item.id, Array.from(selectedIds))} disabled={saving}>
                          שבץ מסומנים לכאן
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Users size={26} />
          </div>
          <h4 className="mt-3 text-lg font-black text-gray-800">עדיין אין לשוניות שיבוץ</h4>
          <p className="mt-1 text-sm font-bold text-gray-500">לחץ על + כדי לפתוח שיבוץ קבוצות, אוטובוסים, חדרים או אחר.</p>
        </div>
      )}

      {showCreateSet ? (
        <CreateAssignmentSetDialog
          saving={saving}
          participantLabels={participantLabels}
          onCancel={() => setShowCreateSet(false)}
          onCreate={async (kind, audience, customKindLabel) => {
            await onCreateSet(kind, audience, customKindLabel);
            setShowCreateSet(false);
          }}
        />
      ) : null}
      {editingSet ? (
        <RenameAssignmentSetDialog
          initialTitle={editingSet.title}
          saving={saving}
          onCancel={() => setEditingSet(null)}
          onSave={async (title) => {
            await onRenameSet(editingSet.id, title);
            setEditingSet(null);
          }}
        />
      ) : null}
      {pendingDelete ? (
        <DeleteConfirmDialog
          title={pendingDelete.type === "set" ? "מחיקת לשונית שיבוץ" : "מחיקת שיבוץ"}
          message={`האם למחוק את "${pendingDelete.title}"? השיבוצים שבתוכו יימחקו.`}
          deleting={saving}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}

function CreateAssignmentSetDialog({
  saving,
  participantLabels,
  onCancel,
  onCreate,
}: {
  saving: boolean;
  participantLabels: TripParticipantLabels;
  onCancel: () => void;
  onCreate: (kind: AssignmentKind, audience: AssignmentAudience, customKindLabel: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<AssignmentKind>("groups");
  const [audience, setAudience] = useState<AssignmentAudience>("participants");
  const [customKindLabel, setCustomKindLabel] = useState("");
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <button type="button" aria-label="סגור חלון יצירת שיבוץ" className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-xl rounded-3xl border border-purple-100 bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onCancel} className="absolute left-4 top-4 rounded-full bg-gray-50 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" aria-label="סגור">
          <X size={18} />
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
          <Plus size={26} />
        </div>
        <h3 className="mt-4 text-xl font-black text-gray-800">לשונית שיבוץ חדשה</h3>
        <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500">בחר סוג שיבוץ ואז למי הוא מיועד.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(assignmentKindMeta) as AssignmentKind[]).map((option) => {
            const Icon = assignmentKindMeta[option].Icon;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`rounded-2xl border p-3 text-center transition-all ${kind === option ? "border-purple-200 bg-purple-50 text-purple-700 shadow-sm" : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
              >
                <Icon size={18} className="mx-auto" />
                <span className="mt-1 block text-sm font-black">{assignmentKindMeta[option].label}</span>
              </button>
            );
          })}
        </div>
        {kind === "other" ? (
          <input
            value={customKindLabel}
            onChange={(event) => setCustomKindLabel(event.target.value)}
            placeholder="פירוט סוג השיבוץ"
            className="mt-3 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-sm font-bold outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          />
        ) : null}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["participants", "staff", "both"] as AssignmentAudience[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAudience(option)}
              className={`rounded-2xl border p-3 text-sm font-black transition-all ${audience === option ? "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm" : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
            >
              {audienceLabel(option, participantLabels)}
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            ביטול
          </Button>
          <Button className="flex-1" onClick={() => void onCreate(kind, audience, customKindLabel)} disabled={saving || (kind === "other" && !customKindLabel.trim())}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            צור לשונית
          </Button>
        </div>
      </div>
    </div>
  );
}

function RenameAssignmentSetDialog({
  initialTitle,
  saving,
  onCancel,
  onSave,
}: {
  initialTitle: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const trimmedTitle = title.trim();
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <button type="button" aria-label="סגור חלון עריכת שם גיליון" className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl border border-purple-100 bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onCancel} className="absolute left-4 top-4 rounded-full bg-gray-50 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" aria-label="סגור">
          <X size={18} />
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
          <Pencil size={26} />
        </div>
        <h3 className="mt-4 text-xl font-black text-gray-800">עריכת שם גיליון שיבוץ</h3>
        <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500">השם יוצג כלשונית וגם כעמודת שיבוץ בטבלאות הרלוונטיות.</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-5 h-11 w-full rounded-2xl border border-purple-100 bg-white px-3 text-center text-sm font-black text-purple-900 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          placeholder="שם גיליון"
          autoFocus
        />
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            ביטול
          </Button>
          <Button className="flex-1" onClick={() => void onSave(trimmedTitle)} disabled={saving || !trimmedTitle}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            שמור שם
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "cyan" }: { label: string; value: number; icon?: React.ReactNode; tone?: "cyan" | "amber" | "red" }) {
  const toneClass =
    tone === "red"
      ? "border-red-100 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-cyan-100 bg-cyan-50 text-cyan-700";
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function DeleteConfirmDialog({
  title,
  message,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <button type="button" aria-label="סגור חלון מחיקה" className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={26} />
        </div>
        <h3 className="mt-4 text-xl font-black text-gray-800">{title}</h3>
        <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500">{message}</p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={deleting}>
            ביטול
          </Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm} disabled={deleting}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            מחיקה
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditableBusesTable({
  buses,
  saving,
  peopleByBus,
  onSave,
  onDelete,
}: {
  buses: PlanBus[];
  saving: boolean;
  peopleByBus: Map<string, Participant[]>;
  onSave: (row: BusDraft) => Promise<boolean>;
  onDelete: (row: BusDraft) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<BusDraft[]>(() => {
    const existing = buses.map(draftFromBus);
    return existing.length ? existing : [emptyBusDraft()];
  });
  const [pendingDelete, setPendingDelete] = useState<BusDraft | null>(null);
  const inputClass = "h-10 w-full rounded-xl border border-gray-200 bg-white px-2 text-center text-sm font-bold outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100";
  const saveTimersRef = useRef<Record<string, number>>({});
  const canAutosave = (row: BusDraft) => Boolean(row.busNumber.trim()) && isValidPhone(row.driverPhone) && isValidPhone(row.leaderPhone) && isValidEmail(row.leaderEmail);
  const scheduleAutosave = (row: BusDraft) => {
    window.clearTimeout(saveTimersRef.current[row.id]);
    if (!canAutosave(row)) return;
    saveTimersRef.current[row.id] = window.setTimeout(() => {
      void onSave(row);
    }, 900);
  };
  const updateRow = (rowId: string, field: keyof Omit<BusDraft, "id" | "savedId">, value: string) => {
    const current = rows.find((row) => row.id === rowId);
    if (current) scheduleAutosave({ ...current, [field]: value });
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };
  const confirmDeleteRow = async () => {
    const row = pendingDelete;
    if (!row) return;
    const ok = row.savedId ? await onDelete(row) : true;
    if (ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
    setPendingDelete(null);
  };

  return (
    <div data-plan-tour="transport-buses-table" className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
      <div className="border-b border-cyan-100 bg-cyan-50 px-4 py-3">
        <h3 className="flex items-center gap-2 font-black text-cyan-900">
          <Bus size={18} />
          טבלת אוטובוסים
        </h3>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="min-w-[1360px] w-full text-center text-xs">
          <thead className="sticky top-0 z-20 bg-gray-200 text-gray-800 shadow-sm">
            <tr>
              {busFields.map((field) => {
                const meta = busFieldMeta[field];
                return (
                  <th key={field} className="min-w-[150px] p-2 text-center font-black">
                    <span className="inline-flex items-center justify-center gap-1">
                      <meta.Icon size={14} />
                      {meta.label}
                    </span>
                  </th>
                );
              })}
              <th className="w-24 p-2 text-center font-black">סטטוס</th>
              <th className="w-24 p-2 text-center font-black">שיבוץ</th>
              <th className="w-16 p-2 text-center font-black">מחיקה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const busPeople = row.savedId ? peopleByBus.get(row.savedId) || [] : [];
              return (
                <tr key={row.id} className="border-t border-cyan-50 bg-white/70 hover:bg-white">
                  {busFields.map((field) => {
                    const meta = busFieldMeta[field];
                    const invalid = (meta.kind === "phone" && !isValidPhone(row[field])) || (meta.kind === "email" && !isValidEmail(row[field]));
                    return (
                      <td key={field} className="p-2 align-middle text-center">
                        <input
                          className={`${inputClass} ${invalid ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-100" : ""}`}
                          value={row[field]}
                          placeholder={meta.label}
                          inputMode={meta.kind === "phone" ? "tel" : meta.kind === "email" ? "email" : meta.kind === "number" ? "numeric" : "text"}
                          onChange={(event) => updateRow(row.id, field, event.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td className="p-2 align-middle text-center">
                    <span className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-3 text-[11px] font-black ${canAutosave(row) ? "border-cyan-100 bg-cyan-50 text-cyan-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : canAutosave(row) ? <CheckCircle2 size={14} /> : null}
                      {canAutosave(row) ? "נשמר אוטומטית" : "ממתין לפרטים"}
                    </span>
                  </td>
                  <td className="p-2 align-middle text-center">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                      {busPeople.length}/{row.capacity.trim() ? row.capacity : "—"}
                    </span>
                  </td>
                  <td className="p-2 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      disabled={saving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="מחק שורת אוטובוס"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-cyan-100 bg-cyan-50/70">
              <td colSpan={busFields.length + 3} className="p-3 align-middle text-center">
                <button
                  type="button"
                  onClick={() => setRows((prev) => [...prev, emptyBusDraft()])}
                  disabled={saving}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-white text-brand-cyan shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="הוסף שורת אוטובוס"
                >
                  <Plus size={18} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {pendingDelete ? (
        <DeleteConfirmDialog
          title="מחיקת אוטובוס"
          message="האם למחוק את שורת האוטובוס הזו? אם כבר יש שיבוצים לאוטובוס, הם ינותקו מהשורה הזו."
          deleting={saving}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDeleteRow()}
        />
      ) : null}
    </div>
  );
}

function TransportView({
  buses,
  peopleByBus,
  saving,
  onSaveBus,
  onDeleteBus,
}: {
  buses: PlanBus[];
  peopleByBus: Map<string, Participant[]>;
  saving: boolean;
  onSaveBus: (row: BusDraft) => Promise<boolean>;
  onDeleteBus: (row: BusDraft) => Promise<boolean>;
}) {
  return (
    <div className="space-y-4">
      <EditableBusesTable buses={buses} saving={saving} peopleByBus={peopleByBus} onSave={onSaveBus} onDelete={onDeleteBus} />
    </div>
  );
}
