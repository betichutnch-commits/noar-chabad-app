"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Home, PlusCircle, FileText, User, MessageSquare, LogOut, Bell, X
} from 'lucide-react'

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const menuItems = [
    { label: 'ראשי', href: '/dashboard', icon: Home, exact: true },
    { label: 'הודעות ועדכונים', href: '/dashboard/inbox', icon: Bell },
    { label: 'טיול חדש', href: '/dashboard/new-trip', icon: PlusCircle },
    { label: 'הטיולים שלי', href: '/dashboard/my-trips', icon: FileText },
    { label: 'פרופיל אישי', href: '/dashboard/profile', icon: User },
    { label: 'עזרה ותמיכה', href: '/dashboard/contact', icon: MessageSquare }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
        {/* מסך חשוך ברקע במובייל - לחיצה עליו סוגרת את התפריט */}
        <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden 
            ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        {/* הסרגל עצמו - החזרנו את כל העיצוב המקורי */}
        <aside className={`w-64 bg-white border-l border-gray-200 h-screen fixed right-0 top-0 z-50 flex flex-col shadow-xl transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
            md:translate-x-0`}
        >
          
          <div className="h-32 flex items-center justify-center border-b border-gray-100 p-6 relative">
              <div className="relative w-full h-full flex items-center justify-center">
                 <Image 
                   src="/logo.png" 
                   alt="נוער חב״ד" 
                   width={160} 
                   height={80} 
                   className="object-contain max-h-20"
                   priority
                 />
              </div>
              {/* כפתור סגירה שמופיע רק במובייל */}
              <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-gray-400 hover:text-red-500">
                  <X size={24} />
              </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => { if(onClose) onClose() }} 
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold text-sm
                    ${isActive 
                      ? 'bg-cyan-50 text-[#00BCD4] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full text-red-500 hover:bg-red-50 transition-all font-bold text-sm">
              <LogOut size={20} />
              התנתק
            </button>
          </div>
        </aside>
    </>
  )
}