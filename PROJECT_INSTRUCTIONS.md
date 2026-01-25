# הוראות פרויקט "מערכת הטיולים - נוער חב"ד" (מעודכן: ינואר 2026)

## 1. Tech Stack (טכנולוגיה)
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript.
* **Styling:** Tailwind CSS.
* **Icons:** Lucide React.
* **Database:** Supabase.

## 2. Design System (חוקי הברזל לעיצוב)
העיצוב מבוסס על סגנון "ידידותי, גדול וברור" (Friendly & Accessible).

### א. טיפוגרפיה (Typography)
* **פונט בלעדי:** `Rubik` (מוגדר ב-`layout.tsx` ו-`tailwind.config.ts`).
* **משקלים:**
  * כותרות ראשיות: `font-black` (רק במקרים חריגים) או `font-bold`.
  * טקסט רגיל וכותרות משנה: `font-bold` או `font-medium`.
  * יש להימנע מפונטים דקים מדי.

### ב. מידות וגדלים (Sizing) - קריטי!
* **שדות קלט (Inputs) וכפתורים (Buttons):** גובה קבוע של **60px** (`h-[60px]`).
* **כרטיסים (Cards):** פינות עגולות מאוד: `rounded-[32px]`.
* **כפתורים ואלמנטים פנימיים:** פינות עגולות: `rounded-xl` או `rounded-2xl`.

### ג. צבעים (Color Palette)
יש להשתמש במשתני ה-Tailwind שהוגדרו:
* **Brand Cyan (`text-[#00BCD4]` / `bg-[#00BCD4]`):** צבע מותג ראשי, כותרות, אייקונים.
* **Brand Green (`#8BC34A`):** כפתורי פעולה ראשיים ("שמור", "סיום"), אישורי הצלחה.
* **Brand Pink (`#E91E63`):** פוקוס (Focus Rings), מסגרות פעילות, שגיאות, והדגשות.
* **Brand Dark (`#263238`):** טקסטים ראשיים.

## 3. ארכיטקטורה ומבנה (Project Structure)
* **Layouts:**
  * אין לשכפל Header או Sidebar בכל דף.
  * יש להשתמש ב-`app/dashboard/layout.tsx` שמכיל את `Sidebar` ואת `Header`.
  * דפים פנימיים (כמו `new-trip`) צריכים להכיל רק את התוכן הייחודי שלהם.
* **Components:**
  * חובה להשתמש ב-`@/components/ui/Button` וב-`@/components/ui/Input` המותאמים אישית (בגודל 60px).
  * אין להשתמש ב-HTML tags רגילים (`<button>`, `<input>`) אלא אם כן יש צורך בסטייל ייחודי מאוד שלא נתמך בקומפוננטה.

## 4. אבטחה ונתונים (Data & Security)
* **Supabase:**
  * אין להשתמש ב-`createClient` בתוך הקומפוננטות.
  * חובה לייבא את הלקוח המאובטח: `import { supabase } from '@/lib/supabaseClient'`.
* **Environment Variables:**
  * מפתחות API לא ייכנסו לקוד לעולם.

## 5. הנחיות כלליות ל-AI
* בכל יצירת דף חדש, וודא שהוא תואם ויזואלית לדף `dashboard/new-trip`.
* שמור על קוד נקי: פצל פונקציות לוגיות (כמו `handleUpload`) מחוץ ל-JSX.
* השתמש ב-`lucide-react` עבור כל האייקונים.