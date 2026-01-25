import { createClient } from '@supabase/supabase-js';

// 1. קריאה למשתני הסביבה (הסימן ! אומר לטייפסקריפט: "סמוך עלי, זה קיים")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. בדיקת בטיחות - אם אין מפתחות, נעצור את האפליקציה עם שגיאה ברורה
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables! Check your .env.local file.');
}

// 3. יצירת הקליינט המרכזי
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 4. פונקציית העזר (שימרנו אותה מהקובץ הקודם)
// ממירה תעודת זהות לכתובת אימייל פיקטיבית לצורך התחברות המערכת
export const getIdAsEmail = (idNumber: string) => {
  return `${idNumber}@noar.chabad.co.il`;
};