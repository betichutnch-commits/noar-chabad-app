import React from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F1F5F9] dir-rtl font-sans text-right">
      
      {/* 1. הסרגל הקבוע בצד ימין */}
      <ManagerSidebar />
      
      {/* 2. המקום לתוכן המשתנה (הדפים עצמם) */}
      {/* שים לב: אין כאן Header. הוא יגיע מתוך ה-children */}
      <div className="mr-64 transition-all duration-300">
        {children}
      </div>
      
    </div>
  );
}