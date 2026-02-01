import { createBrowserClient } from '@supabase/ssr';

// 1. קריאה למשתני הסביבה
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// בדיקת בטיחות (השארתי את זה כי זה רעיון טוב)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables!');
}

// 2. יצירת הקליינט החדש - שים לב לשינוי כאן!
// אנחנו משתמשים ב-createBrowserClient במקום createClient הרגיל
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 3. פונקציית העזר (שמרנו אותה כדי לא לשבור קבצים אחרים שמשתמשים בה)
export const getIdAsEmail = (idNumber: string) => {
  return `${idNumber}@noar.chabad.co.il`;
};