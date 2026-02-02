"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, X, Mail } from 'lucide-react';

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

// התיקון כאן: export const (ולא default)
export const Header = ({ title }: { title: string }) => {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  
  // ניהול התראות לפעמון
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isBellOpen, setIsBellOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setDepartment(user.user_metadata?.department || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
        fetchNotifications(user.id);
      }
    };
    initData();

    const channel = supabase.channel('header_desktop')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          if (user?.id) fetchNotifications(user.id); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchNotifications = async (userId: string) => {
      const { data } = await supabase.from('notifications')
          .select('id, title, is_read')
          .eq('user_id', userId)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);
      setUnreadNotifications(data || []);
  };

  const deptLogo = DEPT_LOGOS[department] || '/logo.png';

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-30 px-8 items-center justify-between transition-all bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
      
      {/* צד ימין: כותרת + לוגו */}
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 p-1 hidden md:block">
            <Image src={deptLogo} alt="Department Logo" fill className="object-contain p-1" />
        </div>
        
        <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-none">
                {title}
            </h1>
            {user && (
                <p className="text-sm text-gray-500 font-medium mt-1">
                    {getSimpleGreeting(user.user_metadata?.full_name)}
                </p>
            )}
        </div>
      </div>
      
      {/* צד שמאל: פרופיל + פעמון */}
      <div className="flex items-center gap-6 relative">
            
            {/* פעמון דסקטופ עם חלון קופץ */}
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

                {/* חלונית ההתראות */}
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
                <div className="text-left">
                    <div className="text-lg font-bold text-gray-800 leading-none mb-1">
                        {user?.user_metadata?.full_name} 
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        {user?.user_metadata?.department} • {user?.user_metadata?.branch || 'מטה'}
                    </div>
                </div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00BCD4] to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-100 border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative">
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    user?.user_metadata?.full_name?.[0]
                )}
                </div>
            </div>
      </div>
    </header>
  );
};