import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl">
      {/* הסרגל המקובע */}
      <Sidebar />
      
      {/* התיקון החשוב: mr-64 
         זה דוחף את כל התוכן שמאלה ברוחב הסרגל (256px), 
         כך שהם לא יעלו אחד על השני.
      */}
      <div className="mr-64 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}