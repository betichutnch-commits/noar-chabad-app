"use client"

import React, { useState } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu } from 'lucide-react';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dir-rtl font-sans text-right">
      
      {/* מובייל הדר למנהל */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2"><Menu/></button>
          <span className="font-bold">ממשק ניהול</span>
          <div className="w-8"></div>
      </div>

      {/* העברת המצב לסיידבר */}
      {/* הערה: תצטרך לעדכן את ManagerSidebar בנפרד לקבל את הפרופס האלו כמו שעשינו ב-Sidebar הרגיל */}
      <div className={`fixed inset-0 z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:static`}>
         <ManagerSidebar /> 
         {/* (בפועל צריך לעדכן את קומפוננטת ManagerSidebar שתתמוך בסגירה, או לעטוף אותה כאן) */}
         {/* לפתרון מהיר: הוסף כפתור סגירה בתוך ManagerSidebar או מסך שחור כאן */}
         {mobileOpen && <div className="fixed inset-0 bg-black/50 z-[-1] md:hidden" onClick={() => setMobileOpen(false)}></div>}
      </div>
      
      <div className="md:mr-64 mr-0 transition-all duration-300">
        {children}
      </div>
      
    </div>
  );
}