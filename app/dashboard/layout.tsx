"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu, Bell, X, Mail } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const DEPT_LOGOS: any = {
    'בת מלך': '/logos/bat-melech.png',
    'בנות חב״ד': '/logos/bnos-chabad.png',
    'הפנסאים': '/logos/hapanasim.png',
    'תמים': '/logos/temimim.png',
    'מועדוני המעשים הטובים': '/logos/clubs.png',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isBellOpen, setIsBellOpen] = useState(false);

  useEffect(() => {
      const initData = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              setUser(user);
              fetchNotifications(user.id);
          }
      };
      initData();

      const channel = supabase.channel('layout_notifications')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
              if (user?.id) fetchNotifications(user.id);
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, []);

  const fetchNotifications = async (userId: string) => {
      const { data } = await supabase.from('notifications')
          .select('id, title, is_read')
          .eq('user_id', userId)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);
      setUnreadNotifications(data || []);
  };

  const deptLogo = user ? (DEPT_LOGOS[user.user_metadata?.department] || '/logo.png') : '/logo.png';

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl text-right font-sans">
      
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
                 <Image src={deptLogo} alt="Dept" fill className="object-contain"/>
              </div>
          </div>
          
          <Link href="/dashboard/profile" className="flex items-center gap-2 bg-gray-50 p-1 pl-1 pr-3 rounded-full border border-gray-100 shadow-sm">
              <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-800 leading-none truncate max-w-[80px]">
                      {user?.user_metadata?.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-gray-500 leading-none truncate max-w-[80px] mt-0.5">
                      {user?.user_metadata?.branch || 'מטה'}
                  </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-100 border border-white overflow-hidden relative">
                  {user?.user_metadata?.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-600 font-bold text-xs">
                          {user?.user_metadata?.full_name?.[0]}
                      </div>
                  )}
              </div>
          </Link>
      </div>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div className="transition-all duration-300 md:mr-56 mr-0 min-h-screen">
        {children}
      </div>

      {/* תיקון: md:hidden - מוסתר במחשב, מוצג רק במובייל */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2 md:hidden">
          {isBellOpen && (
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 mb-2 overflow-hidden animate-fadeIn">
                  <div className="bg-[#00BCD4] p-3 flex justify-between items-center text-white">
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
                                      <Mail size={14} className="text-[#00BCD4] mt-0.5 shrink-0"/>
                                      <span className="text-xs font-bold text-gray-700 line-clamp-2">{n.title}</span>
                                  </div>
                              </Link>
                          ))
                      )}
                  </div>
                  <Link href="/dashboard/inbox" onClick={() => setIsBellOpen(false)} className="block p-2 text-center text-xs font-bold text-[#00BCD4] bg-gray-50 hover:underline">
                      לכל ההודעות
                  </Link>
              </div>
          )}

          <button 
            onClick={() => setIsBellOpen(!isBellOpen)}
            className="w-12 h-12 bg-white rounded-full shadow-lg shadow-gray-300 border border-gray-100 flex items-center justify-center text-gray-600 hover:text-[#00BCD4] transition-all hover:scale-110 active:scale-95 relative"
          >
              <Bell size={22} />
              {unreadNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-[#E91E63] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">
                      {unreadNotifications.length}
                  </span>
              )}
          </button>
      </div>

    </div>
  );
}