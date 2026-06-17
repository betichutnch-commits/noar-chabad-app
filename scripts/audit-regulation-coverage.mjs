import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const categoriesTs = fs.readFileSync(path.join(root, "lib/constants.ts"), "utf8");
const licensed = [];
const re = /\{ label: '([^']+)', license: true \}/g;
let m;
while ((m = re.exec(categoriesTs))) licensed.push(m[1]);

const acts = JSON.parse(fs.readFileSync(path.join(root, "lib/regulation/activities.json"), "utf8"));
const matrix = JSON.parse(
  fs.readFileSync(path.join(root, "lib/regulation/chapter-a/business-license-matrix.json"), "utf8"),
);

const SUB = {
  "פארק מים": "water_park",
  "מתקנים מתנפחים": "inflatables",
  "קארטינג": "karting",
  "פארק חבלים": "ropes_park",
  "קיר טיפוס": "ropes_park",
  "פיינטבול": "paintball",
  "לייזר טאג": "paintball",
  "ג'יפים": "jeeps_atv",
  "ג׳יפים": "jeeps_atv",
  "טרקטורונים": "jeeps_atv",
  "בריכה": "pool",
  "קיאקים/רפטינג": "kayak_rafting",
  "לונה פארק": "amusement_park",
  "לינת שטח": "field_sleeping",
  "טיול ג׳יפים": "jeeps_atv",
};

const norm = (s) => String(s).replace(/['׳`]/g, "'").normalize("NFKC");
const allSubs = new Set();
for (const a of acts) {
  for (const s of a.planSubCategoryLabels || []) allSubs.add(norm(s));
}

const missingInActs = licensed.filter((l) => !allSubs.has(norm(l)));
const missingInSubMap = licensed.filter((l) => !SUB[l] && !SUB[norm(l)]);

const chapterB = JSON.parse(
  fs.readFileSync(path.join(root, "lib/regulation/chapter-b/preparation-tables.json"), "utf8"),
);
const chapterC = JSON.parse(
  fs.readFileSync(path.join(root, "lib/regulation/chapter-c/preparation-tables.json"), "utf8"),
);
const globalReq = JSON.parse(
  fs.readFileSync(path.join(root, "lib/regulation/requirements/global.json"), "utf8"),
);
const secondaryGlobal = globalReq.filter((r) =>
  (r.sources || []).every((s) => s.confidence !== "direct"),
).map((r) => r.id);

console.log(
  JSON.stringify(
    {
      licensedInSchedule: licensed.length,
      regulationActivities: acts.length,
      licenseMatrixRows: matrix.length,
      missingInActivitiesJson: missingInActs,
      missingInComplianceSubMap: missingInSubMap,
      globalRequirementsStillSecondary: secondaryGlobal,
      attractionLicensedHasNullSection: acts.find((a) => a.key === "attraction_licensed")?.circularSectionId === null,
      chapterBPreparationTables: chapterB.length,
      chapterCPreparationTables: chapterC.length,
      chapterBPreparationItems: chapterB.reduce((s, t) => s + t.items.length, 0),
      chapterCPreparationItems: chapterC.reduce((s, t) => s + t.items.length, 0),
    },
    null,
    2,
  ),
);
