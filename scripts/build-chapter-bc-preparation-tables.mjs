/**
 * Builds lib/regulation/chapter-b|c/preparation-tables.json from chozer-585-extracted.txt
 * Run: node scripts/extract-chozer-585.mjs && node scripts/build-chapter-bc-preparation-tables.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEXT_PATH = path.join(ROOT, "docs/regulation/source/chozer-585-extracted.txt");

/** @type {Array<{ chapter: 'b'|'c', sectionRef: string, circularSectionId: string, title: string, activityTypeId?: string, planSubCategoryLabels?: string[], regulationActivityKeys?: string[] }>} */
const MANIFEST = [
  { chapter: "b", sectionRef: "3.3", circularSectionId: "b.3.3", title: "מתחם חבלים אתגרי", activityTypeId: "ropes_park", planSubCategoryLabels: ["פארק חבלים", "קיר טיפוס"], regulationActivityKeys: ["attraction_height"] },
  { chapter: "b", sectionRef: "4.3", circularSectionId: "b.4.3", title: "ניווט" },
  { chapter: "b", sectionRef: "5.3", circularSectionId: "b.5.3", title: "ניווט תחרותי" },
  { chapter: "b", sectionRef: "6.3", circularSectionId: "b.6.3", title: "טיולים רכובים על אופניים", activityTypeId: "cycling", planSubCategoryLabels: ["אופניים"], regulationActivityKeys: ["attraction_licensed"] },
  { chapter: "b", sectionRef: "7.1", circularSectionId: "b.7.1", title: "רכיבה על אופניים לאוכלוסייה בעלת צרכים מיוחדים" },
  { chapter: "b", sectionRef: "8.3", circularSectionId: "b.8.3", title: "תחרויות רכיבה על אופני הרים" },
  { chapter: "b", sectionRef: "9.1", circularSectionId: "b.9.1", title: "רכיבה על בעלי חיים" },
  { chapter: "b", sectionRef: "10.1", circularSectionId: "b.10.1", title: "רכיבה טיפולית על בעלי חיים" },
  { chapter: "b", sectionRef: "11.1", circularSectionId: "b.11.1", title: "סיורי ג'יפים", activityTypeId: "jeeps_atv", planSubCategoryLabels: ["טיול ג׳יפים", "ג׳יפים", "טרקטורונים"], regulationActivityKeys: ["hiking_jeeps", "attraction_licensed"] },
  { chapter: "b", sectionRef: "12.1", circularSectionId: "b.12.1", title: "טיסות בשמי הארץ" },
  { chapter: "b", sectionRef: "13.1", circularSectionId: "b.13.1", title: "החלקה על קרח" },
  { chapter: "b", sectionRef: "14.1", circularSectionId: "b.14.1", title: "נהיגה במכוניות קרטינג במסלול סגור", activityTypeId: "karting", planSubCategoryLabels: ["קארטינג"], regulationActivityKeys: ["attraction_licensed"] },
  { chapter: "b", sectionRef: "15.2", circularSectionId: "b.15.2", title: "קשתות (קליעה בחץ וקשת)" },
  { chapter: "b", sectionRef: "16.1", circularSectionId: "b.16.1", title: "נסיעה ברכבת שעשועים", activityTypeId: "amusement_park", planSubCategoryLabels: ["לונה פארק"], regulationActivityKeys: ["attraction_licensed"] },
  { chapter: "b", sectionRef: "18.1", circularSectionId: "b.18.1", title: "ספורט שימושי" },
  { chapter: "b", sectionRef: "19.1", circularSectionId: "b.19.1", title: "הסעת תלמידים בעגלה רתומה לטרקטור" },
  { chapter: "b", sectionRef: "20.1", circularSectionId: "b.20.1", title: "משחק בכדורי צבע (פיינטבול)", activityTypeId: "paintball", planSubCategoryLabels: ["פיינטבול"], regulationActivityKeys: ["attraction_licensed"] },
  { chapter: "b", sectionRef: "21.1", circularSectionId: "b.21.1", title: "משחק שטח ברובי אינפרא אדום (לייזר טאג)", planSubCategoryLabels: ["לייזר טאג"], regulationActivityKeys: ["attraction_licensed"] },
  { chapter: "b", sectionRef: "22.3", circularSectionId: "b.22.3", title: "מסעות חינוכיים אתגריים" },
  { chapter: "c", sectionRef: "3.1", circularSectionId: "g.3.1", title: "רחצה בים" },
  { chapter: "c", sectionRef: "4.1", circularSectionId: "g.4.1", title: "רחצה בברכה", activityTypeId: "pool", planSubCategoryLabels: ["בריכה"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "5.1", circularSectionId: "g.5.1", title: "רחצה בפארק מים", activityTypeId: "water_park", planSubCategoryLabels: ["פארק מים"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "6.2", circularSectionId: "g.6.2", title: "שיעורים ופעילויות של שחייה", activityTypeId: "pool", planSubCategoryLabels: ["בריכה"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "7.2", circularSectionId: "g.7.2", title: "חציית גבי מים עמוקים" },
  { chapter: "c", sectionRef: "8.1", circularSectionId: "g.8.1", title: "שיט אבובים" },
  { chapter: "c", sectionRef: "9.1", circularSectionId: "g.9.1", title: "שיט קייאקים", activityTypeId: "kayak_rafting", planSubCategoryLabels: ["קיאקים/רפטינג"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "10.2", circularSectionId: "g.10.2", title: "שיט בסירות חצי קשיחות" },
  { chapter: "c", sectionRef: "11.1", circularSectionId: "g.11.1", title: "שיט בסירות נהר" },
  { chapter: "c", sectionRef: "12.1", circularSectionId: "g.12.1", title: "שיט על רפסודות", planSubCategoryLabels: ["שייט טורנדו"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "13.1", circularSectionId: "g.13.1", title: "שיט על מיני-רפסודות" },
  { chapter: "c", sectionRef: "14.1", circularSectionId: "g.14.1", title: "שיט ספינות", activityTypeId: "sailing", planSubCategoryLabels: ["שייט"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "15.1", circularSectionId: "g.15.1", title: "שיט בסירות משוטים או בסירות פדלים" },
  { chapter: "c", sectionRef: "16.1", circularSectionId: "g.16.1", title: "גלישה בגלשני מפרש", activityTypeId: "surf_sup", planSubCategoryLabels: ["גלישה/סאפ"], regulationActivityKeys: ["attraction_water"] },
  { chapter: "c", sectionRef: "18.1", circularSectionId: "g.18.1", title: "סקי מים בכבלים" },
  { chapter: "c", sectionRef: "19.1", circularSectionId: "g.19.1", title: "סקי מים באגמים ובימים" },
  { chapter: "c", sectionRef: "20.1", circularSectionId: "g.20.1", title: "קמ\"ס (קנה, מסכה, סנפירים)" },
  { chapter: "c", sectionRef: "21.1", circularSectionId: "g.21.1", title: "שיט באבוב רחיפה" },
  { chapter: "c", sectionRef: "22.1", circularSectionId: "g.22.1", title: "שיט עם בננה כפולה" },
  { chapter: "c", sectionRef: "23.1", circularSectionId: "g.23.1", title: "משחקי העפלה" },
];

const FOOTER_RE = /11:01 ,19\.5\.2026|https:\/\/apps\.education\.gov\.il\/Mankal\/horaa\.aspx\?siduri=585/g;
const TABLE_MARKER_RE = /תוכרעיה תלבט\s*(\d+\.\d+)/g;
const STOP_LINE_RE = /^הנחיות מפורטות|^תוכרעיה תלבט|^\d+\/\d+$/;

function buildMarkerIndex(text) {
  /** @type {Map<string, number[]>} */
  const map = new Map();
  for (const match of text.matchAll(TABLE_MARKER_RE)) {
    const ref = match[1];
    const idx = match.index ?? 0;
    if (!map.has(ref)) map.set(ref, []);
    map.get(ref).push(idx);
  }
  return map;
}

function chapterCSplitIndex(text) {
  const idx = text.indexOf("הנחיות ביצוע מפורטות–פרק ג': פעילויות מים");
  return idx >= 0 ? idx : text.indexOf("פרק ג': פעילויות מים");
}

function sliceForSection(text, sectionRef, markerIndex, chapter) {
  const positions = markerIndex.get(sectionRef) || [];
  if (!positions.length) return null;
  const split = chapterCSplitIndex(text);
  const filtered =
    chapter === "c"
      ? positions.filter((p) => p >= split)
      : positions.filter((p) => split < 0 || p < split);
  const start = filtered[0] ?? positions[0];
  let end = text.length;
  const allMarkers = [...text.matchAll(TABLE_MARKER_RE)].map((m) => ({
    ref: m[1],
    idx: m.index ?? 0,
  }));
  for (const m of allMarkers) {
    if (m.idx > start + 50) {
      end = m.idx;
      break;
    }
  }
  return text.slice(start, end);
}

function inferDocumentKey(topic) {
  if (/תיק פעילות|תיאור הפעילות/.test(topic)) return "risk-management";
  if (/אישור|תיאום|הלשכה|מוקד/.test(topic)) return "moked-teva-approval";
  if (/ביטוח|רישיון עסק|רשיון|כשירות/.test(topic)) return "business-license-insurance";
  if (/מלוו|מדריכ|צוות|מציל|חובש|מפקד/.test(topic)) return "staff-list";
  if (/תדרוך|מידע בכתב/.test(topic)) return "student-briefing";
  if (/עזרה ראשונה|הצלה|חירום|פינוי|אירועים חריגים/.test(topic)) return "emergency-procedure";
  if (/בטיחות בנסיעה|הסע|רכב|קסד/.test(topic)) return "bus-pre-departure-check";
  if (/הורים|הסכמה/.test(topic)) return "participant-list";
  return undefined;
}

function parseTableBlock(rawBlock, meta) {
  const lines = rawBlock
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !FOOTER_RE.test(l) && !STOP_LINE_RE.test(l));

  const introLines = [];
  const items = [];
  let inTopics = false;
  let current = null;

  const flush = () => {
    if (!current) return;
    items.push(current);
    current = null;
  };

  let pendingMainNumber = null;

  for (const line of lines) {
    if (/^מס'/.test(line) || line.includes("הנושאים לבדיקה") || /קידבל םיאשונה/.test(line)) {
      inTopics = true;
      continue;
    }
    if (!inTopics && /^\s*\.1\s*/.test(line)) {
      inTopics = true;
    }
    if (!inTopics) {
      if (line.includes("מיועדת") || line.includes("להתכונן")) introLines.push(line);
      continue;
    }

    const mainMatch = line.match(/^\s*\.(\d+)\s*(.*)$/);
    if (mainMatch) {
      const num = Number(mainMatch[1]);
      if (num > 20) continue;
      flush();
      const topic = mainMatch[2].trim();
      if (!topic) {
        pendingMainNumber = num;
        continue;
      }
      pendingMainNumber = null;
      current = {
        id: `${meta.circularSectionId.replace(/\./g, "_")}_${mainMatch[1]}`,
        number: num,
        topic,
        description: topic,
        subItems: [],
        documentKey: inferDocumentKey(topic),
        severity: "mandatory",
      };
      continue;
    }

    if (pendingMainNumber !== null && line.length > 2 && !/^[א-ת]\./.test(line)) {
      const num = pendingMainNumber;
      pendingMainNumber = null;
      current = {
        id: `${meta.circularSectionId.replace(/\./g, "_")}_${num}`,
        number: num,
        topic: line,
        description: line,
        subItems: [],
        documentKey: inferDocumentKey(line),
        severity: "mandatory",
      };
      continue;
    }

    const subMatch = line.match(/^([א-ת])\.\s*(.+)$/);
    if (subMatch && current) {
      current.subItems.push(subMatch[2].trim());
      continue;
    }

    if (current && !/^\s*\.(\d+)/.test(line) && line.length < 400) {
      if (/^[א-ת]\.$/.test(line)) continue;
      current.subItems.push(line);
    }
  }
  flush();

  if (items.length > 15) items.length = 15;

  for (const item of items) {
    if (item.subItems.length) {
      item.description = `${item.topic} — ${item.subItems.slice(0, 6).join("; ")}${item.subItems.length > 6 ? "…" : ""}`;
    }
  }

  return items;
}

function main() {
  if (!fs.existsSync(TEXT_PATH)) {
    console.error("Missing extracted text. Run: node scripts/extract-chozer-585.mjs");
    process.exit(1);
  }
  const text = fs.readFileSync(TEXT_PATH, "utf8");
  const markerIndex = buildMarkerIndex(text);

  const chapterB = [];
  const chapterC = [];

  for (const meta of MANIFEST) {
    const slice = sliceForSection(text, meta.sectionRef, markerIndex, meta.chapter);
    if (!slice) {
      console.warn(`WARN: no slice for ${meta.circularSectionId}`);
      continue;
    }
    const items = parseTableBlock(slice, meta);
    if (!items.length) {
      console.warn(`WARN: no items for ${meta.circularSectionId}`);
      continue;
    }
    const table = {
      circularSectionId: meta.circularSectionId,
      sectionRef: meta.sectionRef,
      chapter: meta.chapter,
      title: meta.title,
      activityTypeId: meta.activityTypeId,
      planSubCategoryLabels: meta.planSubCategoryLabels,
      regulationActivityKeys: meta.regulationActivityKeys,
      intro:
        "טבלה זו מיועדת לאחראי על הפעילות להתכונן בשיטתיות לפעילות החוץ-בית-ספרית המתוכננת, יחד עם ההנחיות הספציפיות המפורטות אחריה.",
      items,
      sources: [
        {
          kind: "circular",
          circularSiduri: 585,
          section: `פרק ${meta.chapter === "b" ? "ב'" : "ג'"} טבלת היערכות ${meta.sectionRef}`,
          confidence: "direct",
        },
      ],
    };
    if (meta.chapter === "b") chapterB.push(table);
    else chapterC.push(table);
  }

  const outB = path.join(ROOT, "lib/regulation/chapter-b/preparation-tables.json");
  const outC = path.join(ROOT, "lib/regulation/chapter-c/preparation-tables.json");
  fs.mkdirSync(path.dirname(outB), { recursive: true });
  fs.writeFileSync(outB, JSON.stringify(chapterB, null, 2) + "\n", "utf8");
  fs.writeFileSync(outC, JSON.stringify(chapterC, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        chapterB: { tables: chapterB.length, items: chapterB.reduce((s, t) => s + t.items.length, 0) },
        chapterC: { tables: chapterC.length, items: chapterC.reduce((s, t) => s + t.items.length, 0) },
      },
      null,
      2,
    ),
  );
}

main();
