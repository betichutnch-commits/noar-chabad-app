"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  LayoutDashboard, CheckSquare, Users, FileBarChart, Settings, LogOut, Mail, User, X
} from 'lucide-react'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'avremihalperin@gmail.com';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const ManagerSidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [counts, setCounts] = useState({ pendingTrips: 0, pendingUsers: 0 });
  
  useEffect(() => {
    const checkRoleAndCounts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === ADMIN_EMAIL || user?.user_metadata?.contact_email === ADMIN_EMAIL) {
            setIsSuperAdmin(true);
        }

        const [trips, users] = await Promise.all([
            supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            // הנחה: המשתמשים הממתינים מזוהים ע"י סטטוס בפרופיל או במטא-דאטה. 
            // כאן נשתמש בשאילתה גנרית, תתאים אותה לדאטה בייס שלך אם צריך.
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        setCounts({
            pendingTrips: trips.count || 0,
            pendingUsers: users.count || 0
        });
    };
    checkRoleAndCounts();
  }, []);

  const menuItems = [
    { label: 'לוח בקרה', href: '/manager', icon: LayoutDashboard, exact: true },
    { label: 'דואר נכנס', href: '/manager/inbox', icon: Mail },
    { 
        label: 'אישור טיולים', 
        href: '/manager/approvals', 
        icon: CheckSquare, 
        badge: counts.pendingTrips, 
        badgeColor: 'bg-orange-500' 
    },
    { 
        label: 'ניהול משתמשים', 
        href: '/manager/users', 
        icon: Users, 
        badge: counts.pendingUsers, 
        badgeColor: 'bg-purple-500' 
    },
    { label: 'דוחות ונתונים', href: '/manager/reports', icon: FileBarChart },
    { label: 'פרופיל אישי', href: '/manager/profile', icon: User },
  ];

  if (isSuperAdmin) {
      menuItems.push({ label: 'הגדרות מערכת', href: '/manager/settings', icon: Settings });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
        <div className={`fixed inset-0 bg-black/60 z-[90] transition-opacity duration-300 md:hidden backdrop-blur-sm ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>

        <aside className={`w-64 bg-white border-l border-gray-200 h-screen fixed right-0 top-0 z-[100] flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:z-40 md:shadow-none`}>
          
          <div className="h-24 flex flex-col items-center justify-center border-b border-gray-100 p-4 relative">
              <button onClick={(e) => { e.stopPropagation(); if (onClose) onClose(); }} className="absolute top-3 left-3 md:hidden text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 rounded-lg hover:bg-red-50 transition-all z-50 cursor-pointer active:scale-90">
                  <X size={20} />
              </button>

              <div className="relative w-full h-10 md:h-12 flex items-center justify-center mt-1">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
              </div>
              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  ממשק ניהול
              </div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => { if(onClose) onClose() }}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 font-bold text-sm whitespace-nowrap ${isActive ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </div>
                  {(item.badge ?? 0) > 0 && (
                      <span className={`${item.badgeColor} text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm`}>
                          {item.badge}
                      </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-3 py-3 rounded-xl w-full text-red-500 hover:bg-red-50 transition-all font-bold text-sm group">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/> יציאה
            </button>
          </div>
        </aside>
    </>
  )
}