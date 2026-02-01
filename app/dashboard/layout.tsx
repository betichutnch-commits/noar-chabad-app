"use client"

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu } from 'lucide-react';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl">
      
      {/* כפתור תפריט למובייל (Header עליון קטן) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100"
          >
              <Menu size={24} />
          </button>
          
          <div className="w-24">
             <Image src="/logo.png" alt="Logo" width={100} height={40} className="object-contain"/>
          </div>
          
          <div className="w-10"></div> {/* סתם כדי לאזן את האמצע */}
      </div>

      {/* הסרגל המקובע (מעבירים לו את המצב) */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {/* התיקון הגדול למובייל:
         במקום mr-64 קבוע, אנחנו עושים:
         1. mr-0 כברירת מחדל (למובייל)
         2. md:mr-64 (למסכים בינוניים ומעלה)
      */}
      <div className="md:mr-64 mr-0 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}