import { getDepartmentLanguage } from "@/lib/auth";

export type StaffGender = "male" | "female" | "";

const GENDER_RAW_KEY_HINTS = ["gender", "מגדר", "מין", "sex"];

export function normalizeStaffGender(value: unknown): StaffGender {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/״/g, '"');
  if (!normalized) return "";
  if (["male", "m", "זכר", "גבר", "בן"].includes(normalized)) return "male";
  if (["female", "f", "נקבה", "אישה", "בת"].includes(normalized)) return "female";
  return "";
}

export function normalizeIdentityNumber(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function readRawGenderValue(raw: Record<string, unknown> | null | undefined): StaffGender {
  if (!raw) return "";
  for (const key of GENDER_RAW_KEY_HINTS) {
    const normalized = normalizeStaffGender(raw[key]);
    if (normalized) return normalized;
  }
  for (const [key, value] of Object.entries(raw)) {
    const lowered = key.toLowerCase().trim();
    if (GENDER_RAW_KEY_HINTS.some((hint) => lowered === hint.toLowerCase())) {
      const normalized = normalizeStaffGender(value);
      if (normalized) return normalized;
    }
  }
  return "";
}

export function staffGenderFromDepartment(department?: string | null): StaffGender {
  const language = getDepartmentLanguage(department);
  if (language === "male") return "male";
  if (language === "female") return "female";
  return "";
}

export function extractParticipantIdentity(raw: Record<string, unknown> | null | undefined, notes?: string | null): string {
  const fromRaw = normalizeIdentityNumber(raw?.identity);
  if (fromRaw) return fromRaw;
  const notesMatch = String(notes || "").match(/ת\.?ז\.?\s*([\d-]+)/i);
  return normalizeIdentityNumber(notesMatch?.[1]);
}

export function resolveStaffGender(input: {
  raw?: Record<string, unknown> | null;
  identity?: string | null;
  profileDepartment?: string | null;
}): StaffGender {
  const fromRaw = readRawGenderValue(input.raw || {});
  if (fromRaw) return fromRaw;
  return staffGenderFromDepartment(input.profileDepartment);
}

export function buildStaffGenderHints(profileDepartmentsByIdentity: Map<string, string | null | undefined>): Record<string, StaffGender> {
  const hints: Record<string, StaffGender> = {};
  for (const [identity, department] of profileDepartmentsByIdentity.entries()) {
    const gender = staffGenderFromDepartment(department);
    if (gender) hints[identity] = gender;
  }
  return hints;
}

export function staffGenderLabel(gender: StaffGender): string {
  if (gender === "male") return "זכר";
  if (gender === "female") return "נקבה";
  return "";
}

export function staffGenderShortLabel(gender: StaffGender): string {
  if (gender === "male") return "ז";
  if (gender === "female") return "נ";
  return "";
}

export function isStaffMaleGender(gender: unknown): boolean {
  return normalizeStaffGender(gender) === "male";
}

export function requiresStaffPoliceApproval(input: {
  type?: string;
  birthDate?: string;
  gender?: unknown;
  calculateAge?: (birthDate: string) => number | null;
}): boolean {
  if (input.type && input.type !== "staff") return false;
  if (!isStaffMaleGender(input.gender)) return false;
  const birthDate = String(input.birthDate ?? "").trim();
  if (!birthDate) return false;
  const age = input.calculateAge ? input.calculateAge(birthDate) : null;
  return age !== null && age >= 18;
}

const STAFF_ROLE_FEMININE_EXACT: Record<string, string> = {
  "אחראי טיול": "אחראית טיול",
  "אחראי נוסף": "אחראית נוספת",
  "מלווה אוטובוס": "מלווה אוטובוס",
  "מלווה רפואי": "מלווה רפואית",
  "מלווה נשק / מאבטח": "מלווה נשק / מאבטחת",
  "חובש": "חובשת",
  "מאבטח": "מאבטחת",
  "מדריך": "מדריכה",
};

const STAFF_ROLE_MASCULINE_EXACT = Object.fromEntries(
  Object.entries(STAFF_ROLE_FEMININE_EXACT).map(([male, female]) => [female, male]),
) as Record<string, string>;

const feminizeStaffRolePart = (label: string): string => {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  const numberedMatch = trimmed.match(/^(.+?)(\s+\d+)$/);
  const base = numberedMatch?.[1]?.trim() || trimmed;
  const suffix = numberedMatch?.[2] || "";
  if (STAFF_ROLE_FEMININE_EXACT[base]) return `${STAFF_ROLE_FEMININE_EXACT[base]}${suffix}`;

  let result = base
    .replace(/אחראי(?!ת)/g, "אחראית")
    .replace(/מאבטח(?!ת)/g, "מאבטחת")
    .replace(/חובש(?!ת)/g, "חובשת")
    .replace(/מדריך(?!ה)/g, "מדריכה")
    .replace(/מלווה רפואי/g, "מלווה רפואית")
    .replace(/מלווה נשק \/ מאבטח/g, "מלווה נשק / מאבטחת");

  return `${result}${suffix}`;
};

const masculinizeStaffRolePart = (label: string): string => {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  const numberedMatch = trimmed.match(/^(.+?)(\s+\d+)$/);
  const base = numberedMatch?.[1]?.trim() || trimmed;
  const suffix = numberedMatch?.[2] || "";
  if (STAFF_ROLE_MASCULINE_EXACT[base]) return `${STAFF_ROLE_MASCULINE_EXACT[base]}${suffix}`;

  let result = base
    .replace(/אחראית/g, "אחראי")
    .replace(/מאבטחת/g, "מאבטח")
    .replace(/חובשת/g, "חובש")
    .replace(/מדריכה/g, "מדריך")
    .replace(/מלווה רפואית/g, "מלווה רפואי")
    .replace(/מלווה נשק \/ מאבטחת/g, "מלווה נשק / מאבטח");

  return `${result}${suffix}`;
};

export function formatStaffRoleLabelForGender(label: string, gender: StaffGender): string {
  const trimmed = label.trim();
  if (!trimmed || !gender) return trimmed;
  const transform = gender === "female" ? feminizeStaffRolePart : masculinizeStaffRolePart;
  return trimmed
    .split(",")
    .map((part) => transform(part.trim()))
    .join(", ");
}

export function applyGenderToStaffRoleLabel(label: string, gender: StaffGender): string {
  return formatStaffRoleLabelForGender(label, gender);
}
