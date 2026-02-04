"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  LayoutDashboard, CheckSquare, Users, FileBarChart, Settings, LogOut, Mail, UserCircle, X
} from 'lucide-react'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'avremihalperin@gmail.com';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const ManagerSidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // בדיקה מהירה של תפקיד כדי להציג את התפריט הנכון
  useEffect(() => {
    const checkRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === ADMIN_EMAIL || user?.user_metadata?.contact_email === ADMIN_EMAIL) {
            setIsSuperAdmin(true);
        }
    };
    checkRole();
  }, []);

  const baseItems = [
    { label: 'לוח בקרה ראשי', href: '/manager', icon: LayoutDashboard, exact: true },
    { label: 'דואר נכנס והודעות', href: '/manager/inbox', icon: Mail },
    { label: 'אישור טיולים', href: '/manager/approvals', icon: CheckSquare },
    { label: 'ניהול משתמשים', href: '/manager/users', icon: Users },
    { label: 'דוחות ונתונים', href: '/manager/reports', icon: FileBarChart },
    { label: 'פרופיל אישי', href: '/manager/profile', icon: UserCircle },
  ];

  const menuItems = isSuperAdmin 
    ? [...baseItems, { label: 'הגדרות מערכת', href: '/manager/settings', icon: Settings }]
    : baseItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
        {/* Overlay למובייל */}
        <div 
            className={`fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300 md:hidden backdrop-blur-sm
            ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        {/* סרגל צד לבן ונקי */}
        <aside className={`w-64 bg-white h-screen fixed right-0 top-0 z-[100] flex flex-col shadow-2xl md:shadow-none border-l border-gray-200 transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
            md:translate-x-0 md:z-40`}
        >
          
          {/* Header - לבן ונקי */}
          <div className="h-32 flex flex-col items-center justify-center p-6 relative border-b border-gray-100">
              
              <button 
                onClick={onClose} 
                className="absolute top-4 left-4 md:hidden text-gray-400 hover:text-gray-600 p-2 rounded-full transition-colors z-50"
              >
                  <X size={24} />
              </button>

              {/* הלוגו משתלב טבעית על הרקע הלבן */}
              <div className="relative w-full h-16 flex items-center justify-center mb-2">
                 <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    fill
                    className="object-contain"
                    priority
                 />
              </div>
              
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  ממשק ניהול
              </div>
          </div>

          {/* תפריט */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => { if(onClose) onClose() }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm 
                    ${isActive 
                        ? 'bg-[#00BCD4] text-white shadow-lg shadow-cyan-100' // פעיל: תכלת מותג עם צל
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' // לא פעיל: אפור נקי
                    }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl w-full text-red-500 hover:bg-red-50 transition-all font-bold text-sm group">
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform"/> יציאה מאובטחת
            </button>
          </div>
        </aside>
    </>
  )
}