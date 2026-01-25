"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  LayoutDashboard, CheckSquare, Users, FileBarChart, Settings, LogOut, Mail, UserCircle
} from 'lucide-react'

export const ManagerSidebar = () => {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // הוסף את השורה הזו בתחילת הפונקציה (לפני ה-if):
        const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

        // ושנה את תנאי ה-if לשורה הזו:
        if (user?.email === SUPER_ADMIN_EMAIL) {
           setIsSuperAdmin(true);
        }
    };
    checkRole();
  }, []);

  // רשימת התפריטים הבסיסית (שכולם רואים)
  const baseItems = [
    { label: 'לוח בקרה ראשי', href: '/manager', icon: LayoutDashboard, exact: true },
    { label: 'דואר נכנס והודעות', href: '/manager/inbox', icon: Mail },
    { label: 'אישור טיולים', href: '/manager/approvals', icon: CheckSquare },
    { label: 'ניהול משתמשים', href: '/manager/users', icon: Users },
    { label: 'דוחות ונתונים', href: '/manager/reports', icon: FileBarChart },
    { label: 'פרופיל אישי', href: '/manager/profile', icon: UserCircle },
  ];

  // הוספת "הגדרות" רק אם אתה המנהל הראשי
  const menuItems = isSuperAdmin 
    ? [...baseItems, { label: 'הגדרות מערכת', href: '/manager/settings', icon: Settings }]
    : baseItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <aside className="w-64 bg-[#1E293B] text-white h-screen fixed right-0 top-0 z-50 flex flex-col shadow-xl border-l border-gray-700">
      
      {/* לוגו כהה למנהלים */}
      <div className="h-32 flex flex-col items-center justify-center border-b border-gray-700 p-6 bg-[#0F172A]">
          <div className="relative w-full h-16 flex items-center justify-center mb-2">
             <Image 
               src="/logo.png" 
               alt="Logo" 
               width={120} 
               height={60} 
               className="object-contain"
             />
          </div>
          <div className="text-[10px] text-gray-400 font-bold bg-gray-800 px-3 py-1 rounded-full uppercase tracking-wider">
              ממשק ניהול בטיחות
          </div>
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
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm
                ${isActive 
                  ? 'bg-[#00BCD4] text-white shadow-lg shadow-cyan-900/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 bg-[#0F172A]">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 rounded-xl w-full text-red-400 hover:bg-red-900/20 transition-all font-bold text-sm">
          <LogOut size={20} />
          יציאה מאובטחת
        </button>
      </div>
    </aside>
  )
}