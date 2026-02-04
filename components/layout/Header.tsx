"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, X, Mail } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

const DEPT_LOGOS: any = {
    'בת מלך': '/logos/bat-melech.png',
    'בנות חב״ד': '/logos/bnos-chabad.png',
    'הפנסאים': '/logos/hapanasim.png',
    'תמים': '/logos/temimim.png',
    'מועדוני המעשים הטובים': '/logos/clubs.png',
};

const getSimpleGreeting = (name: string) => {
    const firstName = name?.split(' ')[0] || '';
    return `שלום, ${firstName}`; 
};

export const Header = ({ title }: { title: string }) => {
  const { user } = useUser();
  
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isBellOpen, setIsBellOpen] = useState(false);

  // חישוב תצוגת התפקיד והסניף
  // חישוב תצוגת התפקיד והסניף
  const userDisplayInfo = useMemo(() => {
      // תיקון: החזרת לוגו ברירת מחדל גם כשאין עדיין משתמש
      if (!user) return { 
          fullName: '', 
          department: '', 
          avatarUrl: null, 
          displayRole: '', 
          logo: '/logo.png' 
      };

      const meta = user.user_metadata || {};
      const fullName = meta.full_name || '';
      const department = meta.department || '';
      const role = meta.role;
      const branchName = meta.branch || meta.branch_name || '';

      // לוגיקה לקביעת תואר הרכז/ת
      let roleTitle = 'רכז/ת סניף';
      const deptCheck = department.trim();
      
      const maleDepts = ['הפנסאים', 'פנסאים', 'התמים', 'תמים', 'בני חב"ד', 'בני חב״ד'];
      const femaleDepts = ['בת מלך', 'בנות חב"ד', 'בנות חב״ד'];

      if (maleDepts.some(d => deptCheck.includes(d))) roleTitle = 'רכז סניף';
      else if (femaleDepts.some(d => deptCheck.includes(d))) roleTitle = 'רכזת סניף';

      // בניית הטקסט שיוצג
      let displayRole = '';
      
      if (role === 'coordinator') {
          displayRole = `${roleTitle} ${branchName} | ${department}`;
      } else {
          displayRole = department ? `צוות מטה | ${department}` : 'צוות מטה';
      }

      return {
          fullName,
          department,
          avatarUrl: meta.avatar_url,
          displayRole,
          // מוודא שתמיד יש ערך, גם אם המחלקה לא נמצאת בלוגואים
          logo: DEPT_LOGOS[department] || '/logo.png'
      };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
        const { data } = await supabase.from('notifications')
            .select('id, title, is_read')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);
        setUnreadNotifications(data || []);
    };

    fetchNotifications();

    const channel = supabase.channel('header_notifications')
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}` 
      }, () => {
          fetchNotifications(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-50 px-8 items-center justify-between transition-all bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
      
      {/* צד ימין: כותרת + לוגו */}
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 p-1 hidden md:block">
            <Image 
                src={userDisplayInfo.logo} 
                alt="Department Logo" 
                fill 
                className="object-contain p-1" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
        </div>
        
        <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-none">
                {title}
            </h1>
            {user && (
                <p className="text-sm text-gray-500 font-medium mt-1">
                    {getSimpleGreeting(userDisplayInfo.fullName)}
                </p>
            )}
        </div>
      </div>
      
      {/* צד שמאל: פרופיל + פעמון */}
      <div className="flex items-center gap-6 relative">
            
            {/* פעמון דסקטופ */}
            <div className="relative">
                <button 
                    onClick={() => setIsBellOpen(!isBellOpen)}
                    className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-[#00BCD4] group"
                >
                    <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                    {unreadNotifications.length > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E91E63] rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {isBellOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-50">
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
            </div>

            <div className="h-10 w-px bg-gray-300 opacity-50"></div>

            <div className="flex items-center gap-4">
                <div className="text-left hidden lg:block">
                    <div className="text-lg font-bold text-gray-800 leading-none mb-1">
                        {userDisplayInfo.fullName} 
                    </div>
                    {/* כאן מופיע התיאור המתוקן */}
                    <div className="text-sm text-gray-500 font-medium">
                        {userDisplayInfo.displayRole}
                    </div>
                </div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00BCD4] to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-100 border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative">
                {userDisplayInfo.avatarUrl ? (
                    <img src={userDisplayInfo.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    userDisplayInfo.fullName?.[0]
                )}
                </div>
            </div>
      </div>
    </header>
  );
};