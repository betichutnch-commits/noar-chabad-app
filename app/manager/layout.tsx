"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ManagerSidebar } from '@/components/layout/ManagerSidebar'; 
import { Menu, Bell, UserPlus, X, Mail, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useManagerInboxSummary } from '@/hooks/useManagerInboxSummary';
import { formatUserRoleLabel } from '@/lib/auth';
import { DEPARTMENTS_CONFIG } from '@/lib/constants';
import { PushPermissionBanner } from '@/components/PushPermissionBanner';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, roleChangedNotice, clearRoleChangedNotice } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { counts, pendingUsersList: recentUsers } = useManagerInboxSummary();
  const { unreadNotifications, markRead, markAllRead } = useUnreadNotifications(user?.id);
  
  const [activeBubble, setActiveBubble] = useState<'notifications' | 'users' | null>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabContainerRef.current && !fabContainerRef.current.contains(event.target as Node)) {
        setActiveBubble(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasAnyAlerts = unreadNotifications.length > 0 || counts.newUsers > 0;

  const normalizeDepartment = (department?: string) =>
    String(department || '').trim().replace(/״/g, '"').replace(/\s+/g, ' ');

  const getDepartmentTextClass = (department?: string) => {
    const key = normalizeDepartment(department);
    if (!key) return 'text-gray-500';
    const config = DEPARTMENTS_CONFIG[key];
    if (!config) return 'text-gray-500';
    const textClass = config.color
      .split(' ')
      .find((cls) => cls.startsWith('text-'));
    return textClass || 'text-gray-500';
  };

  const clearAllRecentNotifications = async () => {
    if (unreadNotifications.length === 0) return;
    await markAllRead();
  };

  return (
    <div className="min-h-screen bg-surface-base dir-rtl font-sans text-right relative">
      <PushPermissionBanner userId={user?.id} />
      
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
                 <span className="text-[9px] font-light text-brand-green mt-0.5">
                     {formatUserRoleLabel({
                       role: user?.user_metadata?.role,
                       department: user?.user_metadata?.department,
                       branchName: user?.user_metadata?.branch_name || user?.user_metadata?.branch,
                     })}
                 </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                {user?.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="Profile" width={32} height={32} className="w-full h-full object-cover" unoptimized/>
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
      
      {/* FABs */}
      {(hasAnyAlerts || true) && (
        <div className="md:hidden fixed bottom-6 left-6 z-[60] flex flex-col gap-4 items-start" ref={fabContainerRef}>
            
            {/* בועת התראות */}
            <div className="relative">
                    {activeBubble === 'notifications' && (
                        <div className="absolute bottom-16 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn origin-bottom-left z-20">
                            <div className="bg-brand-cyan p-3 flex justify-between items-center text-white">
                                <span className="text-sm font-bold flex items-center gap-2"><Mail size={16}/> התראות חדשות</span>
                                <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => void clearAllRecentNotifications()}
                                      disabled={unreadNotifications.length === 0}
                                      className="text-[11px] font-bold border border-white/70 rounded-md px-2 py-1 hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-transparent"
                                    >
                                      סמן הכל כנקרא
                                    </button>
                                    <button onClick={() => setActiveBubble(null)}><X size={16}/></button>
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-gray-50/50">
                                {unreadNotifications.length === 0 ? (
                                  <div className="p-6 text-center text-gray-400 text-xs">אין התראות חדשות</div>
                                ) : (
                                  unreadNotifications.map((n) => (
                                    <Link
                                      key={n.id}
                                      href={String(n.link || '/manager')}
                                      onClick={() => {
                                        setActiveBubble(null);
                                        void markRead(n.id);
                                      }}
                                      className="block p-3 border-b border-gray-100 bg-white hover:bg-cyan-50"
                                    >
                                      <div className="text-xs text-gray-700 font-bold line-clamp-2">{n.title}</div>
                                    </Link>
                                  ))
                                )}
                            </div>
                            <Link href="/dashboard/inbox" className="block p-2 text-center text-xs font-bold text-brand-cyan bg-white border-t hover:bg-gray-50">לכל ההתראות</Link>
                        </div>
                    )}
                    <button 
                        onClick={() => setActiveBubble(activeBubble === 'notifications' ? null : 'notifications')}
                        className={`w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center transition-all relative ${activeBubble === 'notifications' ? 'bg-brand-cyan text-white border-brand-cyan' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        {activeBubble === 'notifications' ? <X size={20}/> : <Bell size={20} />}
                        {unreadNotifications.length > 0 && !activeBubble && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-pink text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse">{unreadNotifications.length}</span>}
                    </button>
                </div>

            {/* בועת משתמשים */}
            {counts.newUsers > 0 && (
                <div className="relative">
                    {activeBubble === 'users' && (
                        <div className="absolute bottom-16 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn origin-bottom-left z-20">
                            <div className="bg-purple-600 p-3 flex justify-between items-center text-white">
                                <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> נרשמים ממתינים</span>
                                <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => void clearAllRecentNotifications()}
                                      disabled={unreadNotifications.length === 0}
                                      className="text-[11px] font-bold border border-white/70 rounded-md px-2 py-1 hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-transparent"
                                    >
                                      סמן הכל כנקרא
                                    </button>
                                    <button onClick={() => setActiveBubble(null)}><X size={16}/></button>
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-gray-50/50">
                                {recentUsers.map((u) => {
                                    const meta = u.raw_user_meta_data || {};
                                    return (
                                        <Link key={u.id} href="/manager/users" onClick={() => setActiveBubble(null)} className="block p-3 border-b border-gray-100 bg-white hover:bg-purple-50">
                                            <div className="font-bold text-gray-800 text-xs">{meta.full_name}</div>
                                            <div className={`text-[10px] font-bold ${getDepartmentTextClass(meta.department)}`}>{meta.department}</div>
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