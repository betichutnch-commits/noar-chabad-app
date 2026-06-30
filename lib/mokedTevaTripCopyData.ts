import { formatFullGregorianDate } from "@/lib/dateUtils";
import type { TripAutofillMeta } from "@/lib/tripDocumentAutofill";
import { textValue } from "@/lib/tripDocumentAutofill";

export type MokedTevaCopyField = {
  id: string;
  label: string;
  value: string;
};

export type MokedTevaTripLeaderCopy = {
  label: string;
  firstName: string;
  lastName: string;
  identity: string;
  phone: string;
  email: string;
};

export type MokedTevaTripCopyData = {
  fields: MokedTevaCopyField[];
  scheduleText: string;
  leaders: MokedTevaTripLeaderCopy[];
  allText: string;
};

type PlanRowLike = {
  day_index?: number | null;
  order_index?: number;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
};

function splitName(name: string) {
  const parts = textValue(name).split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
}

function isLodgingEvent(eventText: string) {
  const value = textValue(eventText);
  return value.includes("לינת מבנה") || value.includes("לינה");
}

function formatScheduleLine(input: {
  dateLabel: string;
  location: string;
  event: string;
}) {
  const parts = [input.dateLabel, input.location, input.event].map(textValue).filter(Boolean);
  let line = parts.join(" - ");
  if (isLodgingEvent(input.event) && input.location) {
    line += ` (מקום לינה: ${input.location})`;
  }
  return line;
}

function leaderBlock(leader: MokedTevaTripLeaderCopy) {
  return [
    leader.label,
    `שם פרטי אחראי הטיול: ${leader.firstName || "—"}`,
    `שם משפחה אחראי הטיול: ${leader.lastName || "—"}`,
    `ת.ז. אחראי הטיול: ${leader.identity || "—"}`,
    `טלפון אחראי הטיול: ${leader.phone || "—"}`,
    `אימייל אחראי הטיול: ${leader.email || "—"}`,
  ].join("\n");
}

export function buildMokedTevaTripCopyData(input: {
  trip?: TripAutofillMeta | null;
  tripName?: string | null;
  tripStartDate?: string | null;
  planRows: PlanRowLike[];
  dayLabel: (dayIndex?: number | null) => string;
}): MokedTevaTripCopyData {
  const details = (input.trip?.details || {}) as Record<string, unknown>;
  const startDate = formatFullGregorianDate(input.tripStartDate || input.trip?.start_date || "") || textValue(input.trip?.start_date);
  const gradeFrom = textValue(details.gradeFrom);
  const gradeTo = textValue(details.gradeTo);
  const tripTitle = textValue(input.tripName) || textValue(input.trip?.name);

  const scheduleLines = input.planRows
    .map((row, index) => {
      const dayIndex = row.day_index ?? (row.order_index ?? index) + 1;
      return formatScheduleLine({
        dateLabel: input.dayLabel(dayIndex),
        location: textValue(row.location_text),
        event: textValue(row.event_text),
      });
    })
    .filter(Boolean);

  const scheduleText = scheduleLines.join("\n");

  const primarySplit = splitName(textValue(details.coordName) || textValue(input.trip?.coordinator_name));
  const leaders: MokedTevaTripLeaderCopy[] = [
    {
      label: "אחראי הטיול",
      firstName: primarySplit.firstName,
      lastName: primarySplit.lastName,
      identity: textValue(details.coordId),
      phone: textValue(details.coordPhone),
      email: textValue(details.coordEmail),
    },
  ];

  const secondary = details.secondaryStaffObj;
  if (secondary && typeof secondary === "object") {
    const record = secondary as Record<string, unknown>;
    const secondarySplit = splitName(textValue(record.name));
    leaders.push({
      label: textValue(record.role) || "אחראי טיול נוסף",
      firstName: secondarySplit.firstName,
      lastName: secondarySplit.lastName,
      identity: textValue(record.idNumber),
      phone: textValue(record.phone),
      email: textValue(record.email),
    });
  }

  const notes = textValue(details.generalComments);

  const fields: MokedTevaCopyField[] = [
    { id: "start-date", label: "תאריך התחלת הטיול", value: startDate || "—" },
    { id: "grade-from", label: "מכיתה", value: gradeFrom || "—" },
    { id: "grade-to", label: "עד כיתה", value: gradeTo || "—" },
    { id: "trip-name", label: "שם הטיול", value: tripTitle || "—" },
    { id: "schedule", label: "לו״ז הטיול", value: scheduleText || "—" },
    ...leaders.flatMap((leader, index) => {
      const prefix = leaders.length > 1 ? `${leader.label} — ` : "";
      return [
        { id: `leader-${index}-first`, label: `${prefix}שם פרטי אחראי הטיול`, value: leader.firstName || "—" },
        { id: `leader-${index}-last`, label: `${prefix}שם משפחה אחראי הטיול`, value: leader.lastName || "—" },
        { id: `leader-${index}-id`, label: `${prefix}ת.ז. אחראי הטיול`, value: leader.identity || "—" },
        { id: `leader-${index}-phone`, label: `${prefix}טלפון אחראי הטיול`, value: leader.phone || "—" },
        { id: `leader-${index}-email`, label: `${prefix}אימייל אחראי הטיול`, value: leader.email || "—" },
      ];
    }),
    { id: "notes", label: "הערות", value: notes || "—" },
  ];

  const allText = [
    `תאריך התחלת הטיול: ${startDate || "—"}`,
    `מכיתה: ${gradeFrom || "—"}`,
    `עד כיתה: ${gradeTo || "—"}`,
    `שם הטיול: ${tripTitle || "—"}`,
    "",
    "לו״ז הטיול:",
    scheduleText || "—",
    "",
    ...leaders.map((leader) => leaderBlock(leader)),
    "",
    `הערות: ${notes || "—"}`,
  ].join("\n");

  return { fields, scheduleText, leaders, allText };
}
