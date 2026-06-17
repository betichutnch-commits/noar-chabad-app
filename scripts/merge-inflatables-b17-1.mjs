/**
 * Inserts b.17.1 inflatables table and cleans corrupted tail of b.16.1
 * Run: node scripts/merge-inflatables-b17-1.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const tablesPath = path.join(ROOT, "lib/regulation/chapter-b/preparation-tables.json");
const inflatablesPath = path.join(ROOT, "lib/regulation/chapter-b/inflatables-b17-1.json");
const schedulePath = path.join(ROOT, "lib/regulation/licensed-schedule-map.json");

const tables = JSON.parse(fs.readFileSync(tablesPath, "utf8"));
const inflatables = JSON.parse(fs.readFileSync(inflatablesPath, "utf8"));

const b16 = tables.find((t) => t.circularSectionId === "b.16.1");
if (b16) {
  const idx10 = b16.items.findIndex((i) => i.id === "b_16_1_10");
  if (idx10 >= 0) {
    b16.items = b16.items.slice(0, idx10 + 1);
    b16.items[idx10] = {
      id: "b_16_1_10",
      number: 10,
      topic: "אירועים חריגים",
      description:
        "לעצור את הפעילות ולוודא שאין סיכון נוסף; לפנות לחדר מצב ולהזמין חילוץ; לדווח למנהל המוסד.",
      subItems: [
        "יש לעצור את הפעילות ולוודא שאנשים נוספים אינם עלולים להיפגע",
        "לפנות לחדר מצב ולבקש חילוץ",
        "דיווח מיידי למנהל מוסד החינוך על כל אירוע בטיחותי או רפואי",
      ],
      documentKey: "emergency-procedure",
      severity: "mandatory",
    };
  }
}

const existingIdx = tables.findIndex((t) => t.circularSectionId === "b.17.1");
if (existingIdx >= 0) {
  tables[existingIdx] = inflatables;
} else {
  const after16 = tables.findIndex((t) => t.circularSectionId === "b.16.1");
  tables.splice(after16 >= 0 ? after16 + 1 : tables.length, 0, inflatables);
}

fs.writeFileSync(tablesPath, JSON.stringify(tables, null, 2) + "\n", "utf8");

const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
for (const row of schedule) {
  if (row.activityTypeId === "inflatables") {
    row.circularSectionId = "b.17.1";
  }
}
fs.writeFileSync(schedulePath, JSON.stringify(schedule, null, 2) + "\n", "utf8");

console.log(
  JSON.stringify(
    {
      tables: tables.length,
      b17items: inflatables.items.length,
      b16itemsAfterClean: b16?.items.length,
    },
    null,
    2,
  ),
);
