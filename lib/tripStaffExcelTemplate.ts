import { REQUIRED_STAFF_RAW, type RequiredStaffPlanRow } from "@/lib/tripRequiredRoles";
import { normalizeStaffGender, staffGenderLabel } from "@/lib/staffGender";

export type StaffExcelTemplateRow = Record<string, string>;

export type ExistingStaffParticipant = {
  id?: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  raw_data?: Record<string, unknown> | null;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const rawText = (raw: Record<string, unknown> | null | undefined, key: string) => String(raw?.[key] ?? "").trim();

const splitName = (name: string) => {
  const parts = textValue(name).split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
};

const formatDateForExcel = (value: unknown) => {
  const normalized = textValue(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }
  return normalized;
};

const emptyStaffExcelRow = (roleLabel: string): StaffExcelTemplateRow => ({
  סוג: "צוות",
  תפקיד: roleLabel,
  "שם פרטי": "",
  "שם משפחה": "",
  "ת.ז.": "",
  "ת. לידה": "",
  כיתה: "",
  סניף: "",
  "טלפון אישי": "",
  "דוא\"ל אישי": "",
  מגדר: "",
  "שם אבא": "",
  "טל' אבא": "",
  "שם אמא": "",
  "טל' אמא": "",
  "רגישות רפואית": "",
  תשלום: "",
  "אישור השתתפות": "",
  "אישור משטרה": "",
});

const roleSlotLabel = (role: RequiredStaffPlanRow, index: number) =>
  role.approved_quantity > 1 ? `${role.role_label} ${index + 1}` : role.role_label;

const roleLabelsFromParticipant = (person: ExistingStaffParticipant) => {
  const raw = person.raw_data || {};
  const labels = Array.isArray(raw[REQUIRED_STAFF_RAW.roleLabels])
    ? (raw[REQUIRED_STAFF_RAW.roleLabels] as unknown[]).map((item) => textValue(item)).filter(Boolean)
    : [];
  const staffRole = rawText(raw, "staffRole") || textValue(person.role);
  return Array.from(new Set([...labels, staffRole].filter(Boolean)));
};

const isPlaceholderParticipant = (person: ExistingStaffParticipant) =>
  Boolean(person.raw_data?.[REQUIRED_STAFF_RAW.placeholder]);

const participantToExcelRow = (roleLabel: string, person: ExistingStaffParticipant): StaffExcelTemplateRow => {
  const raw = person.raw_data || {};
  const split = splitName(textValue(person.full_name));
  const gender = normalizeStaffGender(rawText(raw, "gender"));
  return {
    ...emptyStaffExcelRow(roleLabel),
    תפקיד: roleLabel,
    "שם פרטי": rawText(raw, "firstName") || split.firstName,
    "שם משפחה": rawText(raw, "lastName") || split.lastName,
    "ת.ז.": rawText(raw, "identity"),
    "ת. לידה": formatDateForExcel(rawText(raw, "birthDate")),
    סניף: rawText(raw, "branch"),
    "טלפון אישי": rawText(raw, "personalPhone") || textValue(person.phone),
    "דוא\"ל אישי": rawText(raw, "personalEmail") || rawText(raw, "fatherEmail"),
    מגדר: staffGenderLabel(gender),
    "שם אבא": rawText(raw, "fatherName"),
    "טל' אבא": rawText(raw, "fatherPhone"),
    "שם אמא": rawText(raw, "motherName"),
    "טל' אמא": rawText(raw, "motherPhone"),
    "רגישות רפואית": rawText(raw, "medicalNotes"),
    תשלום: rawText(raw, "paymentStatus"),
    "אישור השתתפות": rawText(raw, "parentApproval"),
    "אישור משטרה": rawText(raw, "policeApproval"),
  };
};

const coordinatorExcelRow = (details: Record<string, unknown>, roleLabel: string): StaffExcelTemplateRow => {
  const split = splitName(textValue(details.coordName));
  return {
    ...emptyStaffExcelRow(roleLabel),
    "שם פרטי": split.firstName,
    "שם משפחה": split.lastName,
    "ת.ז.": textValue(details.coordId),
    "ת. לידה": formatDateForExcel(details.coordDob),
    "טלפון אישי": textValue(details.coordPhone),
    "דוא\"ל אישי": textValue(details.coordEmail),
    "אישור השתתפות": "כן",
  };
};

const secondaryExcelRow = (secondary: Record<string, unknown>, roleLabel: string): StaffExcelTemplateRow => {
  const split = splitName(textValue(secondary.name));
  return {
    ...emptyStaffExcelRow(roleLabel),
    "שם פרטי": split.firstName,
    "שם משפחה": split.lastName,
    "ת.ז.": textValue(secondary.idNumber),
    "ת. לידה": formatDateForExcel(secondary.dob),
    "טלפון אישי": textValue(secondary.phone),
    "דוא\"ל אישי": textValue(secondary.email),
    "אישור השתתפות": "כן",
  };
};

const takeMatchingParticipant = (
  participants: ExistingStaffParticipant[],
  usedIds: Set<string>,
  roleLabel: string,
  roleKey?: string,
) => {
  const match = participants.find((person) => {
    if (!person.id || usedIds.has(person.id) || isPlaceholderParticipant(person)) return false;
    const labels = roleLabelsFromParticipant(person);
    if (labels.includes(roleLabel)) return true;
    const roleKeys = Array.isArray(person.raw_data?.[REQUIRED_STAFF_RAW.roleKeys])
      ? (person.raw_data?.[REQUIRED_STAFF_RAW.roleKeys] as unknown[]).map((item) => textValue(item))
      : [];
    return Boolean(roleKey && roleKeys.includes(roleKey));
  });
  if (match?.id) usedIds.add(match.id);
  return match || null;
};

export function buildStaffExcelTemplateRows(
  details: Record<string, unknown>,
  planRows: RequiredStaffPlanRow[],
  existingStaff: ExistingStaffParticipant[] = [],
): StaffExcelTemplateRow[] {
  const activeRows = planRows.filter((row) => row.status !== "removed" && row.approved_quantity > 0);
  if (!activeRows.length) return [];

  const rows: StaffExcelTemplateRow[] = [];
  const usedParticipantIds = new Set<string>();
  const realStaff = existingStaff.filter((person) => !isPlaceholderParticipant(person));

  const tripLeader = activeRows.find((row) => row.role_key === "trip_leader");
  if (tripLeader) {
    const label = roleSlotLabel(tripLeader, 0);
    const matched = takeMatchingParticipant(realStaff, usedParticipantIds, label, tripLeader.role_key);
    rows.push(matched ? participantToExcelRow(label, matched) : coordinatorExcelRow(details, label));
  }

  const secondary = details.secondaryStaffObj;
  if (secondary && typeof secondary === "object") {
    const roleLabel = textValue((secondary as Record<string, unknown>).role) || "אחראי נוסף";
    const matched = takeMatchingParticipant(realStaff, usedParticipantIds, roleLabel, "additional_leader");
    rows.push(
      matched ? participantToExcelRow(roleLabel, matched) : secondaryExcelRow(secondary as Record<string, unknown>, roleLabel),
    );
  }

  const autoCovered = new Map<string, number>();
  if (tripLeader && rows.length) autoCovered.set(tripLeader.role_key, 1);

  for (const role of activeRows) {
    const covered = autoCovered.get(role.role_key) || 0;
    const missing = Math.max(0, role.approved_quantity - covered);
    for (let index = 0; index < missing; index += 1) {
      const label = roleSlotLabel(role, index);
      const matched = takeMatchingParticipant(realStaff, usedParticipantIds, label, role.role_key);
      rows.push(matched ? participantToExcelRow(label, matched) : emptyStaffExcelRow(label));
    }
  }

  return rows;
}

export const sampleStaffExcelRow = (): StaffExcelTemplateRow => ({
  ...emptyStaffExcelRow("מדריך"),
  "שם פרטי": "מנחם",
  "שם משפחה": "מדריך",
  "ת.ז.": "987654321",
  "ת. לידה": "01/01/2000",
  סניף: "ירושלים",
  "טלפון אישי": "0503333333",
  "דוא\"ל אישי": "staff@example.com",
  מגדר: "זכר",
  "אישור השתתפות": "כן",
  "אישור משטרה": "כן",
});
