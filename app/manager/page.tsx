"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Loader2, AlertCircle, CheckCircle, UserPlus, FileText, Clock, ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'

export default function ManagerHomePage() {
  const [stats, setStats] = useState({ pendingTrips: 0, approvedTrips: 0, totalTrips: 0, pendingUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const { count: pendingTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: approvedTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'approved');
            const { count: totalTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true });

            const { data: usersData } = await supabase.from('users_management_view').select('raw_user_meta_data');
            const pendingUsersCount = usersData?.filter((u: any) => {
                const status = u.raw_user_meta_data?.status;
                return !status || status === 'pending';
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

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <ManagerHeader title="מרכז שליטה" />
      
      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
        
        <div className="flex items-center gap-2 mb-4 opacity-60">
            <Shield size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">תמונת מצב יומית</span>
        </div>

        {/* --- גריד סטטיסטיקה --- */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dir-ltr">
                
                {/* 1. ממתינים לאישור */}
                <Link href="/manager/approvals" className="group p-4 md:p-6 flex flex-col items-center justify-center hover:bg-orange-50/50 transition-colors cursor-pointer text-center relative dir-rtl">
                    <div className="text-orange-500 bg-orange-50 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform"><Clock size={20}/></div>
                    <div className="text-2xl md:text-3xl font-black text-gray-800 leading-none mb-1">{stats.pendingTrips}</div>
                    <div className="text-xs font-bold text-gray-400 group-hover:text-orange-500">ממתינים לאישור</div>
                    {stats.pendingTrips > 0 && <span className="absolute top-3 right-3 flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse"></span>}
                </Link>

                {/* 2. רכזים חדשים */}
                <Link href="/manager/users" className="group p-4 md:p-6 flex flex-col items-center justify-center hover:bg-purple-50/50 transition-colors cursor-pointer text-center relative dir-rtl">
                    <div className="text-purple-500 bg-purple-50 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform"><UserPlus size={20}/></div>
                    <div className="text-2xl md:text-3xl font-black text-gray-800 leading-none mb-1">{stats.pendingUsers}</div>
                    <div className="text-xs font-bold text-gray-400 group-hover:text-purple-500">רכזים חדשים</div>
                    {stats.pendingUsers > 0 && <span className="absolute top-3 right-3 flex h-2.5 w-2.5 rounded-full bg-purple-500"></span>}
                </Link>

                {/* 3. אושרו */}
                <Link href="/manager/approvals?filter=approved" className="group p-4 md:p-6 flex flex-col items-center justify-center hover:bg-green-50/50 transition-colors cursor-pointer text-center dir-rtl">
                    <div className="text-green-600 bg-green-50 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform"><CheckCircle size={20}/></div>
                    <div className="text-2xl md:text-3xl font-black text-gray-800 leading-none mb-1">{stats.approvedTrips}</div>
                    <div className="text-xs font-bold text-gray-400 group-hover:text-green-600">טיולים שאושרו</div>
                </Link>

                {/* 4. סה"כ */}
                <div className="group p-4 md:p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors text-center dir-rtl">
                    <div className="text-gray-400 bg-gray-50 p-2 rounded-xl mb-2"><FileText size={20}/></div>
                    <div className="text-2xl md:text-3xl font-black text-gray-800 leading-none mb-1">{stats.totalTrips}</div>
                    <div className="text-xs font-bold text-gray-400">סה"כ פעילויות</div>
                </div>

            </div>
        </div>

        {/* קישורים מהירים */}
        <h3 className="text-lg font-bold text-gray-800 mb-4">גישה מהירה</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            <Link href="/manager/inbox" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-[#00BCD4] hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-[#00BCD4]">
                        <Clock size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm">פניות והודעות</div>
                        <div className="text-[10px] text-gray-400">צפייה בדיווחים וטיפול בפניות</div>
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-[#00BCD4] group-hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                </div>
            </Link>

            <Link href="/manager/approvals" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-orange-400 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm">אישור טיולים</div>
                        <div className="text-[10px] text-gray-400">צפייה בבקשות לטיולים חדשים</div>
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                </div>
            </Link>

        </div>

      </div>
    </>
  )
}