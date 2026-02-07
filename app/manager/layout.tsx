"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu, Bell, UserPlus, X, Mail, ChevronRight, Users, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [counts, setCounts] = useState({ newUsers: 0, newMessages: 0 });
  const [recentMessages, setRecentMessages] = useState<any[]>([]); 
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  
  const [activeBubble, setActiveBubble] = useState<'messages' | 'users' | null>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const fetchData = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 1. בדיקת הרשאה טכנית (האם המשתמש הוא מנהל טכני?)
          const { data: profile } = await supabase.from('profiles')
            .select('is_tech_admin')
            .eq('id', user.id)
            .single();
          
          const isTechAdmin = profile?.is_tech_admin || false;

          // 2. משתמשים ממתינים
          const { data: users, count: userCount } = await supabase.from('users_management_view')
            .select('*', { count: 'exact' })
            .eq('raw_user_meta_data->>status', 'pending')
            .limit(5);

          // 3. הודעות - עם סינון חכם!
          let msgQuery = supabase.from('contact_messages')
            .select('*', { count: 'exact' })
            .neq('status', 'treated');

          // אם המשתמש הוא לא טכני -> הסתר הודעות שהן באגים
          if (!isTechAdmin) {
              msgQuery = msgQuery.neq('category', 'bug');
          }

          const { data: msgs, count: msgCount } = await msgQuery
            .order('created_at', { ascending: false })
            .limit(5);

          setCounts({ newMessages: msgCount || 0, newUsers: userCount || 0 });
          setRecentMessages(msgs || []);
          setRecentUsers(users || []);
      };

      fetchData();

      const channel = supabase.channel('mobile_manager_updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => fetchData())
        .subscribe();

      const handleClickOutside = (event: MouseEvent) => {
        if (fabContainerRef.current && !fabContainerRef.current.contains(event.target as Node)) {
            setActiveBubble(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
          supabase.removeChannel(channel);
      };

  }, []);

  const hasAnyAlerts = counts.newMessages > 0 || counts.newUsers > 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl font-sans text-right relative">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16">
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 active:scale-95 transition-transform"
              >
                  <Menu size={20}/>
              </button>
              
              <div className="w-8 h-8 relative">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain"/>
              </div>
          </div>

          <Link href="/manager/profile" className="flex items-center gap-2.5 bg-gray-50 pl-1 pr-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
             <div className="flex flex-col items-end leading-none">
                 <span className="text-[11px] font-black text-gray-800">
                     {user?.user_metadata?.full_name || 'מנהל'}
                 </span>
                 <span className="text-[9px] font-light text-[#8BC34A] mt-0.5">
                     מחלקת בטיחות ומפעלים
                 </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover"/>
                ) : (
                    <span className="text-xs font-bold">{user?.user_metadata?.full_name?.[0] || 'M'}</span>
                )}
             </div>
          </Link>
      </div>

      <ManagerSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="md:mr-64 mr-0 transition-all duration-300 min-h-screen pb-24">
        {children}
      </div>
      
      {/* FABs */}
      {hasAnyAlerts && (
        <div className="md:hidden fixed bottom-6 left-6 z-[60] flex flex-col gap-4 items-start" ref={fabContainerRef}>
            
            {counts.newMessages > 0 && (
                <div className="relative">
                    {activeBubble === 'messages' && (
                        <div className="absolute bottom-16 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn origin-bottom-left z-20">
                            <div className="bg-[#00BCD4] p-3 flex justify-between items-center text-white">
                                <span className="text-sm font-bold flex items-center gap-2"><Mail size={16}/> הודעות חדשות</span>
                                <button onClick={() => setActiveBubble(null)}><X size={16}/></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto bg-gray-50/50">
                                {recentMessages.map((m: any) => (
                                    <Link key={m.id} href="/manager/inbox" onClick={() => setActiveBubble(null)} className="block p-3 border-b border-gray-100 bg-white hover:bg-cyan-50">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-800">{m.sender_name || 'רכז/ת'}</span>
                                            {m.category === 'bug' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">תקלה</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{m.subject}</div>
                                    </Link>
                                ))}
                            </div>
                            <Link href="/manager/inbox" className="block p-2 text-center text-xs font-bold text-[#00BCD4] bg-white border-t hover:bg-gray-50">לכל ההודעות</Link>
                        </div>
                    )}
                    <button 
                        onClick={() => setActiveBubble(activeBubble === 'messages' ? null : 'messages')}
                        className={`w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center transition-all relative ${activeBubble === 'messages' ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        {activeBubble === 'messages' ? <X size={20}/> : <Bell size={20} />}
                        {counts.newMessages > 0 && !activeBubble && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E91E63] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">{counts.newMessages}</span>}
                    </button>
                </div>
            )}

            {counts.newUsers > 0 && (
                <div className="relative">
                    {activeBubble === 'users' && (
                        <div className="absolute bottom-16 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn origin-bottom-left z-20">
                            <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
                                <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> נרשמים ממתינים</span>
                                <button onClick={() => setActiveBubble(null)}><X size={16}/></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto bg-gray-50/50">
                                {recentUsers.map((u: any) => {
                                    const meta = u.raw_user_meta_data || {};
                                    return (
                                        <Link key={u.id} href="/manager/users" onClick={() => setActiveBubble(null)} className="block p-3 border-b border-gray-100 bg-white hover:bg-purple-50">
                                            <div className="font-bold text-gray-800 text-xs">{meta.full_name}</div>
                                            <div className="text-[10px] text-gray-500">{meta.department}</div>
                                        </Link>
                                    );
                                })}
                            </div>
                            <Link href="/manager/users" className="block p-2 text-center text-xs font-bold text-purple-600 bg-white border-t hover:bg-gray-50">לניהול משתמשים</Link>
                        </div>
                    )}
                    <button 
                        onClick={() => setActiveBubble(activeBubble === 'users' ? null : 'users')}
                        className={`w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center transition-all relative ${activeBubble === 'users' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-100'}`}
                    >
                        {activeBubble === 'users' ? <X size={20}/> : <UserPlus size={20} />}
                        {counts.newUsers > 0 && !activeBubble && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">{counts.newUsers}</span>}
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}