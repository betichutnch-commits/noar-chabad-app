export type SustainabilityMotifTriggers = {
  categories?: string[];
  subCategories?: string[];
  contexts?: Array<"timeline" | "plan" | "purchase" | "hub" | "suppliers">;
};

export type SustainabilityMotif = {
  id: string;
  title: string;
  topic: string;
  body: string;
  triggers: SustainabilityMotifTriggers;
};

export const SUSTAINABILITY_MOTIFS: SustainabilityMotif[] = [
  {
    id: "reduce-consumption",
    title: "צמצום צריכה",
    topic: "לתכנן כמויות מדויקות, להימנע מעודפים ומצרכים מיותרים לאורך הטיול.",
    body:
      "לפני רכש והכנה — לבדוק כמה באמת נדרש לפי מספר המשתתפים ומשך הפעילות. להימנע מקניות כמותיות מיותרות, מאריזות עודפות וציוד שלא ישמש. עדיף להוסיף במידת הצורך מאשר להשליך עודפים.",
    triggers: {
      categories: ["food", "transport", "sleeping", "settlement", "other"],
      contexts: ["timeline", "plan", "purchase", "hub"],
    },
  },
  {
    id: "ecological-footprint",
    title: "טביעת רגל אקולוגית",
    topic: "לבחור התניידות ויעדים שמצמצמים פליטות, צריכת דלק ונסיעות מיותרות.",
    body:
      "להעדיף נסיעה מאורגנת, אוטובוס או רכבת על פני רכבים פרטיים מרובים. לשקול מרחק, מסלול ומשך הנסיעה, ולצמצם נסיעות הלוך-חזור שאינן הכרחיות. ככל שאפשר — לרכז פעילויות באזור אחד.",
    triggers: {
      categories: ["transport", "hiking", "attraction"],
    },
  },
  {
    id: "recycling-waste",
    title: "מיחזור ופסולת",
    topic: "הפרדת פסולת, חזרה עם אשפה מהשטח, ומינימום שימוש בחד-פעמי.",
    body:
      "להכין מראש פחים או שקיות להפרדת פסולת (לפחות פסולת רגילה ומיחזור). בטיולי שטח — לקחת את כל האשפה חזרה. להעדיך אריזות שניתן למחזר ולהימנע מכלים חד-פעמיים כשאפשר.",
    triggers: {
      categories: ["food", "sleeping", "hiking", "settlement", "attraction"],
      contexts: ["timeline", "plan", "purchase", "hub"],
    },
  },
  {
    id: "reuse",
    title: "שימוש חוזר",
    topic: "בקבוקי מים, כלים וציוד רב-פעמי במקום מוצרים חד-פעמיים.",
    body:
      "לצייד משתתפים בבקבוקי מים אישיים, כלים רב-פעמיים ושקיות רב-פעמיות. להימנע מצלחות, כוסות וסכו\"ם חד-פעמיים כשיש חלופה. בציוד רכש — להעדיף פריטים עמידים לשימוש חוזר.",
    triggers: {
      categories: ["food", "sleeping", "transport"],
      contexts: ["timeline", "plan", "purchase", "hub"],
    },
  },
  {
    id: "field-environment",
    title: "איכות הסביבה בשטח",
    topic: "שמירה על הטבע, חיות ואזורים רגישים — עקרון \"לא משאירים עקבות\".",
    body:
      "להישאר במסלולים מסומנים, לא לקטוף צמחים ולא להפריע לחיות. לא להשאיר פסולת או סימנים בשטח. באזורים רגישים — לפעול לפי הנחיות מוקד טבע ורשויות השטח.",
    triggers: {
      categories: ["hiking", "sleeping", "attraction"],
      subCategories: ["לינת שטח", "מסלול יום", "מסלול לילה", "פארק/גינה", "פעילות בשטח פתוח"],
    },
  },
  {
    id: "local-suppliers",
    title: "ספקים מקומיים",
    topic: "בראייה מקיימת — להעדיף ספקים מהאזור שבו מתקיים הטיול, ככל האפשר.",
    body:
      "רכש מספק מקומי מצמצם נסיעות משלוח והובלות, תומך בעסקים בקהילה באזור היעד ומפחית את טביעת הרגל של הטיול. בשלב התכנון — לבדוק אם ניתן לרכוש מהיישוב, מהסניף או מאזור סמוך למסלול, במקום להזמין מרחוק.",
    triggers: {
      contexts: ["suppliers"],
    },
  },
];
