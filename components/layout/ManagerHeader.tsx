"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, X, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export const ManagerHeader = ({ title }: { title: string }) => {
  // 1. שימוש ב-Hook
  const { user } = useUser();
  
  const [counts, setCounts] = useState({ newUsers: 0, newMessages: 0 });
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  // 2. טעינת נתונים והאזנה לשינויים
  useEffect(() => {
    const fetchCounts = async () => {
        // ספירת משתמשים חדשים
        const { count: pendingUsersCount } = await supabase
            .from('profiles') // בודקים בטבלת פרופילים אם יש כאלה בסטטוס pending
            .select('*', { count: 'exact', head: true })
            // הערה: הלוגיקה של 'pending' במשתמשים תלויה באיך שומרים את זה.
            // אם זה ב-metadata, צריך להשתמש ב-rpc או view.
            // כאן אני מניח שיצרנו view כמו בקוד המקורי, או שנשתמש בשאילתה פשוטה אם אפשר.
            // לבינתיים, נשחזר את הלוגיקה המקורית שעבדה על users_management_view
            .eq('status', 'pending'); // הנחה: יש עמודת status ב-profiles או ב-view

        // ספירת הודעות חדשות
        const { count: pendingMessagesCount } = await supabase
            .from('contact_messages')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'treated');

        // אם אין View, נשתמש בפתרון הקודם (פחות יעיל אבל עובד)
        let finalUsersCount = 0;
        const { data: usersData } = await supabase.from('users_management_view').select('raw_user_meta_data');
        if (usersData) {
             finalUsersCount = usersData.filter((u: any) => {
                const status = u.raw_user_meta_data?.status;
                return !status || status === 'pending';
            }).length;
        }

        setCounts({
            newUsers: finalUsersCount,
            newMessages: pendingMessagesCount || 0
        });
    };

    fetchCounts();

    // האזנה לשינויים בזמן אמת (רק להודעות כרגע, משתמשים זה מורכב יותר בגלל auth)
    const channel = supabase.channel('manager_header')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
            fetchCounts();
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-40 px-8 items-center justify-between transition-all bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
      
      {/* צד ימין: כותרת בלבד */}
      <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-none">
              {title}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
              ממשק ניהול ובקרה
          </p>
      </div>
      
      {/* צד שמאל: כלים ופרופיל */}
      <div className="flex items-center gap-6 relative">
        
        {/* כפתור אישור משתמשים - עם חלונית קופצת */}
        <div className="relative">
            <button 
                onClick={() => setIsUsersOpen(!isUsersOpen)}
                className="text-gray-400 hover:text-purple-600 transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 group" 
                title="אישור משתמשים"
            >
                <UserPlus size={22} className="group-hover:scale-110 transition-transform"/>
                {counts.newUsers > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </button>

            {/* חלונית נרשמים */}
            {isUsersOpen && (
                <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-50">
                    <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
                        <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> נרשמים חדשים</span>
                        <button onClick={() => setIsUsersOpen(false)}><X size={16}/></button>
                    </div>
                    <div className="p-4 text-center">
                        {counts.newUsers > 0 ? (
                            <Link href="/manager/users" className="block p-3 bg-orange-50 rounded-xl mb-2 text-orange-800 font-bold hover:bg-orange-100 transition-colors border border-orange-100">
                                {counts.newUsers} משתמשים ממתינים לאישור
                            </Link>
                        ) : (
                            <p className="text-gray-400 text-sm">אין נרשמים חדשים כרגע</p>
                        )}
                        <Link href="/manager/users" className="block text-xs font-bold text-gray-500 hover:text-purple-600 mt-4 underline">
                            לניהול המשתמשים
                        </Link>
                    </div>
                </div>
            )}
        </div>

        {/* פעמון התראות (הודעות) */}
        <div className="relative">
            <button 
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-[#00BCD4] group"
            >
                <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                {counts.newMessages > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E91E63] rounded-full border-2 border-white animate-pulse"></span>
                )}
            </button>

            {/* חלונית ההתראות */}
            {isBellOpen && (
                <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-50">
                    <div className="bg-[#00BCD4] p-3 flex justify-between items-center text-white">
                        <span className="text-sm font-bold">הודעות מערכת</span>
                        <button onClick={() => setIsBellOpen(false)}><X size={16}/></button>
                    </div>
                    <div className="p-4 text-center">
                        {counts.newMessages > 0 ? (
                            <Link href="/manager/inbox" className="block p-3 bg-cyan-50 rounded-xl mb-2 text-cyan-800 font-bold hover:bg-cyan-100 transition-colors">
                                ישנן {counts.newMessages} פניות הממתינות לטיפול
                            </Link>
                        ) : (
                            <p className="text-gray-400 text-sm">אין הודעות חדשות</p>
                        )}
                        <Link href="/manager/inbox" className="block text-xs font-bold text-gray-500 hover:text-[#00BCD4] mt-4 underline">
                            לכל ההודעות
                        </Link>
                    </div>
                </div>
            )}
        </div>

        <div className="h-10 w-px bg-gray-300 opacity-50 mx-2"></div>

        {/* פרופיל מנהל */}
        <Link href="/manager/profile">
            <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-left hidden md:block">
                    <div className="text-sm font-bold text-gray-800 leading-none mb-1 group-hover:text-[#00BCD4] transition-colors">
                        {user?.user_metadata?.full_name || 'מנהל מערכת'}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                        מחלקת בטיחות ומפעלים
                    </div>
                </div>
                
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xl shadow-lg border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform">
                    {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        user?.user_metadata?.full_name?.[0] || 'M'
                    )}
                </div>
            </div>
        </Link>
      </div>
    </header>
  );
};