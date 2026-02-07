"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, X, UserPlus, Users, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

// שים לב: export const ולא export default
export const ManagerHeader = ({ title }: { title: string }) => {
  const { user } = useUser();
  const [counts, setCounts] = useState({ newUsers: 0, newMessages: 0 });
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [pendingUsersList, setPendingUsersList] = useState<any[]>([]);
  const [unreadMessagesList, setUnreadMessagesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. בדיקת מנהל טכני
        const { data: profile } = await supabase.from('profiles')
            .select('is_tech_admin')
            .eq('id', user.id)
            .single();
        const isTechAdmin = profile?.is_tech_admin || false;

        // 2. משתמשים
        const { data: users } = await supabase.from('users_management_view').select('*').limit(5);
        const pendingUsers = users?.filter((u:any) => u.raw_user_meta_data?.status === 'pending') || [];
        setPendingUsersList(pendingUsers);

        // 3. הודעות (מסוננות!)
        let msgQuery = supabase.from('contact_messages')
            .select('*')
            .neq('status', 'treated');

        if (!isTechAdmin) {
            msgQuery = msgQuery.neq('category', 'bug');
        }

        const { data: messages } = await msgQuery
            .order('created_at', { ascending: false })
            .limit(5);

        setUnreadMessagesList(messages || []);
        setCounts({ newUsers: pendingUsers.length, newMessages: messages?.length || 0 });
    };

    fetchData();
    const channel = supabase.channel('manager_header_updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => fetchData())
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-50 px-8 items-center justify-between transition-all bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200">
      
      <div><h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-none">{title}</h1></div>
      
      <div className="flex items-center gap-6 relative">
            {/* כפתור משתמשים חדשים */}
            <div className="relative">
                <button onClick={() => { setIsUsersOpen(!isUsersOpen); setIsBellOpen(false); }} className="text-gray-400 hover:text-purple-600 transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 group">
                    <UserPlus size={22} className="group-hover:scale-110 transition-transform"/>
                    {counts.newUsers > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                {isUsersOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-[100]">
                        <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
                            <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> נרשמים ממתינים</span>
                            <button onClick={() => setIsUsersOpen(false)}><X size={16}/></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {pendingUsersList.map((u: any) => (
                                <Link key={u.id} href="/manager/users" onClick={() => setIsUsersOpen(false)} className="block p-3 border-b border-gray-50 hover:bg-purple-50 transition-colors">
                                    <div className="font-bold text-gray-800 text-sm">{u.raw_user_meta_data?.full_name}</div>
                                    <div className="text-xs text-gray-500">{u.raw_user_meta_data?.department}</div>
                                </Link>
                            ))}
                        </div>
                        <Link href="/manager/users" className="block p-2 text-center text-xs font-bold text-purple-600 bg-gray-50 hover:underline">לכל המשתמשים</Link>
                    </div>
                )}
            </div>

            {/* כפתור הודעות */}
            <div className="relative">
                <button onClick={() => { setIsBellOpen(!isBellOpen); setIsUsersOpen(false); }} className="text-gray-400 hover:text-[#00BCD4] transition-colors relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-[#00BCD4] group">
                    <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                    {counts.newMessages > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E91E63] rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                {isBellOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-[100]">
                        <div className="bg-[#00BCD4] p-3 flex justify-between items-center text-white"><span className="text-sm font-bold">הודעות מערכת</span><button onClick={() => setIsBellOpen(false)}><X size={16}/></button></div>
                        <div className="max-h-60 overflow-y-auto">
                            {unreadMessagesList.map((m: any) => (
                                <Link key={m.id} href="/manager/inbox" onClick={() => setIsBellOpen(false)} className="block p-3 border-b border-gray-50 hover:bg-cyan-50 transition-colors">
                                    <div className="flex justify-between">
                                        <div className="flex gap-2"><Mail size={14} className="text-[#00BCD4] mt-0.5 shrink-0"/><span className="text-xs font-bold text-gray-700 line-clamp-1">{m.subject}</span></div>
                                        {m.category === 'bug' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold shrink-0 h-fit">תקלה</span>}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <Link href="/manager/inbox" className="block p-2 text-center text-xs font-bold text-[#00BCD4] bg-gray-50 hover:underline">לכל ההודעות</Link>
                    </div>
                )}
            </div>

            <div className="h-10 w-px bg-gray-300 opacity-50"></div>

            {/* פרטי מנהל */}
            <div className="flex items-center gap-4">
                <div className="text-left hidden lg:block">
                    <div className="text-lg font-bold text-gray-800 leading-none mb-1">{user?.user_metadata?.full_name || 'מנהל מערכת'}</div>
                    <div className="text-sm text-[#8BC34A] font-light">מחלקת בטיחות ומפעלים</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-800 to-black flex items-center justify-center text-white font-bold text-2xl shadow-lg border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative">
                    {user?.user_metadata?.avatar_url ? (<img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />) : (user?.user_metadata?.full_name?.[0] || 'A')}
                </div>
            </div>
      </div>
    </header>
  );
};