import {
  extractParticipantIdentity,
  normalizeIdentityNumber,
  normalizeStaffGender,
  readRawGenderValue,
  resolveStaffGender,
  staffGenderFromDepartment,
  type StaffGender,
} from "@/lib/staffGender";

export type RegistrationFieldKey =
  | "firstName"
  | "lastName"
  | "identity"
  | "birthDate"
  | "branch"
  | "grade"
  | "gender"
  | "personalPhone"
  | "personalEmail"
  | "fatherName"
  | "fatherPhone"
  | "motherName"
  | "motherPhone"
  | "fatherEmail"
  | "medicalNotes"
  | "paymentStatus"
  | "parentApproval"
  | "policeApproval";

export type RegistrationSnapshot = Partial<Record<RegistrationFieldKey, string>>;

export const PARTICIPANT_RAW_FIELD_ALIASES: Record<RegistrationFieldKey, string[]> = {
  firstName: ["firstName", "שם פרטי", "First Name"],
  lastName: ["lastName", "שם משפחה", "Last Name"],
  identity: ["identity", "ת.ז.", "תז", "מספר זהות", "ID", "Identity"],
  birthDate: ["birthDate", "ת. לידה", "תאריך לידה", "Birth Date"],
  branch: ["branch", "branch_name", "סניף", "Branch"],
  grade: ["grade", "כיתה", "Grade"],
  gender: ["gender", "מגדר", "Gender", "מין", "Sex"],
  personalPhone: ["personalPhone", "טלפון אישי", "Personal Phone", "Phone", "טלפון", "נייד", "Mobile"],
  personalEmail: ["personalEmail", "contact_email", "דוא\"ל אישי", "דואל אישי", "Email", "אימייל"],
  fatherName: ["fatherName", "שם אבא", "Father Name"],
  fatherPhone: ["fatherPhone", "טל' אבא", "טלפון אבא", "Father Phone"],
  motherName: ["motherName", "שם אמא", "Mother Name"],
  motherPhone: ["motherPhone", "טל' אמא", "טלפון אמא", "Mother Phone"],
  fatherEmail: ["fatherEmail", "דוא\"ל אבא", "דואל אבא", "אימייל אבא", "Father Email"],
  medicalNotes: ["medicalNotes", "רגישות רפואית", "רגישויות רפואיות", "Medical Notes", "Allergies"],
  paymentStatus: ["paymentStatus", "תשלום", "סטטוס תשלום", "Payment Status"],
  parentApproval: ["parentApproval", "אישור השתתפות", "אישור הורים", "אישור הורה", "Parent Approval"],
  policeApproval: ["policeApproval", "אישור משטרה", "Police Approval"],
};

const textValue = (value: unknown) => String(value ?? "").trim();

const normalizeRawKey = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export function readParticipantRawField(
  raw: Record<string, unknown> | null | undefined,
  field: RegistrationFieldKey,
): string {
  if (!raw) return "";
  const aliases = PARTICIPANT_RAW_FIELD_ALIASES[field];
  for (const alias of aliases) {
    const direct = raw[alias];
    if (direct !== undefined && direct !== null && textValue(direct)) return textValue(direct);
  }
  const aliasSet = new Set(aliases.map(normalizeRawKey));
  for (const [key, value] of Object.entries(raw)) {
    if (!aliasSet.has(normalizeRawKey(key))) continue;
    const normalized = textValue(value);
    if (normalized) return normalized;
  }
  return "";
}

export function parseMotherNameFromFullNameMother(value: unknown): string {
  const trimmed = textValue(value);
  if (!trimmed) return "";
  const match = trimmed.match(/(?:^|\s)(?:בן|בת)\s+(.+)$/);
  return match?.[1]?.trim() || "";
}

export function normalizeRegistrationSnapshot(snapshot: RegistrationSnapshot): RegistrationSnapshot {
  const next: RegistrationSnapshot = {};
  for (const [key, value] of Object.entries(snapshot) as Array<[RegistrationFieldKey, string | undefined]>) {
    const trimmed = textValue(value);
    if (!trimmed) continue;
    if (key === "gender") {
      const gender = normalizeStaffGender(trimmed);
      if (gender) next.gender = gender;
      continue;
    }
    next[key] = trimmed;
  }
  return next;
}

type ProfileLike = {
  official_name?: string | null;
  last_name?: string | null;
  identity_number?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  department?: string | null;
};

export function buildRegistrationSnapshotFromProfile(
  profile: ProfileLike,
  metadata: Record<string, unknown> = {},
): RegistrationSnapshot {
  const branch = textValue(metadata.branch_name) || textValue(metadata.branch);
  const motherName = parseMotherNameFromFullNameMother(metadata.full_name_mother);
  const gender = resolveStaffGender({
    raw: metadata,
    profileDepartment: profile.department,
  });

  return normalizeRegistrationSnapshot({
    firstName: textValue(profile.official_name) || textValue(metadata.official_name) || textValue(metadata.first_name),
    lastName: textValue(profile.last_name) || textValue(metadata.last_name),
    identity: textValue(profile.identity_number) || textValue(metadata.identity_number),
    birthDate: textValue(profile.birth_date) || textValue(metadata.birth_date),
    branch,
    personalPhone: textValue(profile.phone) || textValue(metadata.phone),
    personalEmail: textValue(profile.email) || textValue(metadata.contact_email),
    gender: gender || staffGenderFromDepartment(profile.department),
    motherName,
  });
}

export function readRegistrationFieldsFromRaw(raw: Record<string, unknown> | null | undefined): RegistrationSnapshot {
  if (!raw) return {};
  const snapshot: RegistrationSnapshot = {};
  for (const field of Object.keys(PARTICIPANT_RAW_FIELD_ALIASES) as RegistrationFieldKey[]) {
    if (field === "gender") {
      const gender = readRawGenderValue(raw);
      if (gender) snapshot.gender = gender;
      continue;
    }
    const value = readParticipantRawField(raw, field);
    if (value) snapshot[field] = value;
  }
  return normalizeRegistrationSnapshot(snapshot);
}

export function mergeRegistrationSnapshot(
  current: RegistrationSnapshot,
  incoming: RegistrationSnapshot,
): RegistrationSnapshot {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming) as Array<[RegistrationFieldKey, string | undefined]>) {
    if (!value) continue;
    if (!textValue(merged[key])) merged[key] = value;
  }
  return merged;
}

export function mergeRegistrationIntoRaw(
  raw: Record<string, unknown> | null | undefined,
  snapshot: RegistrationSnapshot,
): Record<string, unknown> {
  const next = { ...(raw || {}) };
  const current = readRegistrationFieldsFromRaw(next);
  const merged = mergeRegistrationSnapshot(current, snapshot);
  for (const [key, value] of Object.entries(merged) as Array<[RegistrationFieldKey, string | undefined]>) {
    if (!value) continue;
    if (!textValue(next[key])) next[key] = value;
  }
  return next;
}

export type RegistrationDraftFields = Partial<Record<RegistrationFieldKey, string>>;

export function applyRegistrationSnapshotToDraft<T extends RegistrationDraftFields>(
  draft: T,
  snapshot: RegistrationSnapshot,
  fields: RegistrationFieldKey[],
): T {
  const next = { ...draft } as T & RegistrationDraftFields;
  for (const field of fields) {
    const incoming = textValue(snapshot[field]);
    if (!incoming) continue;
    const current = textValue(next[field]);
    if (!current) next[field] = incoming;
  }
  return next as T;
}

export type ParticipantDraftLike = Record<string, string | null | undefined>;

export function resolveParticipantIdentity(
  raw: Record<string, unknown> | null | undefined,
  notes?: string | null,
  identity?: string | null,
): string {
  return normalizeIdentityNumber(identity) || extractParticipantIdentity(raw, notes);
}

export function buildRegistrationHintsMap(
  snapshotsByIdentity: Map<string, RegistrationSnapshot>,
): Record<string, RegistrationSnapshot> {
  return Object.fromEntries(snapshotsByIdentity.entries());
}

export function registrationSnapshotGender(snapshot: RegistrationSnapshot): StaffGender {
  return normalizeStaffGender(snapshot.gender);
}

export function buildStaffGenderHintsFromRegistration(
  snapshotsByIdentity: Map<string, RegistrationSnapshot>,
): Record<string, StaffGender> {
  const hints: Record<string, StaffGender> = {};
  for (const [identity, snapshot] of snapshotsByIdentity.entries()) {
    const gender = registrationSnapshotGender(snapshot);
    if (gender) hints[identity] = gender;
  }
  return hints;
}

export const STAFF_REGISTRATION_DRAFT_FIELDS: RegistrationFieldKey[] = [
  "firstName",
  "lastName",
  "identity",
  "birthDate",
  "branch",
  "gender",
  "personalPhone",
  "personalEmail",
  "fatherName",
  "fatherPhone",
  "motherName",
  "motherPhone",
  "medicalNotes",
  "paymentStatus",
  "parentApproval",
  "policeApproval",
];

export const PARTICIPANT_REGISTRATION_DRAFT_FIELDS: RegistrationFieldKey[] = [
  "firstName",
  "lastName",
  "identity",
  "birthDate",
  "branch",
  "grade",
  "fatherName",
  "fatherPhone",
  "motherName",
  "motherPhone",
  "fatherEmail",
  "medicalNotes",
  "paymentStatus",
  "parentApproval",
];

export function normalizeImportedParticipantRaw(raw: Record<string, unknown>): Record<string, unknown> {
  return mergeRegistrationIntoRaw({}, readRegistrationFieldsFromRaw(raw));
}
