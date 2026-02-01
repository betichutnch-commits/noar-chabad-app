"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Loader2, AlertCircle, CheckCircle, Clock, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function ManagerHomePage() {
  const [stats, setStats] = useState({ pendingTrips: 0, approvedTrips: 0, totalTrips: 0, pendingUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            // 1. נתוני טיולים
            const { count: pendingTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: approvedTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'approved');
            const { count: totalTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true });

            // 2. נתוני משתמשים (נרשמים חדשים)
            // מביאים את כל המשתמשים ובודקים ידנית למי אין סטטוס או שהוא pending
            const { data: usersData } = await supabase.from('users_management_view').select('raw_user_meta_data');
            
            const pendingUsersCount = usersData?.filter((u: any) => {
                const status = u.raw_user_meta_data?.status;
                return !status || status === 'pending'; // נחשב ממתין אם אין סטטוס או שהוא 'pending'
            }).length || 0;

            setStats({
                pendingTrips: pendingTrips || 0,
                approvedTrips: approvedTrips || 0,
                totalTrips: totalTrips || 0,
                pendingUsers: pendingUsersCount
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
      <ManagerHeader title="לוח בקרה ראשי" />
      
      <div className="p-4 md:p-10 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden">
        <header className="mb-10">
            <h2 className="text-xl font-bold text-gray-500">תמונת מצב - ניהול מפעלים וטיולים</h2>
        </header>

        {/* שינינו את הגריד ל-4 עמודות כדי להכניס את כרטיס המשתמשים */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
             
             {/* 1. כרטיס משתמשים חדשים (חדש!) */}
             <Link href="/manager/users" className="group">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-orange-500 transition-all cursor-pointer relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-4xl font-black text-gray-800 mb-2">{stats.pendingUsers}</div>
                            <div className="text-sm font-bold text-gray-500 group-hover:text-orange-600 transition-colors">נרשמים לאישור</div>
                        </div>
                        <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl"><UserPlus size={24}/></div>
                    </div>
                </div>
            </Link>

             {/* 2. כרטיס טיולים ממתינים */}
             <Link href="/manager/approvals" className="group">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#E91E63] transition-all cursor-pointer relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-2 h-full bg-[#E91E63]"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-4xl font-black text-gray-800 mb-2">{stats.pendingTrips}</div>
                            <div className="text-sm font-bold text-gray-500 group-hover:text-[#E91E63] transition-colors">טיולים לאישור</div>
                        </div>
                        <div className="p-3 bg-red-50 text-[#E91E63] rounded-2xl"><AlertCircle size={24}/></div>
                    </div>
                </div>
            </Link>
            
            {/* 3. כרטיס מאושרים */}
             <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-4xl font-black text-gray-800 mb-2">{stats.approvedTrips}</div>
                        <div className="text-sm font-bold text-gray-500">טיולים שאושרו</div>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><CheckCircle size={24}/></div>
                </div>
            </div>

            {/* 4. כרטיס סה"כ */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-4xl font-black text-gray-800 mb-2">{stats.totalTrips}</div>
                        <div className="text-sm font-bold text-gray-500">סה"כ פעילות</div>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Clock size={24}/></div>
                </div>
            </div>
        </div>
      </div>
    </>
  )
}