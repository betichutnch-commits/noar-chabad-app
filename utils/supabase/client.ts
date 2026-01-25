import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // הקוד הזה מחבר את האתר למסד הנתונים באמצעות המפתחות ששמנו בקובץ הסודות
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}