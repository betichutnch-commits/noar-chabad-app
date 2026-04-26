import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useSignedUrl = (filePath: string | undefined | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUrl = async () => {
      if (!filePath) {
        if (isMounted) setSignedUrl(null);
        return;
      }

      // מקבלים רק נתיבי storage פנימיים, לא URL חיצוני מלא.
      // נתיבים תקפים: "folder/file.png" או "trip-files/folder/file.png"
      const normalizedPath = filePath.startsWith('trip-files/') ? filePath.slice('trip-files/'.length) : filePath;
      const isSafeStoragePath = !normalizedPath.includes('..') && !normalizedPath.startsWith('/') && !normalizedPath.startsWith('http');
      if (!isSafeStoragePath) {
        if (isMounted) setSignedUrl(null);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('trip-files') // וודא שזה השם הנכון של הבאקט שלך
          .createSignedUrl(normalizedPath, 3600);

        // עדכון רק אם הקומפוננטה עדיין מוצגת והנתיב לא השתנה בינתיים
        if (isMounted) {
          if (error) {
            console.error('Error loading image:', error);
            setSignedUrl(null);
          } else if (data) {
            setSignedUrl(data.signedUrl);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };

    fetchUrl();

    // Cleanup function: רץ אם הקומפוננטה יוצאת מהמסך או שה-filePath משתנה
    return () => {
      isMounted = false;
    };
  }, [filePath]);

  return signedUrl;
};