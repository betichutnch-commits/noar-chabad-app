export const PLAN_TABLE_TOUR_STORAGE_KEY = "chabad-trips:plan-table-tour:v2";

export type PlanTableTourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type PlanTableTourTab = "schedule" | "participants" | "transport";

export type PlanTableTourPeopleSection = "participants" | "staff" | "assignments";

export type PlanTableTourSection = "schedule" | "participants" | "transport" | "quick-actions";

export type PlanTableTourStep = {
  id: string;
  target?: string;
  title: string;
  body: string;
  placement?: PlanTableTourPlacement;
  tab?: PlanTableTourTab;
  peopleSection?: PlanTableTourPeopleSection;
  section?: PlanTableTourSection;
};

export type PlanTableTourNavigate = {
  tab?: PlanTableTourTab;
  peopleSection?: PlanTableTourPeopleSection;
};

export const PLAN_TABLE_TOUR_SECTION_OPTIONS: Array<{
  id: PlanTableTourSection;
  title: string;
  description: string;
}> = [
  {
    id: "schedule",
    title: "תכנון הלו״ז",
    description: "טבלת האירועים, עמודות הבסיס והאייקונים, בטיחות, ציוד והדפסות.",
  },
  {
    id: "participants",
    title: "רשימות חניכים, צוות ושיבוץ",
    description: "ייבוא ועריכה, חניכים וצוות, ולוח השיבוצים.",
  },
  {
    id: "transport",
    title: "הסעות",
    description: "הגדרת אוטובוסים, נהגים, קיבולת ומעקב שיבוץ נוסעים.",
  },
  {
    id: "quick-actions",
    title: "שורת האייקונים",
    description: "מסמכי תיק, חירום, ציוד, רכש, סיכונים, קשר, תפקידים והדפסות.",
  },
];

const SECTION_INTRO: Record<PlanTableTourSection, PlanTableTourStep> = {
  schedule: {
    id: "intro-schedule",
    section: "schedule",
    placement: "center",
    title: "הדרכה: לו״ז מפורט",
    body: "נעבור על טבלת האירועים — שדות הבסיס, עמודות האייקונים, בטיחות, ציוד והפעולות.",
  },
  participants: {
    id: "intro-participants",
    section: "participants",
    tab: "participants",
    peopleSection: "participants",
    placement: "center",
    title: "הדרכה: חניכים, צוות ושיבוץ",
    body: "נעבור על רשימות החניכים והצוות, ייבוא נתונים, ולוח השיבוצים.",
  },
  transport: {
    id: "intro-transport",
    section: "transport",
    tab: "transport",
    placement: "center",
    title: "הדרכה: ניהול הסעות",
    body: "נעבור על הגדרת האוטובוסים, פרטי נהג ואחראית הסעה, ומעקב שיבוץ.",
  },
  "quick-actions": {
    id: "intro-quick-actions",
    section: "quick-actions",
    tab: "schedule",
    placement: "center",
    title: "הדרכה: שורת האייקונים",
    body: "נעבור על כל אייקון בשורת הקיצורים — מה כל אחד פותח ואיך הוא קשור לתכנון.",
  },
};

const SECTION_OUTRO: Record<PlanTableTourSection, PlanTableTourStep> = {
  schedule: {
    id: "outro-schedule",
    section: "schedule",
    placement: "center",
    title: "סיימנו את הלו״ז",
    body: "אפשר לחזור להדרכה בכל עת ולבחור מסלול אחר מלחצן «הדרכה».",
  },
  participants: {
    id: "outro-participants",
    section: "participants",
    placement: "center",
    title: "סיימנו את רשימות המשתתפים",
    body: "אפשר לחזור להדרכה בכל עת ולבחור מסלול אחר מלחצן «הדרכה».",
  },
  transport: {
    id: "outro-transport",
    section: "transport",
    placement: "center",
    title: "סיימנו את ההסעות",
    body: "אפשר לחזור להדרכה בכל עת ולבחור מסלול אחר מלחצן «הדרכה».",
  },
  "quick-actions": {
    id: "outro-quick-actions",
    section: "quick-actions",
    placement: "center",
    title: "סיימנו את שורת האייקונים",
    body: "אפשר לחזור להדרכה בכל עת ולבחור מסלול אחר מלחצן «הדרכה».",
  },
};

export function getTourStepsForSection(section: PlanTableTourSection): PlanTableTourStep[] {
  const body = PLAN_TABLE_TOUR_STEPS.filter((step) => step.section === section);
  return [SECTION_INTRO[section], ...body, SECTION_OUTRO[section]];
}

export function getInitialTabForTourSection(section: PlanTableTourSection): PlanTableTourTab {
  if (section === "participants") return "participants";
  if (section === "transport") return "transport";
  return "schedule";
}

export function getInitialPeopleSectionForTourSection(
  section: PlanTableTourSection,
): PlanTableTourPeopleSection | null {
  if (section === "participants") return "participants";
  return null;
}

export const PLAN_TABLE_TOUR_STEPS: PlanTableTourStep[] = [
  {
    id: "welcome",
    placement: "center",
    title: "ברוכים הבאים לתכנון הטיול",
    body: "מסך זה הוא לב העבודה: לו״ז מפורט, בטיחות, ציוד, הדפסות ומסמכים. נעבור יחד על השדות והאייקונים — אפשר לדלג או לחזור להדרכה בכל עת.",
  },
  {
    id: "tabs",
    target: "planner-tabs",
    placement: "bottom",
    title: "לשוניות התכנון",
    body: "לו״ז מפורט — טבלת האירועים. פרטי חניכים וצוות — רשימות משתתפים. ניהול הסעות — שיבוץ לאוטובוסים.",
  },
  {
    id: "quick-actions",
    target: "quick-actions",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "שורת האייקונים",
    body: "קיצורי דרך לכל מערכות התכנון — בלי לצאת מהמסך. נעבור כעת על כל אייקון ומה הוא פותח.",
  },
  {
    id: "quick-action-documents",
    target: "quick-action-documents",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "מסמכי תיק הטיול",
    body: "רשימת כל המסמכים הנדרשים לטיול. חשוב: המסמכים נוצרים אוטומטית מהנתונים שמילאתם בלשוניות העיקריות — לו״ז מפורט, חניכים וצוות, וניהול הסעות. כאן עוקבים אחרי סטטוס, אחראי והורדת PDF.",
  },
  {
    id: "quick-action-emergency",
    target: "quick-action-emergency",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "הנחיות חירום",
    body: "מסמכי חירום, תרחישי תגובה ופרטי קשר לשעת חירום — מסונכרנים מהתכנון ומעמודות הבטיחות בלו״ז.",
  },
  {
    id: "quick-action-equipment",
    target: "quick-action-equipment",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "רשימת ציוד",
    body: "תצוגה מרוכזת של כל הציוד שהוזן בעמודת «ציוד» בלו״ז. מעדכנים סטטוס הכנה, אחראי ומעקב לפני היציאה.",
  },
  {
    id: "quick-action-purchases",
    target: "quick-action-purchases",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "רשימת רכש",
    body: "פריטים לרכישה שנקלטו מהלו״ז — כמות, ספק, מחיר, סטטוס וחשבוניות במקום אחד.",
  },
  {
    id: "quick-action-risks",
    target: "quick-action-risks",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "ניהול סיכונים",
    body: "סיכונים והפחתות מכל שורות הלו״ז — לפי דרישות מחלקת הבטיחות, עם מעקב מרוכז.",
  },
  {
    id: "quick-action-refunds",
    target: "quick-action-refunds",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "החזר כספים",
    body: "מעקב דרישות החזר, חשבוניות וסטטוס טיפול — מקושר לרכש ולציוד.",
  },
  {
    id: "quick-action-contacts",
    target: "quick-action-contacts",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "רשימת קשר",
    body: "אנשי קשר חשובים לטיול: צוות, חירום, ספקים וגורמים חיצוניים — לעריכה ולייצוא למסמכים.",
  },
  {
    id: "quick-action-roles",
    target: "quick-action-roles",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "הגדרות תפקיד",
    body: "מי ממלא תפקידים נדרשים בטיול, שיוך אחראים ומעקב שכל התפקידים מאוישים לפני האישור.",
  },
  {
    id: "quick-action-guidelines",
    target: "quick-action-guidelines",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "הנחיות וחוזרי מנכ״ל",
    body: "מסמכי הנחיה, רגולציה וחוזרי מנכ״ל הרלוונטיים לתיאום התכנון והבטיחות.",
  },
  {
    id: "quick-action-prints",
    target: "quick-action-prints",
    section: "quick-actions",
    tab: "schedule",
    placement: "bottom",
    title: "הדפסות",
    body: "כל פריטי ההדפסה מהלו״ז: כמות, גודל, בית דפוס וסטטוס — בתצוגה מרוכזת לניהול ההדפסות.",
  },
  {
    id: "table",
    target: "schedule-table",
    section: "schedule",
    tab: "schedule",
    placement: "top",
    title: "טבלת הלו״ז",
    body: "כל שורה = אירוע או נקודה בטיול. אפשר לגרור את עמודת התאריך לשינוי סדר, ולגלול הצידה כשיש הרבה עמודות פתוחות.",
  },
  {
    id: "date",
    target: "col-date",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "תאריך",
    body: "יום בטיול (לועזי + עברי). גרור מהאייקון ⋮⋮ לשינוי מיקום השורה בלו״ז. לחצני + בין שורות מוסיפים אירוע.",
  },
  {
    id: "time",
    target: "col-time",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "שעה",
    body: "שעת התחלה או מועד האירוע בפורמט HH:MM. השדה נשמר אוטומטית כשיוצאים ממנו.",
  },
  {
    id: "location",
    target: "col-location",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "מיקום מפורט",
    body: "כתובת, אתר או תיאור המקום. אם המערכת מזהה אזור רגיש — תופיע תווית «אזור רגיש» לתיאום עם מחלקת הבטיחות.",
  },
  {
    id: "event",
    target: "col-event",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "התרחשות",
    body: "כותרת קצרה של מה קורה בשורה (טיול, ארוחה, לינה, פעילות). זה הבסיס לכל העמודות המורחבות.",
  },
  {
    id: "icon-columns",
    target: "col-safety",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "עמודות האייקונים",
    body: "בכל שורה — כפתורי אייקון צבעוניים. לחיצה פותחת עמודה מורחבת (פירוט, בטיחות, ציוד…). סימון ✓ = «סיימתי» לעמודה. בכותרת — פתיחה/סגירה לכל השורות.",
  },
  {
    id: "details",
    target: "col-details",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "פירוט התרחשות",
    body: "פרטים מלאים, הוראות לצוות ולמשתתפים, משימות, וקישור לרכש/ציוד. הנתונים נכנסים גם למסמכי תיק הטיול.",
  },
  {
    id: "safety",
    target: "col-safety",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "בטיחות",
    body: "סיכונים, הפחתות, רמות סיכון ואחראים — לפי דרישות מחלקת הבטיחות. מסונכרן לטבלת ניהול סיכונים ולמסמכים.",
  },
  {
    id: "equipment",
    target: "col-equipment",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "ציוד",
    body: "רשימת ציוד לאירוע: כמות, מקור, סטטוס הכנה. פריטים שמסומנים כרכש יופיעו גם ברשימת הרכש.",
  },
  {
    id: "prints",
    target: "col-prints",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "הדפסות",
    body: "קבצים להדפסה, כמות, גודל, בית דפוס וסטטוס. שם בית הדפוס נמשך לרשימת בתי הדפוס המרוכזת.",
  },
  {
    id: "notes",
    target: "col-notes",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "הערות",
    body: "הערות פנימיות לשורה — לא בהכרח נכנסות למסמכים, לשימוש הצוות בתכנון.",
  },
  {
    id: "responsibilities",
    target: "col-responsibilities",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "באחריות",
    body: "מי אחראי על השורה ומשימות לפי שלבים (היערכות / במהלך / אחרי). מוצג גם בלוח אחריות מרוכז.",
  },
  {
    id: "actions",
    target: "col-actions",
    section: "schedule",
    tab: "schedule",
    placement: "bottom",
    title: "פעולות",
    body: "הוספת שורה לפני/אחרי, שכפול או מחיקה. שורות חדשות נשמרות אוטומטית בעת מילוי.",
  },
  {
    id: "participants-tab",
    target: "planner-tab-participants",
    section: "participants",
    tab: "participants",
    placement: "bottom",
    title: "פרטי חניכים וצוות",
    body: "כאן מנהלים את רשימות החניכים והצוות: ייבוא מאקסל או מאיירטייבל, עריכה ידנית, ושיבוץ לקבוצות.",
  },
  {
    id: "participants-header",
    target: "participants-header",
    section: "participants",
    tab: "participants",
    placement: "bottom",
    title: "כותרת ופעולות ייבוא",
    body: "הורדת תבנית אקסל, העלאת קובץ, ייבוא מאיירטייבל ורענון — הכל מהכפתורים בראש הלשונית.",
  },
  {
    id: "participants-section-tabs",
    target: "participants-section-tabs",
    section: "participants",
    tab: "participants",
    peopleSection: "participants",
    placement: "bottom",
    title: "חניכים, צוות ושיבוצים",
    body: "«חניכים» — רשימת המשתתפים. «צוות» — מלווים ותפקידים נדרשים. «שיבוצים» — חדרים, קבוצות, אוטובוסים ועוד.",
  },
  {
    id: "participants-summary",
    target: "participants-summary",
    section: "participants",
    tab: "participants",
    peopleSection: "participants",
    placement: "bottom",
    title: "כרטיסי סיכום",
    body: "מספרים מהירים: כמה רשומים, כמה חסרי תשלום / אישור הורים, וכמה עם רגישויות רפואיות.",
  },
  {
    id: "participants-search",
    target: "participants-search",
    section: "participants",
    tab: "participants",
    peopleSection: "participants",
    placement: "bottom",
    title: "חיפוש וסינון",
    body: "חפשו לפי שם, טלפון או סטטוס. הסינון מציג רק חסרי תשלום, חסרי אישור, או בעלי רגישות רפואית.",
  },
  {
    id: "participants-table",
    target: "participants-table",
    section: "participants",
    tab: "participants",
    peopleSection: "participants",
    placement: "top",
    title: "טבלת חניכים",
    body: "כל שורה = חניך. שדות חובה נשמרים אוטומטית. אפשר להוסיף שורות, למחוק, ולראות שיבוצים לקבוצות.",
  },
  {
    id: "participants-staff",
    target: "participants-staff-panel",
    section: "participants",
    tab: "participants",
    peopleSection: "staff",
    placement: "top",
    title: "טבלת צוות",
    body: "מילוי פרטי מלווים, שיוך תפקידים נדרשים, אישור משטרה ומיזוג כמה תפקידים לאדם אחד.",
  },
  {
    id: "participants-assignments",
    target: "participants-assignments",
    section: "participants",
    tab: "participants",
    peopleSection: "assignments",
    placement: "top",
    title: "לוח שיבוצים",
    body: "יצירת לשוניות שיבוץ (חדרים, קבוצות, אוטובוסים), הוספת פריטים ושיוך חניכים/צוות — כולל סיכום מי עדיין לא שובץ.",
  },
  {
    id: "transport-tab",
    target: "planner-tab-transport",
    section: "transport",
    tab: "transport",
    placement: "bottom",
    title: "ניהול הסעות",
    body: "לשונית נפרדת לניהול אוטובוסים: פרטי נהג, חברה, קיבולת, אחראית הסעה ומעקב שיבוץ נוסעים.",
  },
  {
    id: "transport-header",
    target: "transport-header",
    section: "transport",
    tab: "transport",
    placement: "bottom",
    title: "מסך ההסעות",
    body: "כאן מגדירים את כל האוטובוסים בטיול. הנתונים נכנסים גם למסמכי תיק הטיול ומשמשים לשיבוץ בלשונית השיבוצים.",
  },
  {
    id: "transport-buses",
    target: "transport-buses-table",
    section: "transport",
    tab: "transport",
    placement: "top",
    title: "טבלת אוטובוסים",
    body: "מספר אוטובוס, נהג, טלפונים, חברה, קיבולת ואחראית הסעה. שורות נשמרות אוטומטית. עמודת «שיבוץ» מציגה כמה נוסעים שובצו.",
  },
  {
    id: "done",
    placement: "center",
    title: "סיימנו!",
    body: "עברתם על שלוש לשוניות התכנון: לו״ז, משתתפים והסעות. לחצן «הדרכה» בראש המסך מאפשר לבחור מסלול הדרכה בכל עת.",
  },
];

export function hasCompletedPlanTableTour() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PLAN_TABLE_TOUR_STORAGE_KEY) === "1";
}

export function markPlanTableTourCompleted() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_TABLE_TOUR_STORAGE_KEY, "1");
}

export function resetPlanTableTour() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_TABLE_TOUR_STORAGE_KEY);
}
