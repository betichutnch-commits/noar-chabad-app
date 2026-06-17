"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import type React from "react";
import MasterFormTemplate, { type MasterFormColumn } from "@/components/MasterFormTemplate";
import { Button } from "@/components/ui/Button";

type EmergencyDocumentVariant = "emergency-incident-report" | "medical-referral" | "casualties-summary" | "emergency-procedure";
type DocumentRow = Record<string, string>;

const documentTitles: Record<EmergencyDocumentVariant, string> = {
  "emergency-incident-report": "דוח אירוע חירום",
  "medical-referral": "הפניה למיון / טיפול רפואי",
  "casualties-summary": "טבלת ריכוז נפגעים",
  "emergency-procedure": "התנהלות במצבי חירום",
};

const documentTitleSuffixes: Partial<Record<EmergencyDocumentVariant, string>> = {
  "medical-referral": "נספח א״י",
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

function Field({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <div className={`flex min-h-10 items-end gap-2 border-b border-brand-dark/70 pb-1 ${wide ? "md:col-span-2" : ""}`}>
      <span className="shrink-0 text-xs font-black text-brand-dark">{label}:</span>
      <span className="h-5 flex-1" />
    </div>
  );
}

function TextBox({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div>
      <div className="mb-2 text-xs font-black text-brand-dark">{label}</div>
      <div className="rounded-2xl border border-brand-dark/40 bg-white" style={{ minHeight: `${rows * 1.75}rem` }} />
    </div>
  );
}

function GuidanceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-2xl border border-brand-dark/20 bg-white p-4 shadow-sm print:shadow-none">
      <h2 className="mb-3 rounded-xl bg-gray-200 px-3 py-2 text-center text-sm font-black text-brand-dark print:bg-gray-200">{title}</h2>
      <div className="space-y-3 text-base font-normal leading-9 text-brand-dark print:text-sm print:leading-8">{children}</div>
    </section>
  );
}

function GuidanceList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pr-5 marker:font-black marker:text-brand-cyan`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ListTag>
  );
}

export function EmergencyContactsBlock() {
  const contacts = [
    { label: "משטרה", phone: "100" },
    { label: "מד״א", phone: "101" },
    { label: "כיבוי אש", phone: "102" },
  ];

  return (
    <section className="break-inside-avoid rounded-2xl border border-red-100 bg-red-50 p-4">
      <h2 className="mb-3 text-center text-sm font-black text-red-800">טלפוני חירום מיידיים</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {contacts.map((contact) => (
          <div key={contact.phone} className="rounded-xl border border-red-100 bg-white p-3 text-center">
            <div className="text-xs font-black text-red-700">{contact.label}</div>
            <div className="mt-1 text-2xl font-black text-brand-dark">{contact.phone}</div>
          </div>
        ))}
      </div>
      <a
        href="https://www.oref.org.il/heb"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm font-black text-brand-cyan print:hidden"
      >
        <ExternalLink size={15} />
        הנחיות פיקוד העורף המתעדכנות באתר הרשמי
      </a>
      <div className="mt-2 hidden text-center text-xs font-bold text-brand-dark print:block">הנחיות פיקוד העורף: www.oref.org.il/heb</div>
    </section>
  );
}

const baseColumn = (key: string, header: string, widthClassName: string): MasterFormColumn<DocumentRow> => ({
  key,
  header,
  widthClassName,
  headerClassName: compactHeader,
  cellClassName: compactCell,
  renderView: (value) => <span className="font-bold">{String(value || "")}</span>,
});

const casualtiesColumns: Array<MasterFormColumn<DocumentRow>> = [
  baseColumn("index", "מס׳", "w-[5%]"),
  baseColumn("name", "שם הנפגע/ת", "w-[15%]"),
  baseColumn("id", "ת.ז.", "w-[11%]"),
  baseColumn("injury", "מצב / סוג פגיעה", "w-[16%]"),
  baseColumn("treatment", "טיפול שניתן", "w-[16%]"),
  baseColumn("evacuation", "פינוי / יעד", "w-[13%]"),
  baseColumn("parents", "קשר עם הורים", "w-[12%]"),
  baseColumn("notes", "הערות", "w-[12%]"),
];

const blankCasualtyRows = Array.from({ length: 8 }, (_, index) => ({
  index: String(index + 1),
  name: "",
  id: "",
  injury: "",
  treatment: "",
  evacuation: "",
  parents: "",
  notes: "",
}));

function EmergencyIncidentContent() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="שם הטיול" />
        <Field label="תאריך האירוע" />
        <Field label="שעת האירוע" />
        <Field label="מקום האירוע" />
        <Field label="שם מדווח/ת" />
        <Field label="תפקיד המדווח/ת" />
      </div>
      <TextBox label="תיאור האירוע" rows={4} />
      <TextBox label="מעורבים ונפגעים, אם יש" rows={3} />
      <TextBox label="פעולות מיידיות שבוצעו בשטח" rows={3} />
      <TextBox label="דיווחים שבוצעו ולמי דווח" rows={3} />
      <TextBox label="החלטות המשך והנחיות" rows={3} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="חתימת אחראי/ת הטיול" />
        <Field label="שם מלא" />
        <Field label="תאריך ושעה" />
      </div>
    </div>
  );
}

function MedicalReferralContent() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="שם התלמיד/ה" />
        <Field label="ת.ז." />
        <Field label="סניף / קבוצה" />
        <Field label="גיל / כיתה" />
        <Field label="שם הטיול" />
        <Field label="מקום ושעת הפגיעה" />
        <Field label="שם מלווה לטיפול רפואי" />
        <Field label="טלפון מלווה" />
      </div>
      <TextBox label="נסיבות הפגיעה / התלונה הרפואית" rows={4} />
      <TextBox label="טיפול ראשוני שניתן בשטח" rows={3} />
      <TextBox label="רגישויות / מחלות רקע ידועות / תרופות" rows={3} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="שם ההורה שעודכן" />
        <Field label="שעת עדכון הורים" />
        <Field label="יעד הפינוי / מוסד רפואי" />
        <Field label="אמצעי פינוי" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="שם אחראי/ת הטיול" />
        <Field label="חתימה" />
        <Field label="תאריך" />
      </div>
    </div>
  );
}

export function EmergencyProcedureContent({ showContacts = true }: { showContacts?: boolean }) {
  return (
    <div className="space-y-5">
      {showContacts ? <EmergencyContactsBlock /> : null}

      <GuidanceCard title="היערכות בשגרה למצבי חירום">
        <p>
          מצבי חירום ארציים או אזוריים הם מצבים מסוכנים שמתאפיינים בבהלה ולחץ של זמן. הבעיה המרכזית היא ששעות חירום מגיעות בהפתעה,
          וזמן התגובה צריך להיות קצר מאוד - לפעמים דקות ולפעמים שניות.
        </p>
        <p>
          לכן החוכמה היא להיערך נכון בזמן השגרה. בכל מקום חדש שמגיעים אליו עם החניכים, ובכל פעילות יוצאת דופן, יש לבצע סקירה מהירה:
          מה עושים בשעת חירום, רעידת אדמה, שריפה או ירי טילים.
        </p>
      </GuidanceCard>

      <GuidanceCard title="רעידת אדמה">
        <p className="text-center text-base font-black text-brand-cyan">הכלל בעת רעידת אדמה: שטח פתוח הכי בטוח.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h3 className="mb-2 font-black">בתוך מבנה</h3>
            <p>המדריך יקבץ סביבו את חניכיו וייצא בהליכה מהירה וזהירה דרך נתיב המילוט אל השטח הפתוח.</p>
            <p>יש להתרחק מבניינים, קירות תומכים, עצים, כבלי חשמל וכל גורם מסוכן אחר.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h3 className="mb-2 font-black">מרחב מוגן</h3>
            <p>קבוצה השוהה בממ״ד או ממ״ק תקני בקומה שלישית ומעלה תישאר במרחב המוגן עד לסיום הרעידה הראשונית.</p>
            <p>לאחר הפוגה ברעידה יש לצאת לשטח הפתוח בזהירות.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h3 className="mb-2 font-black">מחוץ למבנה</h3>
            <p>יש להישאר בשטח הפתוח ולהתרחק מבניינים, קירות תומכים, עצים, כבלי חשמל וכל גורם מסוכן אחר.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h3 className="mb-2 font-black">בנסיעה ברכב / באוטובוס</h3>
            <p>יש לעצור את הרכב ולהישאר בתוכו עד שהרעידה תיפסק.</p>
            <p>אם נמצאים ליד בניינים, גשרים, כבלי חשמל, עצים או גורם מסוכן אחר, יש להמשיך בנסיעה עד לשטח פתוח.</p>
          </div>
        </div>
      </GuidanceCard>

      <GuidanceCard title="ירי טילים">
        <GuidanceList
          items={[
            "סניף הפועל במבנה שאין בו מקלט או מרחב מוגן, או שלא ניתן להגיע ממנו למרחב מוגן ציבורי בזמן העומד לרשותו לפי מפת ההתגוננות של פיקוד העורף, לא יפעל בעת חירום.",
            "ייתכן שתינתן הנחיה על ידי משרד החינוך או קב״ט הרשות המקומית לא לקיים פעילות גם בסניף שיש בו מקלט או מרחב מוגן.",
            "יש למנות אחראי לכל מקלט או מרחב מוגן.",
            "יש להכין תוכנית להפעלת התלמידים בתוך המקלט או המרחב המוגן.",
            "יש להכין רשימות שמיות של כל התלמידים, שתימצאנה באופן קבוע בידי כל מדריך קבוצה.",
          ]}
        />
        <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
          <h3 className="mb-2 text-center font-black text-brand-cyan">סדר הפעולות בעת ירי טילים</h3>
          <GuidanceList
            ordered
            items={[
              "יש להיכנס באופן מסודר למרחב הכי מוגן שיש שנקבע מראש, לפי זמן ההתראה באזור ועל פי מפת ההתגוננות של פיקוד העורף.",
              "סדר העדיפויות: מקלט, מרחב מוגן תקני, חדר מדרגות, שכיבה על הרצפה בצמוד לקיר פנימי.",
              "יש לסגור דלתות וחלונות.",
              "יש להפעיל את התלמידים בתוך המקלט או המרחב המוגן.",
              "יש להאזין להנחיות מערכת הביטחון באמצעי התקשורת.",
            ]}
          />
        </div>
      </GuidanceCard>

      <GuidanceCard title="ציוד מומלץ לשהייה במרחב המוגן">
        <GuidanceList
          items={[
            "אמצעי תקשורת שיעזרו להישאר מעודכנים, כגון מחשב או רדיו על סוללות.",
            "טלפון סלולרי, כולל סוללת גיבוי או מטען נייד.",
            "3 ליטרים מים בבקבוקים סגורים לכל אדם ליממה אחת. מומלץ להכין מים לשלוש יממות.",
            "מזון באריזות סגורות, כגון שימורים וחטיפים.",
            "תאורת חירום, פנס וסוללות.",
            "ערכת עזרה ראשונה.",
            "מטף לכיבוי אש.",
            "רשימת טלפונים של ארגוני החירום ושל הורי הילדים.",
            "דברים שינעימו את הזמן ויקלו את השהייה, כגון משחקים, עיתונים וספרים.",
          ]}
        />
      </GuidanceCard>

      <GuidanceCard title="מצבי חירום בסניף ונהלי דיווח">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
            <h3 className="mb-2 font-black text-red-700">שריפה</h3>
            <p>דיווח למנהל המחלקה, לרכזת הבטיחות או למנהלת הארגון.</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
            <h3 className="mb-2 font-black text-amber-700">חפץ חשוד</h3>
            <p>דיווח למנהל המחלקה, לרכזת הבטיחות או למנהלת הארגון.</p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-center">
            <h3 className="mb-2 font-black text-brand-cyan">פציעה</h3>
            <p>החייאה תתבצע רק על ידי אדם המוכשר לכך.</p>
            <p>יש לדווח למנהל או לרכזת הבטיחות, למלא דו״ח פציעה ולעדכן הורים.</p>
          </div>
        </div>
      </GuidanceCard>
    </div>
  );
}

function EmergencyMedicalDocument({ variant, actions }: { variant: EmergencyDocumentVariant; actions?: React.ReactNode }) {
  const isCasualties = variant === "casualties-summary";
  return (
    <MasterFormTemplate<DocumentRow>
      title={
        <>
          {documentTitles[variant]} {documentTitleSuffixes[variant] ? <span className="text-xl font-normal text-text-muted">({documentTitleSuffixes[variant]})</span> : null}
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
      showTable={isCasualties}
      tableColumns={isCasualties ? casualtiesColumns : []}
      tableData={isCasualties ? blankCasualtyRows : []}
      actions={actions}
      afterTable={
        isCasualties ? (
          <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-xs font-bold leading-6 text-brand-dark print:hidden">
            יש לעדכן את הטבלה בזמן אמת ולשמור קשר רציף עם אחראי הטיול, גורמי רפואה והורי הנפגעים.
          </div>
        ) : undefined
      }
      className="font-sans [&_.master-form-page]:p-[10mm] [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&_th]:py-1.5"
    >
      {variant === "emergency-incident-report" ? <EmergencyIncidentContent /> : null}
      {variant === "medical-referral" ? <MedicalReferralContent /> : null}
      {variant === "emergency-procedure" ? <EmergencyProcedureContent /> : null}
    </MasterFormTemplate>
  );
}

export function EmergencyMedicalDocumentPage({ variant }: { variant: EmergencyDocumentVariant }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tripId = params.id;
  return (
    <EmergencyMedicalDocument
      variant={variant}
      actions={
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
      }
    />
  );
}

export default EmergencyMedicalDocument;
