import fs from "node:fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

const pdfPath = "docs/regulation/source/chozer-585.pdf";
const buf = fs.readFileSync(pdfPath);
const data = await pdf(buf);
const text = data.text.replace(/\r/g, "");

const outPath = "docs/regulation/source/chozer-585-extracted.txt";
fs.writeFileSync(outPath, text, "utf8");

const markers = [
  "פרק א'",
  "פרק ב'",
  "פרק ג'",
  "פרק ג ':",
  "פרק ג':",
  "היערכות",
  "טבלת היערכות",
];

console.log("pages:", data.numpages, "chars:", text.length);
for (const m of markers) {
  const idx = text.indexOf(m);
  console.log(m, idx >= 0 ? idx : "NOT FOUND");
}

// Print chapter B start snippet
const bIdx = text.indexOf("פרק ב'");
if (bIdx >= 0) {
  console.log("\n--- CHAPTER B (first 8000 chars) ---\n");
  console.log(text.slice(bIdx, bIdx + 8000));
}
