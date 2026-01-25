"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, UserPlus } from 'lucide-react';
import Link from 'next/link';

export const ManagerHeader = ({ title }: { title: string }) => {
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({ newUsers: 0, newMessages: 0 });

  useEffect(() => {
    const fetchData = async () => {
      // 1. הבאת פרטי המנהל הנוכחי
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      // 2. ספירת משתמשים חדשים הממתינים לאישור
      // אנחנו מושכים את כל המשתמשים מה-VIEW ובודקים למי אין סטטוס או שהסטטוס הוא pending
      const { data: usersData } = await supabase.from('users_management_view').select('raw_user_meta_data');
      
      const pendingUsersCount = usersData?.filter((u: any) => {
          const status = u.raw_user_meta_data?.status;
          return !status || status === 'pending';
      }).length || 0;

      // 3. ספירת הודעות שלא טופלו
      const { count: pendingMessagesCount } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'treated'); // כל מה שלא "טופל"

      setCounts({
          newUsers: pendingUsersCount,
          newMessages: pendingMessagesCount || 0
      });
    };

    fetchData();
  }, []);

  return (
    <header className="h-24 sticky top-0 z-40 px-8 flex items-center justify-between transition-all bg-white/90 backdrop-blur-md border-b border-gray-200">
      
      {/* צד ימין: כותרת */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">{title}</h1>
      </div>
      
      {/* צד שמאל: כלים */}
      <div className="flex items-center h-full gap-4">
        
        {/* פעמון 1: אישור משתמשים חדשים */}
        <Link href="/manager/users">
            <button className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm group">
                <UserPlus size={20} className="group-hover:scale-110 transition-transform"/>
                
                {/* נקודה כתומה רק אם יש משתמשים חדשים */}
                {counts.newUsers > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold border border-white">
                        {counts.newUsers}
                    </span>
                )}
            </button>
        </Link>

        {/* פעמון 2: התראות / הודעות */}
        <Link href="/manager/inbox">
            <button className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm group">
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                
                {/* נקודה אדומה רק אם יש הודעות חדשות */}
                {counts.newMessages > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border border-white">
                        {counts.newMessages}
                    </span>
                )}
            </button>
        </Link>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        {/* פרופיל מנהל */}
        <Link href="/manager/profile">
            <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-left hidden md:block">
                    <div className="text-sm font-bold text-gray-800 leading-none mb-1 group-hover:text-[#00BCD4] transition-colors">
                        {user?.user_metadata?.full_name || 'מנהל מערכת'}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                        מטה ארצי
                    </div>
                </div>
                
                <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white ring-1 ring-gray-100 group-hover:scale-105 transition-transform">
                {user?.user_metadata?.full_name?.[0] || 'M'}
                </div>
            </div>
        </Link>
      </div>
    </header>
  );
};