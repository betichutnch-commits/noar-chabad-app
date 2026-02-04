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
        {/* Overlay */}
        <div 
            className={`fixed inset-0 bg-black/60 z-[90] transition-opacity duration-300 md:hidden backdrop-blur-sm
            ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        <aside className={`w-56 bg-white border-l border-gray-200 h-screen fixed right-0 top-0 z-[100] flex flex-col shadow-2xl transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
            md:translate-x-0 md:z-40 md:shadow-none`}
        >
          
          <div className="h-24 flex flex-col items-center justify-center border-b border-gray-100 p-4 relative">
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                }}
                className="absolute top-3 left-3 md:hidden text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 rounded-lg hover:bg-red-50 transition-all z-50 cursor-pointer active:scale-90"
              >
                  <X size={20} />
              </button>

              <div className="relative w-full h-10 md:h-12 flex items-center justify-center mt-1">
                 <Image 
                    src="/logo.png" 
                    alt="נוער חב״ד" 
                    fill 
                    className="object-contain" 
                    priority 
                 />
              </div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
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
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-bold text-sm whitespace-nowrap
                    ${isActive 
                      ? 'bg-cyan-50 text-[#00BCD4] shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-3 py-3 rounded-xl w-full text-red-500 hover:bg-red-50 transition-all font-bold text-sm group">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/>
              יציאה
            </button>
          </div>
        </aside>
    </>
  )
}