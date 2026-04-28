"use client"

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu, Bell, X, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { PushPermissionBanner } from '@/components/PushPermissionBanner';

const DEPT_LOGOS: Record<string, string> = {
    'בת מלך': '/logos/bat-melech.png',
    'בנות חב״ד': '/logos/bnos-chabad.png',
    'הפנסאים': '/logos/hapanasim.png',
    'תמים': '/logos/temimim.png',
    'מועדוני המעשים הטובים': '/logos/clubs.png',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. שימוש ב-Hook
  const { user, roleChangedNotice, clearRoleChangedNotice } = useUser();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const { unreadNotifications } = useUnreadNotifications(user?.id);

  // נתונים נגזרים
  const deptLogo = user ? (DEPT_LOGOS[user.user_metadata?.department] || '/logo.png') : '/logo.png';
  const fullName = user?.user_metadata?.full_name || '';
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  return (
    <div className="min-h-screen bg-surface-base dir-rtl text-right font-sans">
      <PushPermissionBanner userId={user?.id} />
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16">
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 border border-gray-200"
              >
                  <Menu size={20} />
              </button>
              <div className="w-8 h-8 relative">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain"/>
              </div>
              <div className="h-5 w-px bg-gray-200"></div>
              <div className="w-8 h-8 relative">
                 <Image 
                    src={deptLogo} 
                    alt="Dept" 
                    fill 
                    className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                 />
              </div>
          </div>
          
          <Link href="/dashboard/profile" className="flex items-center gap-2 bg-gray-50 p-1 pl-1 pr-3 rounded-full border border-gray-100 shadow-sm">
              <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-800 leading-none truncate max-w-[80px]">
                      {fullName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-gray-500 leading-none truncate max-w-[80px] mt-0.5">
                      {user?.user_metadata?.branch || 'מטה'}
                  </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-100 border border-white overflow-hidden relative">
                  {avatarUrl ? (
                      <Image src={avatarUrl} alt="User" fill className="object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-600 font-bold text-xs">
                          {fullName?.[0]}
                      </div>
                  )}
              </div>
          </Link>
      </div>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div className="transition-all duration-300 md:mr-56 mr-0 min-h-screen">
        {children}
      </div>

      {roleChangedNotice && (
        <div className="fixed top-20 md:top-6 left-1/2 -translate-x-1/2 z-[90] w-[92vw] max-w-md">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3">
            <div className="text-sm font-bold flex-1">{roleChangedNotice}</div>
            <button
              onClick={clearRoleChangedNotice}
              className="text-emerald-700/80 hover:text-emerald-900 text-xs font-bold"
              aria-label="סגור הודעה"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (Notifications) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2 md:hidden">
          {isBellOpen && (
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 mb-2 overflow-hidden animate-fadeIn">
                  <div className="bg-brand-cyan p-3 flex justify-between items-center text-white">
                      <span className="text-sm font-bold">הודעות חדשות</span>
                      <button onClick={() => setIsBellOpen(false)}><X size={16}/></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                      {unreadNotifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-xs">אין הודעות חדשות עבורך</div>
                      ) : (
                          unreadNotifications.map(n => (
                              <Link key={n.id} href="/dashboard/inbox" onClick={() => setIsBellOpen(false)} className="block p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                  <div className="flex gap-2">
                                      <Mail size={14} className="text-brand-cyan mt-0.5 shrink-0"/>
                                      <span className="text-xs font-bold text-gray-700 line-clamp-2">{n.title}</span>
                                  </div>
                              </Link>
                          ))
                      )}
                  </div>
                  <Link href="/dashboard/inbox" onClick={() => setIsBellOpen(false)} className="block p-2 text-center text-xs font-bold text-brand-cyan bg-gray-50 hover:underline">
                      לכל ההודעות
                  </Link>
              </div>
          )}

          <button 
            onClick={() => setIsBellOpen(!isBellOpen)}
            className="w-12 h-12 bg-white rounded-full shadow-lg shadow-gray-300 border border-gray-100 flex items-center justify-center text-gray-600 hover:text-brand-cyan transition-all hover:scale-110 active:scale-95 relative"
          >
              <Bell size={22} />
              {unreadNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-brand-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">
                      {unreadNotifications.length}
                  </span>
              )}
          </button>
      </div>

    </div>
  );
}