"use client"

import React, { useState } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu } from 'lucide-react';
import Image from 'next/image';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dir-rtl font-sans text-right">
      
      {/* כפתור תפריט למובייל (מופיע רק במסכים קטנים) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white sticky top-0 z-30 shadow-md">
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
              <Menu size={24}/>
          </button>
          
          <div className="flex items-center gap-2">
              <span className="font-bold text-sm">ממשק ניהול</span>
              <div className="w-8 h-8 relative">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain brightness-0 invert"/>
              </div>
          </div>
          
          <div className="w-8"></div> {/* איזון לאמצע */}
      </div>

      {/* הסרגל (מעבירים לו את המצב כדי שידע להיפתח/להיסגר) */}
      <ManagerSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* התוכן הראשי */}
      {/* במובייל (mr-0) הוא תופס את כל הרוחב. במחשב (md:mr-64) הוא משאיר מקום לסרגל */}
      <div className="md:mr-64 mr-0 transition-all duration-300">
        {children}
      </div>
      
    </div>
  );
}