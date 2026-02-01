"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Loader2, Search, MapPin, Calendar, CheckCircle, Clock, XCircle, ChevronLeft, FileText, Eye
} from 'lucide-react'
import Link from 'next/link'

export default function MyTripsPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTrips = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setTrips(data || []);
      setLoading(false);
    };
    fetchTrips();
  }, []);

  const getStatusBadge = (status: string) => {
      const styles: any = {
          approved: "bg-green-50 text-green-700 border-green-200",
          pending: "bg-orange-50 text-orange-700 border-orange-200",
          rejected: "bg-red-50 text-red-700 border-red-200"
      };
      const labels: any = { approved: 'אושר', pending: 'בבדיקה', rejected: 'לא אושר' };
      const icons: any = { approved: <CheckCircle size={14}/>, pending: <Clock size={14}/>, rejected: <XCircle size={14}/> };

      return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border w-fit ${styles[status] || styles.pending}`}>
              {icons[status] || icons.pending} {labels[status] || 'בבדיקה'}
          </span>
      );
  };

  const filteredTrips = trips.filter(t => t.name.includes(searchTerm) || t.branch?.includes(searchTerm));

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <Header title="הטיולים שלי" />

      {/* תיקון הגלילה והריווח: p-4 במובייל */}
      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden">
        
        {/* סרגל כלים */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[24px] border border-gray-200 shadow-sm mb-6">
            <div className="relative w-full md:w-96">
                <Input 
                    placeholder="חיפוש לפי שם טיול..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    icon={<Search size={20}/>}
                    className="bg-gray-50 border-transparent focus:bg-white"
                />
            </div>
            <div className="text-gray-500 text-sm font-bold w-full md:w-auto text-center md:text-right">
                סה"כ {filteredTrips.length} טיולים
            </div>
        </div>

        {/* --- תצוגה 1: טבלה (רק למחשב) --- */}
        <div className="hidden md:block bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-sm">
            {filteredTrips.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-bold text-lg">לא נמצאו טיולים</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="p-6">שם הפעילות</th>
                                <th className="p-6">תאריכים</th>
                                <th className="p-6">מיקום</th>
                                <th className="p-6">סטטוס</th>
                                <th className="p-6 text-left">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTrips.map((trip) => (
                                <tr key={trip.id} className="hover:bg-cyan-50/30 transition-colors group">
                                    <td className="p-6 font-bold text-gray-800 text-base">{trip.name}</td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar size={16} className="text-[#00BCD4]"/>
                                            {new Date(trip.start_date).toLocaleDateString('he-IL')}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin size={16} className="text-[#E91E63]"/>
                                            {trip.details?.timeline?.[0]?.finalLocation || '-'}
                                        </div>
                                    </td>
                                    <td className="p-6">{getStatusBadge(trip.status)}</td>
                                    <td className="p-6 text-left">
                                        <Link href={`/dashboard/trip/${trip.id}`}>
                                            <button className="text-[#00BCD4] hover:bg-cyan-50 p-2 rounded-xl transition-all">
                                                <ChevronLeft size={20}/>
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* --- תצוגה 2: כרטיסים (רק לטלפון) --- */}
        <div className="md:hidden space-y-4">
            {filteredTrips.length === 0 ? (
                 <div className="p-10 text-center text-gray-400 bg-white rounded-3xl border border-gray-200">
                    <FileText size={40} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-bold">לא נמצאו טיולים</p>
                </div>
            ) : (
                filteredTrips.map((trip) => (
                    <div key={trip.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
                        
                        {/* פס צבע צדדי לפי סטטוס */}
                        <div className={`absolute top-0 right-0 bottom-0 w-1.5 
                            ${trip.status === 'approved' ? 'bg-green-500' : trip.status === 'rejected' ? 'bg-red-500' : 'bg-orange-400'}`}>
                        </div>

                        <div className="pr-4"> {/* ריווח בגלל הפס הצדדי */}
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-black text-gray-800 text-lg leading-tight">{trip.name}</h3>
                                {getStatusBadge(trip.status)}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={14} className="text-[#00BCD4]"/>
                                    <span>{new Date(trip.start_date).toLocaleDateString('he-IL')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin size={14} className="text-[#E91E63]"/>
                                    <span className="truncate max-w-[200px]">{trip.details?.timeline?.[0]?.finalLocation || 'לא צוין מיקום'}</span>
                                </div>
                            </div>

                            <Link href={`/dashboard/trip/${trip.id}`}>
                                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <Eye size={18}/> צפייה בפרטים מלאים
                                </button>
                            </Link>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </>
  )
}