"use client"

import React, { useState } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu } from 'lucide-react';
import Image from 'next/image';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl font-sans text-right relative">
      
      {/* --- כפתור המבורגר למובייל (Header) --- */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16">
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 border border-gray-200 transition-all"
              >
                  <Menu size={20}/>
              </button>
              
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 relative">
                     <Image src="/logo.png" alt="Logo" fill className="object-contain"/>
                  </div>
                  <div className="h-5 w-px bg-gray-200"></div>
                  <span className="font-bold text-gray-700 text-sm">ממשק ניהול</span>
              </div>
          </div>
      </div>

      {/* --- הסרגל (Sidebar) --- */}
      <ManagerSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* --- התוכן הראשי --- */}
      {/* במחשב: זז שמאלה 256 פיקסלים (רוחב הסרגל) כדי לפנות מקום בצד ימין */}
      <div className="md:mr-64 mr-0 transition-all duration-300 min-h-screen">
        {children}
      </div>
      
    </div>
  );
}