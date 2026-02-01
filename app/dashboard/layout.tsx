"use client"

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu } from 'lucide-react';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl text-right">
      
      {/* כפתור תפריט למובייל (מופיע רק במסכים קטנים) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-transform"
          >
              <Menu size={24} />
          </button>
          
          <div className="w-24 h-8 relative">
             <Image src="/logo.png" alt="Logo" fill className="object-contain"/>
          </div>
          
          <div className="w-10"></div> {/* איזון לאמצע */}
      </div>

      {/* הסרגל המקובע */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {/* התיקון הקריטי למרווחים:
          md:mr-64 -> במחשב דוחף 256px שמאלה (מקום לסרגל).
          mr-0 -> במובייל לא דוחף כלום.
      */}
      <div className="transition-all duration-300 md:mr-64 mr-0">
        {children}
      </div>
    </div>
  );
}