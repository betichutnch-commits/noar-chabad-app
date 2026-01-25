"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell } from 'lucide-react';

// שיב לב: אנו משתמשים ב-export const (ולא default) כדי שהייבוא בשאר הדפים יעבוד חלק
export const Header = ({ title }: { title: string }) => {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. טעינה ראשונית
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        setAvatarUrl(data.user.user_metadata?.avatar_url || null);
      }
    };
    getUser();
    
    // 2. האזנה לשינויים (כדי שאם תעלה תמונה, זה יתעדכן כאן מיד)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="h-24 sticky top-0 z-40 px-8 flex items-center justify-between transition-all bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
      
      {/* צד ימין: כותרת */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
      </div>
      
      {/* צד שמאל: אזור אישי */}
      <div className="flex items-center h-full">
        
        {/* פעמון התראות */}
        <button className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-[#00BCD4] group">
            <Bell size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E91E63] rounded-full border-2 border-white"></span>
        </button>

        {/* קו הפרדה */}
        <div className="h-10 w-px bg-gray-300 mx-6 opacity-50"></div>

        {/* פרופיל משתמש */}
        <div className="flex items-center gap-4">
            <div className="text-left hidden md:block">
                <div className="text-lg font-bold text-gray-800 leading-none mb-1">
                    {user?.user_metadata?.full_name} 
                </div>
                <div className="text-sm text-gray-500 font-medium">
                    {user?.user_metadata?.department} • {user?.user_metadata?.branch || 'מטה'}
                </div>
            </div>
            
            {/* תמונת פרופיל */}
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