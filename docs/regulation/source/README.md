# מקור רגולטורי — חוזר מנכ"ל 585

קובץ המקור הרשמי: `chozer-585.pdf` (חוזר מנכ"ל | פעילות חוץ כולל אטרקציות, הוראה 0467, תקף מ-02.02.2026).

הנתונים המובנים במערכת נמצאים ב-`lib/regulation/` ומבוססים על חילוץ מ-PDF + סקירה. **אין להסתמך על המערכת כייעוץ משפטי.**

## חילוץ מחדש מ-PDF

```powershell
npm install pdf-parse@1.1.1 --no-save
node scripts/extract-chozer-585.mjs
node scripts/build-chapter-bc-preparation-tables.mjs
```

פלט: `lib/regulation/chapter-b/preparation-tables.json` (פרק ב׳), `lib/regulation/chapter-c/preparation-tables.json` (פרק ג׳).

אם הקובץ אינו ב-repo (גודל ~8MB), העתיקו ממחשב מקומי:

```powershell
Copy-Item "חוזרי מנכ''ל.pdf" "docs/regulation/source/chozer-585.pdf"
```

**מתנפחים (כרטיס מידע תנועות נוער):** `inflatables-guidance-youth.pdf` — מומלץ לליטוש סעיף 17; קריא יותר מחילוץ אוטומטי מהחוזר המלא.
