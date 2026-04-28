"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, X, UserPlus, Users, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useManagerInboxSummary } from '@/hooks/useManagerInboxSummary';
import { formatUserRoleLabel } from '@/lib/auth';
import { parseMessageSubject } from '@/lib/inbox';

export const ManagerHeader = ({ title }: { title: string }) => {
  // אתחול עם ערכים דיפולטיביים
  const [managerProfile, setManagerProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
    is_tech_admin?: boolean;
    role_label: string;
  }>({ full_name: 'מנהל מערכת', avatar_url: null, role_label: 'מחלקת בטיחות ומפעלים' });
  const { counts, pendingUsersList, unreadMessagesList } = useManagerInboxSummary();
  
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  useEffect(() => {
    const initManagerProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata || {};
      setManagerProfile({
        full_name: meta.full_name || meta.official_name || meta.name || 'מנהל מערכת',
        avatar_url: meta.avatar_url,
        is_tech_admin: meta.role === 'admin' || meta.role === 'safety_admin',
        role_label: formatUserRoleLabel({
          role: meta.role,
          department: meta.department,
          branchName: meta.branch_name || meta.branch,
        }),
      });
    };
    initManagerProfile();
  }, []);

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-50 px-8 items-center justify-between transition-all bg-surface-base/90 backdrop-blur-md border-b border-border-subtle">
      
      <div><h1 className="text-3xl font-bold text-text-primary tracking-tight leading-none">{title}</h1></div>
      
      <div className="flex items-center gap-6 relative">
            
            {/* כפתור משתמשים */}
            <div className="relative">
                <button aria-label="פתיחת משתמשים ממתינים" onClick={() => { setIsUsersOpen(!isUsersOpen); setIsBellOpen(false); }} className="text-text-muted hover:text-purple-600 transition-colors relative p-3 bg-surface-card rounded-2xl shadow-sm border border-border-subtle hover:border-purple-200 group">
                    <UserPlus size={22} className="group-hover:scale-110 transition-transform"/>
                    {counts.newUsers > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                {isUsersOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-[100]">
                        <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
                            <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> נרשמים ממתינים</span>
                            <button onClick={() => setIsUsersOpen(false)} aria-label="סגירת חלון משתמשים"><X size={16}/></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {pendingUsersList.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">אין נרשמים חדשים</div>
                            ) : (
                                pendingUsersList.map((u) => (
                                    <Link key={u.id} href="/manager/users" onClick={() => setIsUsersOpen(false)} className="block p-3 border-b border-gray-50 hover:bg-purple-50 transition-colors">
                                        <div className="font-bold text-gray-800 text-sm">{u.raw_user_meta_data?.full_name}</div>
                                        <div className="text-xs text-gray-500">{u.raw_user_meta_data?.department || 'ללא מחלקה'}</div>
                                    </Link>
                                ))
                            )}
                        </div>
                        <Link href="/manager/users" className="block p-2 text-center text-xs font-bold text-purple-600 bg-gray-50 hover:underline">לכל המשתמשים</Link>
                    </div>
                )}
            </div>

            {/* כפתור הודעות (פעמון) */}
            <div className="relative">
                <button aria-label="פתיחת הודעות חדשות" onClick={() => { setIsBellOpen(!isBellOpen); setIsUsersOpen(false); }} className="text-text-muted hover:text-brand-cyan transition-colors relative p-3 bg-surface-card rounded-2xl shadow-sm border border-border-subtle hover:border-brand-cyan group">
                    <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                    {counts.newMessages > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                {isBellOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-[450px] overflow-hidden animate-fadeIn z-[100]">
                        <div className="bg-brand-cyan p-3 flex justify-between items-center text-white"><span className="text-sm font-bold">הודעות חדשות</span><button aria-label="סגירת חלון הודעות" onClick={() => setIsBellOpen(false)}><X size={16}/></button></div>
                        <div className="max-h-60 overflow-y-auto">
                            {unreadMessagesList.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-xs">אין הודעות חדשות</div>
                            ) : (
                                unreadMessagesList.map((m) => {
                                    // חילוץ בטוח עם ערכי ברירת מחדל
                                    const { fullName, mainRole, secondaryInfo } = m.displayDetails || { fullName: 'משתמש', mainRole: '', secondaryInfo: '' };
                                    const parsedSubject = parseMessageSubject(String(m.subject || ''));
                                    
                                    return (
                                        <Link key={m.id} href="/manager/inbox" onClick={() => setIsBellOpen(false)} className="block p-3 border-b border-gray-50 hover:bg-cyan-50 transition-colors group">
                                            <div className="flex items-center text-xs mb-1 gap-1.5 min-w-0 overflow-hidden whitespace-nowrap">
                                                {/* שם מלא */}
                                                <span className="font-bold text-gray-900">{fullName}</span>

                                                {/* מפריד + מחלקה (אם יש) */}
                                                {secondaryInfo && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="text-brand-cyan font-bold">{secondaryInfo}</span>
                                                    </>
                                                )}

                                                {/* מפריד + תפקיד וסניף (אם יש) */}
                                                {mainRole && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="text-gray-600 font-medium">{mainRole}</span>
                                                    </>
                                                )}
                                                
                                                {m.category === 'bug' && <span className="mr-auto text-[9px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">תקלה</span>}
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-500 items-center min-w-0">
                                                <Mail size={12} className="text-brand-cyan mt-0.5 shrink-0"/>
                                                <span className="line-clamp-1">{parsedSubject.cleanSubject}</span>
                                                <span className={`shrink-0 inline-flex items-center justify-center w-4 h-4 rounded ${parsedSubject.type === 'bug' ? 'text-red-600 bg-red-50' : 'text-cyan-700 bg-cyan-50'}`}>
                                                  {parsedSubject.type === 'bug' ? <AlertTriangle size={10}/> : <Mail size={10}/>}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                        <Link href="/manager/inbox" className="block p-2 text-center text-xs font-bold text-brand-cyan bg-gray-50 hover:underline">לכל ההודעות</Link>
                    </div>
                )}
            </div>

            <div className="h-10 w-px bg-gray-300 opacity-50"></div>

            {/* פרטי מנהל */}
            <div className="flex items-center gap-4">
                <div className="text-left hidden lg:block">
                    <div className="text-lg font-bold text-text-primary leading-none mb-1">
                        {managerProfile.full_name}
                    </div>
                    <div className="text-sm text-brand-green font-medium text-left">
                        {managerProfile.role_label}
                    </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-800 to-black flex items-center justify-center text-white font-bold text-2xl shadow-lg border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative">
                    {managerProfile.avatar_url ? (
                        <Image src={managerProfile.avatar_url} alt="Profile" fill className="object-cover" unoptimized />
                    ) : (
                        <span>{managerProfile.full_name?.[0] || 'M'}</span>
                    )}
                </div>
            </div>
      </div>
    </header>
  );
};