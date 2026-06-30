import { getDepartmentLanguage } from "@/lib/auth";

export type TripParticipantLabels = {
  participants: string;
  participantSingular: string;
  participantsAndStaff: string;
  participantsCategory: string;
  audienceParticipants: string;
  audienceBoth: string;
  deleteParticipantRow: string;
  addParticipantRow: string;
  deleteParticipantTitle: string;
  personPrefix: string;
  loadError: string;
  excelChoiceHint: string;
  assignTablesHint: string;
  totalParticipants: string;
  participantInstructionsButton: string;
  staffParticipantGuidelines: string;
};

const byDepartmentLanguage = <T,>(department: string | null | undefined, female: T, male: T, mixed: T): T => {
  const language = getDepartmentLanguage(department);
  if (language === "female") return female;
  if (language === "male") return male;
  return mixed;
};

export function getTripParticipantLabels(department?: string | null): TripParticipantLabels {
  const participants = byDepartmentLanguage(department, "חניכות", "חניכים", "חניכים/ות");
  const participantsAndStaff = byDepartmentLanguage(
    department,
    "פרטי חניכות וצוות",
    "פרטי חניכים וצוות",
    "פרטי חניכים/ות וצוות",
  );

  return {
    participants,
    participantSingular: byDepartmentLanguage(department, "חניכה", "חניך", "חניך/ה"),
    participantsAndStaff,
    participantsCategory: byDepartmentLanguage(department, "חניכות וצוות", "חניכים וצוות", "חניכים/ות וצוות"),
    audienceParticipants: participants,
    audienceBoth: byDepartmentLanguage(department, "חניכות וצוות", "חניכים וצוות", "חניכים/ות וצוות"),
    deleteParticipantRow: byDepartmentLanguage(department, "מחק שורת חניכה", "מחק שורת חניך", "מחק שורת חניך/ה"),
    addParticipantRow: byDepartmentLanguage(department, "הוסף שורת חניכה", "הוסף שורת חניך", "הוסף שורת חניך/ה"),
    deleteParticipantTitle: byDepartmentLanguage(department, "מחיקת חניכה", "מחיקת חניך", "מחיקת חניך/ה"),
    personPrefix: byDepartmentLanguage(department, "חניכה: ", "חניך: ", "חניך/ה: "),
    loadError: byDepartmentLanguage(
      department,
      "טעינת פרטי חניכות וצוות נכשלה",
      "טעינת פרטי חניכים וצוות נכשלה",
      "טעינת פרטי חניכים/ות וצוות נכשלה",
    ),
    excelChoiceHint: byDepartmentLanguage(
      department,
      "בחר האם הקובץ שייך לחניכות או לצוות. הבחירה הזו תקבע לאיזו טבלה הנתונים ייכנסו.",
      "בחר האם הקובץ שייך לחניכים או לצוות. הבחירה הזו תקבע לאיזו טבלה הנתונים ייכנסו.",
      "בחר האם הקובץ שייך לחניכים/ות או לצוות. הבחירה הזו תקבע לאיזו טבלה הנתונים ייכנסו.",
    ),
    assignTablesHint: byDepartmentLanguage(
      department,
      "כל לשונית מוסיפה עמודה לטבלאות החניכות והצוות.",
      "כל לשונית מוסיפה עמודה לטבלאות החניכים והצוות.",
      "כל לשונית מוסיפה עמודה לטבלאות החניכים/ות והצוות.",
    ),
    totalParticipants: byDepartmentLanguage(department, 'סה"כ משתתפות', 'סה"כ משתתפים', 'סה"כ משתתפים/ות'),
    participantInstructionsButton: byDepartmentLanguage(department, "הנחיות לחניכות", "הנחיות לחניכים", "הנחיות לחניכים/ות"),
    staffParticipantGuidelines: byDepartmentLanguage(department, "הנחיות לצוות / חניכות", "הנחיות לצוות / חניכים", "הנחיות לצוות / חניכים/ות"),
  };
}

export function localizeParticipantCopy(text: string, department?: string | null): string {
  if (getDepartmentLanguage(department) !== "female") return text;
  return text.replaceAll("חניכים", "חניכות").replaceAll("משתתפים", "משתתפות");
}
