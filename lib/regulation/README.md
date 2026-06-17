# מאגר רגולציה — חוזר מנכ"ל 585

מבנה נתונים מובנה לחוזר **585** (פעילות חוץ ואטרקציות, הוראה 0467, תקף 02.02.2026).

## מבנה

| נתיב | תוכן |
|------|------|
| `chapter-a/` | פרק א' — צ'קליסט (15), תיאום, רישוי (13), גיל (14), רפואה (10), ביטוח |
| `licensed-schedule-map.json` | מיפוי מלא: כל 18 אופציות `license: true` בלו״ז → סעיף בחוזר |
| `chapter-b/preparation-tables.json` | טבלאות היערכות לפי סעיף — פרק ב' (חולץ מ-PDF) |
| `chapter-c/preparation-tables.json` | טבלאות היערכות לפי סעיף — פרק ג' (חולץ מ-PDF) |
| `activities.json` | מיפוי לקטגוריות לו״ז + פרקים ב'-ג' |
| `requirements/` | דרישות גלובליות ולפי פעילות |
| `compliance.ts` | `evaluateTripCompliance`, `getRowRegulationHints` |
| `circulars/450-trips-meta.json` | חוזר 450 — פרויקט נפרד (לאחר ייצוב 585) |

## מקור PDF

`docs/regulation/source/chozer-585.pdf`

## API

`GET /api/trips/[id]/regulation-compliance`

## מיפוי ארגוני

`organizational-role-mapping.json` — מנהל → מזכירות, מורה → רכז/ת.

**לא ייעוץ משפטי** — לאמת מול החוזר הרשמי ומוקד טבע.
