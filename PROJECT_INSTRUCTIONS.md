# הוראות פרויקט "מערכת הטיולים - נוער חב"ד" (מעודכן: פברואר 2026)

## 1. Tech Stack (טכנולוגיה)
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript.
* **Styling:** Tailwind CSS.
* **Icons:** Lucide React.
* **Database:** Supabase.

## 2. Design System (חוקי הברזל לעיצוב)
העיצוב מבוסס על סגנון "ידידותי, גדול וברור" (Friendly & Accessible), עם דגש חזק על התאמה למובייל.

### א. טיפוגרפיה (Typography)
* **פונט בלעדי:** `Rubik` (מוגדר ב-`layout.tsx` ו-`tailwind.config.ts`).
* **משקלים:**
  * כותרות ראשיות: `font-black` (היררכיה גבוהה) או `font-bold`.
  * טקסט רגיל וכותרות משנה: `font-bold` או `font-medium`.
  * **איסור:** יש להימנע מפונטים דקים מדי (`font-light` / `font-thin`).

### ב. מידות וגדלים (Sizing) - קריטי!
* **שדות קלט (Inputs) וכפתורים (Buttons):** גובה קבוע של **50px** (מובייל) עד **60px** (דסקטופ).
* **כרטיסים (Cards):** פינות עגולות מאוד: `rounded-[32px]`.
* **כפתורים ואלמנטים פנימיים:** פינות עגולות: `rounded-xl` או `rounded-2xl`.

### ג. צבעים (Color Palette)
יש להשתמש בקודים הבאים במדויק (מותאמים ללוגו):
* **Brand Cyan (`#00BCD4`):** צבע מותג ראשי, כותרות, אייקונים, הודעות מידע (`info`).
* **Brand Green (`#8BC34A`):** כפתורי פעולה חיוביים ("שמור", "אשר"), הודעות הצלחה (`success`).
* **Brand Pink (`#E91E63`):** פוקוס (Focus Rings), שגיאות (`error`), מחיקות, והדגשות חזקות.
* **Brand Yellow (`#FFC107`):** אזהרות, הודעות אישור פעולה (`confirm`).
* **Brand Dark (`#263238`):** טקסטים ראשיים וכותרות כהות.

## 3. ארכיטקטורה ומבנה (Project Structure)

### א. Layouts
* **מניעת כפילות:** אין לשכפל `Header` או `Sidebar` בכל דף.
* **דפי משתמש:** עטופים ב-`app/dashboard/layout.tsx`.
* **דפי מנהל:** עטופים ב-`app/manager/layout.tsx` (משתמשים ב-`ManagerSidebar` ו-`ManagerHeader`).

### ב. קומפוננטות חובה (Core Components)
כל פיתוח חדש חייב להשתמש ברכיבים הבאים מתוך `components/ui/` ולא בתגיות HTML רגילות:

1.  **`@/components/ui/Input`**:
    * תומך ב-`readOnly`, אייקונים, ומצב `password`.
    * חובה להשתמש בו לכל קלט במערכת.
2.  **`@/components/ui/Button`**:
    * תומך ב-`isLoading`, אייקונים, ו-Variants (`primary`, `secondary`, `danger`, `outline`).
3.  **`@/components/ui/Modal`**:
    * **חוק ברזל:** אין להשתמש ב-`window.alert` או `window.confirm`.
    * כל הודעה למשתמש (הצלחה, שגיאה, אישור מחיקה) תבוצע דרך קומפוננטת ה-`Modal` הגלובלית.
4.  **`@/components/TripDetailsView`**:
    * קומפוננטה **אחת** שמציגה את פרטי הטיול.
    * חובה להשתמש בה גם בדף הרכז (`/dashboard/trip/[id]`), גם בדף המנהל (`/manager/approvals/[id]`) וגם בקישור השיתוף (`/share/...`). אין לשכפל את עיצוב דף הטיול.

## 4. הנחיות פיתוח ו-AI (Guidelines)

### א. ניהול נתונים (Supabase)
* **קליינט:** חובה לייבא תמיד: `import { supabase } from '@/lib/supabaseClient'`.
* **הפרדת לוגיקה:** פונקציות עזר (כמו חישוב תאריכים, המרה לעברית) יש לשים ב-`lib/dateUtils.ts` או `lib/constants.ts`.

### ב. התאמה למובייל (Responsiveness)
* **Container:** כל דף ראשי חייב לכלול את המחלקות: `max-w-[100vw] overflow-x-hidden` למניעת גלילה אופקית לא רצויה.
* **גריד:** שימוש ב-`grid-cols-1` במובייל ו-`md:grid-cols-X` במסכים גדולים.
* **טבלאות:** במידת האפשר, להציג כרטיסים (`Cards`) במובייל וטבלאות (`Table`) רק בדסקטופ.

### ג. תהליכים (Flows)
* **טפסים:** יש לוודא שיש חיווי למשתמש בזמן שליחה (`loading state`) והודעת סיום ברורה (באמצעות ה-`Modal`).
* **טיול חדש:** יש לוודא שסדר ה-Z-Index של תפריטים נפתחים (Dropdowns) גבוה משל האלמנטים שמתחתיהם.

---
**הערה חשובה:** קובץ זה הוא המצפן לפיתוח. כל חריגה מהרכיבים הנ"ל (כמו שימוש ב-`alert` רגיל) תגרור צורך בתיקון (Refactor).