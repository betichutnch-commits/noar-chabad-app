"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, X, Mail, ClipboardList } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { formatUserRoleLabel, getCoordinatorRoleTitle } from '@/lib/auth';
import { useDeptReviewQueue } from '@/hooks/useDeptReviewQueue';
import { resolveDisplayName } from '@/lib/userDisplay';

const DEPT_LOGOS: Record<string, string> = {
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
  const { user, profile } = useUser();
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isDeptQueueOpen, setIsDeptQueueOpen] = useState(false);
  const { unreadNotifications, markRead, markAllRead } = useUnreadNotifications(user?.id);
  const { queueTrips, pendingCount, enabled: showDeptQueue, queueHighlight } = useDeptReviewQueue(user);

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
      const fullName = resolveDisplayName({
        meta: meta as Record<string, unknown>,
        profile: (profile || null) as Record<string, unknown> | null,
        fallback: '',
      });
      const department = meta.department || '';
      const role = meta.role;
      const branchName = meta.branch || meta.branch_name || '';

      const roleTitle = getCoordinatorRoleTitle(String(department));

      let displayRole = '';

      if (role === 'coordinator') {
          displayRole = `${roleTitle} ${branchName} | ${department}`;
      } else {
          const roleLabel = formatUserRoleLabel({ role, department, branchName });
          displayRole = department && !roleLabel.includes(department)
              ? `${roleLabel} | ${department}`
              : roleLabel;
      }

      return {
          fullName,
          department,
          avatarUrl: meta.avatar_url,
          displayRole,
          logo: DEPT_LOGOS[department] || '/logo.png'
      };
  }, [user, profile]);

  return (
    <header className="hidden md:flex h-24 sticky top-0 z-50 px-8 items-center justify-between transition-all bg-surface-base/90 backdrop-blur-md border-b border-border-subtle">
      
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
            <h1 className="text-3xl font-bold text-text-primary tracking-tight leading-none">
                {title}
            </h1>
            {user && (
                <p className="text-sm text-text-secondary font-medium mt-1">
                    {getSimpleGreeting(userDisplayInfo.fullName)}
                </p>
            )}
        </div>
      </div>
      
      {/* צד שמאל: פרופיל + פעמון */}
      <div className="flex items-center gap-6 relative">
            
            {/* פעמון דסקטופ */}
            {showDeptQueue && (
                <div className="relative">
                    <button
                        onClick={() => { setIsDeptQueueOpen(!isDeptQueueOpen); setIsBellOpen(false); }}
                        aria-label="טיולים שממתינים לבחינתך"
                        className={`text-text-muted hover:text-brand-cyan transition-colors relative p-3 bg-surface-card rounded-2xl shadow-sm border group ${
                          queueHighlight ? 'border-brand-pink ring-4 ring-pink-100 animate-pulse' : 'border-border-subtle hover:border-brand-cyan'
                        }`}
                    >
                        <ClipboardList size={22} className="group-hover:scale-105 transition-transform" />
                        {pendingCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-brand-pink text-white text-[10px] rounded-full border-2 border-white flex items-center justify-center font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </button>

                    {isDeptQueueOpen && (
                        <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-96 overflow-hidden animate-fadeIn z-50">
                            <div className="bg-brand-cyan p-3 flex justify-between items-center text-white">
                                <span className="text-sm font-bold">טיולים שממתינים לבחינתך</span>
                                <button onClick={() => setIsDeptQueueOpen(false)} aria-label="סגירת תור בחינה"><X size={16}/></button>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {queueTrips.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-xs">אין כרגע טיולים שממתינים לבחינתך</div>
                                ) : (
                                    queueTrips.slice(0, 8).map((trip) => (
                                        <Link
                                            key={trip.id}
                                            href={`/hq/dept-review/${trip.id}`}
                                            onClick={() => setIsDeptQueueOpen(false)}
                                            className="block p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="text-xs font-bold text-gray-800 truncate">{trip.name}</div>
                                            <div className="text-[11px] text-gray-500 truncate mt-1">
                                                {trip.coordinator_name || 'רכז/ת לא ידוע/ה'} • {trip.branch || 'ללא סניף'}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            <Link href="/hq/dept-review" onClick={() => setIsDeptQueueOpen(false)} className="block p-2 text-center text-xs font-bold text-brand-cyan bg-gray-50 hover:underline">
                                לכל הטיולים לבחינה
                            </Link>
                        </div>
                    )}
                </div>
            )}

            <div className="relative">
                <button 
                    onClick={() => { setIsBellOpen(!isBellOpen); setIsDeptQueueOpen(false); }}
                    aria-label="פתיחת התראות"
                    className="text-text-muted hover:text-brand-cyan transition-colors relative p-3 bg-surface-card rounded-2xl shadow-sm border border-border-subtle hover:border-brand-cyan group"
                >
                    <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                    {unreadNotifications.length > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {isBellOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden animate-fadeIn z-50">
                        <div className="bg-brand-cyan p-3 flex justify-between items-center text-white">
                            <span className="text-sm font-bold">הודעות חדשות</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => void markAllRead()}
                                disabled={unreadNotifications.length === 0}
                                className="text-[11px] font-bold border border-white/70 rounded-md px-2 py-1 hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-transparent"
                              >
                                סמן הכל כנקרא
                              </button>
                              <button onClick={() => setIsBellOpen(false)} aria-label="סגירת התראות"><X size={16}/></button>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {unreadNotifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-xs">אין הודעות חדשות עבורך</div>
                            ) : (
                                unreadNotifications.map(n => (
                                    <Link
                                      key={n.id}
                                      href={String(n.link || '/dashboard/inbox')}
                                      onClick={() => {
                                        setIsBellOpen(false);
                                        void markRead(n.id);
                                      }}
                                      className="block p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex gap-2">
                                            <Mail size={14} className="text-brand-cyan mt-0.5 shrink-0"/>
                                            <span className="text-xs font-bold text-gray-700 line-clamp-2">{n.title}</span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                        <Link href="/dashboard/inbox" onClick={() => setIsBellOpen(false)} className="block p-2 text-center text-xs font-bold text-brand-cyan bg-gray-50 hover:underline">
                            לכל ההודעות
                        </Link>
                    </div>
                )}
            </div>

            <div className="h-10 w-px bg-gray-300 opacity-50"></div>

            <div className="flex items-center gap-4">
                <div className="text-left hidden lg:block">
                    <div className="text-lg font-bold text-text-primary leading-none mb-1">
                        {userDisplayInfo.fullName} 
                    </div>
                    {/* כאן מופיע התיאור המתוקן */}
                    <div className="text-sm text-text-secondary font-medium">
                        {userDisplayInfo.displayRole}
                    </div>
                </div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-cyan to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-100 border-[3px] border-white ring-1 ring-gray-100 shrink-0 overflow-hidden relative">
                {userDisplayInfo.avatarUrl ? (
                    <Image src={userDisplayInfo.avatarUrl} alt="Profile" fill className="object-cover" unoptimized />
                ) : (
                    userDisplayInfo.fullName?.[0]
                )}
                </div>
            </div>
      </div>
    </header>
  );
};