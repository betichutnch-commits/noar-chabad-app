"use client"

import React, { useState } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu } from 'lucide-react';
import Image from 'next/image';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dir-rtl font-sans text-right relative">
      
      {/* --- כפתור המבורגר למובייל (Header) --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white sticky top-0 z-30 shadow-md h-16">
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
              <Menu size={24}/>
          </button>
          
          <div className="flex items-center gap-2">
              <span className="font-bold text-sm">ממשק ניהול</span>
              {/* לוגו קטן */}
              <div className="w-8 h-8 relative">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain brightness-0 invert"/>
              </div>
          </div>
          
          <div className="w-8"></div> {/* סתם תופס מקום כדי לאזן את האמצע */}
      </div>

      {/* --- הסרגל (Sidebar) --- */}
      {/* אנחנו מעבירים לו את הפקודה להיפתח או להיסגר */}
      <ManagerSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* --- התוכן הראשי --- */}
      {/* במחשב: זז שמאלה 256 פיקסלים. במובייל: תופס הכל */}
      <div className="md:mr-64 mr-0 transition-all duration-300">
        {children}
      </div>
      
    </div>
  );
}