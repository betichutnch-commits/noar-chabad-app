"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { 
  Loader2, Clock, X, CheckCircle, Search, 
  MapPin, ShieldAlert, Sun, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

// --- עזרים לוגיים ---
const getHebrewDateSimple = (dateString: string) => {
    if (!dateString) return '';
    try {
        return new Intl.DateTimeFormat('he-IL', { calendar: 'hebrew', day: 'numeric', month: 'long' }).format(new Date(dateString));
    } catch (e) { return ''; }
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/'; return; }
        setUser(user);

        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', user.id)
                .order('start_date', { ascending: false });
            if (error) throw error;
            setTrips(data || []);
        } catch (e) { console.error('Error fetching trips:', e); } 
        finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
      const styles: any = {
          approved: "bg-green-50 text-green-700 border-green-200",
          pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
          rejected: "bg-red-50 text-red-700 border-red-200"
      };
      const icons: any = {
          approved: <CheckCircle size={14}/>,
          pending: <Clock size={14}/>,
          rejected: <X size={14}/>
      };
      const labels: any = { approved: 'אושר', pending: 'בבדיקה', rejected: 'נדחה' };
      
      return <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${styles[status]}`}>{icons[status]} {labels[status]}</span>;
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcomingTrip = trips.filter(t => t.start_date >= today).sort((a,b) => a.start_date.localeCompare(b.start_date))[0];
  const displayTrips = trips.filter(t => {
      const matchesFilter = activeFilter === 'all' || t.status === activeFilter;
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
  });

  return (
    <>
      <Header title={`שלום, ${user?.user_metadata?.full_name?.split(' ')[0]}`} />

      {/* תיקון קריטי לרוחב במובייל */}
      <div className="p-4 md:p-6 space-y-6 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-6xl md:mx-auto">
          
          {/* שורת סטטוסים */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* כרטיס הטיול הבא */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
                  <div className="relative z-10">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">הפעילות הבאה</div>
                      {upcomingTrip ? (
                          <>
                            <h3 className="text-xl font-bold text-gray-800 truncate mb-1">{upcomingTrip.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Clock size={14} className="text-[#E91E63]"/>
                                <span>{new Date(upcomingTrip.start_date).toLocaleDateString('he-IL')}</span>
                            </div>
                          </>
                      ) : <div className="text-gray-400 font-medium text-sm">אין פעילויות מתוכננות בקרוב</div>}
                  </div>
                  <div className="w-24 h-24 bg-[#E91E63]/5 rounded-full absolute -bottom-8 -left-8"></div>
              </div>

              {/* כרטיס חדר מצב */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0"><ShieldAlert size={20}/></div>
                  <div>
                      <h3 className="text-sm font-bold text-gray-800 mb-1">חדר מצב</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">אין התראות חריגות להיום. ניתן לקיים פעילות כסדרה.</p>
                  </div>
              </div>

              {/* כרטיס מזג אוויר */}
              <div className="bg-gradient-to-br from-[#00BCD4] to-cyan-600 p-6 rounded-2xl text-white shadow-lg shadow-cyan-100 flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                      <div className="text-xs font-bold opacity-80 mb-1">תחזית להיום</div>
                      <div className="text-3xl font-bold">24°C</div>
                      <div className="text-sm opacity-90">ירושלים • שמשי</div>
                  </div>
                  <Sun size={80} className="absolute -bottom-4 -left-4 text-white opacity-20"/>
              </div>
          </div>

          {/* אזור הטיולים */}
          <div className="space-y-4">
              
              {/* סרגל כלים - מותאם למובייל עם גלילה אופקית */}
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                      {['all', 'approved', 'pending', 'rejected'].map(f => {
                          const labels: any = { all: 'הכל', approved: 'אושר', pending: 'בבדיקה', rejected: 'נדחה' };
                          return (
                            <button key={f} onClick={() => setActiveFilter(f)} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none
                                ${activeFilter === f ? 'bg-white text-[#00BCD4] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {labels[f]}
                            </button>
                          )
                      })}
                  </div>

                  <div className="relative w-full md:w-64">
                      <input 
                        type="text" 
                        placeholder="חיפוש..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#00BCD4] outline-none transition-all"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  </div>
              </div>

              {/* רשימת הטיולים */}
              <div className="grid grid-cols-1 gap-3">
                  {displayTrips.length === 0 ? (
                      <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                          <span className="text-gray-300 font-bold">לא נמצאו טיולים</span>
                      </div>
                  ) : displayTrips.map(trip => (
                      <div key={trip.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#00BCD4] transition-all group flex flex-col md:flex-row items-center gap-4">
                          
                          {/* תאריך */}
                          <div className="flex flex-row md:flex-col items-center justify-center bg-gray-50 rounded-xl px-4 py-2 w-full md:w-20 md:h-20 shrink-0 gap-2 md:gap-0 border border-gray-100">
                              <span className="text-xl font-bold text-gray-800">{trip.start_date.split('-')[2]}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(trip.start_date).toLocaleString('en-US', { month: 'short' })}</span>
                          </div>

                          {/* פרטים */}
                          <div className="flex-1 w-full text-center md:text-right">
                              <div className="flex justify-center md:justify-start items-center gap-2 mb-1">
                                  {getStatusBadge(trip.status)}
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{trip.details.tripType}</span>
                              </div>
                              <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#00BCD4] transition-colors">{trip.name}</h3>
                              <div className="flex justify-center md:justify-start items-center gap-3 text-xs font-medium text-gray-500 mt-1">
                                  <span className="flex items-center gap-1"><MapPin size={12}/> {trip.details.timeline?.[0]?.finalLocation || 'מיקום לא הוגדר'}</span>
                                  <span className="text-gray-300">•</span>
                                  <span>{getHebrewDateSimple(trip.start_date)}</span>
                              </div>
                          </div>

                          {/* כפתור פעולה */}
                          <div className="w-full md:w-auto">
                              <Link href={`/dashboard/trip/${trip.id}`}>
                                <Button variant="ghost" className="w-full md:w-auto bg-gray-50 hover:bg-[#E0F7FA] text-[#00BCD4] rounded-xl h-10 px-4" icon={<ArrowRight size={18}/>}>
                                    פרטים
                                </Button>
                              </Link>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </>
  )
}