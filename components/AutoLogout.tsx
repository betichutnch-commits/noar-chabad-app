"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AutoLogout() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // פונקציית היציאה
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/");
    window.location.reload(); // רענון כדי לנקות סטייטים
  }, [router]);

  // איפוס הטיימר בעת פעילות
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // בדיקה האם זה מובייל (פחות מ-768px)
    const isMobile = window.innerWidth < 768;
    
    // זמנים במילי-שניות:
    // מחשב: 60 דקות * 60 שניות * 1000 = 3,600,000
    // נייד: 15 דקות * 60 שניות * 1000 = 900,000
    const timeoutDuration = isMobile ? 900000 : 3600000;

    timerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutDuration);
  }, [handleLogout]);

  useEffect(() => {
    // אירועים שמעידים על פעילות
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // הפעלה ראשונית
    resetTimer();

    // הוספת מאזינים
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // ניקוי ביציאה
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  return null; // רכיב שקוף, לא מציג כלום
}