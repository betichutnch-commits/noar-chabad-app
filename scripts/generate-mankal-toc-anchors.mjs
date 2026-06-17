import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const prepTables = [
  ...JSON.parse(
    fs.readFileSync(path.join(root, "lib/regulation/chapter-b/preparation-tables.json"), "utf8"),
  ),
  ...JSON.parse(
    fs.readFileSync(path.join(root, "lib/regulation/chapter-c/preparation-tables.json"), "utf8"),
  ),
];

const res = await fetch("https://apps.education.gov.il/Mankal/horaa.aspx?siduri=585");
const html = await res.text();
const re = /<a[^>]*href="(#_Toc\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
const toc = [];
let m;
while ((m = re.exec(html)) !== null) {
  const anchor = m[1];
  const text = m[2]
    .replace(/<[^>]+>/g, " ")
    .replace(/&#xa0;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/[\u0590-\u05FF]/.test(text)) continue;
  toc.push({ anchor, text });
}

function norm(s) {
  return s
    .replace(/[^\u0590-\u05FFa-zA-Z0-9.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreToc(prepTitle, tocText) {
  const a = norm(prepTitle);
  const b = norm(tocText);
  if (b.includes(a) || a.includes(b.replace(/^\d+(\.\d+)?\s*/, ""))) return 100;
  const words = a.split(" ").filter((w) => w.length > 2);
  if (!words.length) return 0;
  const hits = words.filter((w) => b.includes(w)).length;
  return (hits / words.length) * 80;
}

const bySection = {};
const unmatched = [];

for (const table of prepTables) {
  const id = table.circularSectionId;
  if (!id) continue;
  let best = null;
  let bestScore = 0;
  for (const entry of toc) {
    const s = scoreToc(table.title, entry.text);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }
  if (best && bestScore >= 50) {
    bySection[id] = { anchor: best.anchor, title: table.title, tocText: best.text, score: bestScore };
  } else {
    unmatched.push({ id, title: table.title, bestScore, best: best?.text });
  }
}

const outPath = path.join(root, "lib/regulation/mankal-toc-anchors.json");
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      circularSiduri: 585,
      baseUrl: "https://apps.education.gov.il/Mankal/horaa.aspx?siduri=585",
      generatedAt: new Date().toISOString().slice(0, 10),
      sections: bySection,
    },
    null,
    2,
  ) + "\n",
);

console.log("mapped", Object.keys(bySection).length, "unmatched", unmatched.length);
for (const u of unmatched) console.log("?", u.id, u.title, u.bestScore, u.best);
console.log("wrote", outPath);
