"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Loader2, Clock, CheckCircle, Search, 
  MapPin, ShieldAlert, Sun, ArrowRight, Calendar,
  Tent, Ticket, Layers, Timer, AlertTriangle, FileEdit, Trash2, XCircle, HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ייבוא פונקציות תאריך ועזר מ-lib
import { 
    formatHebrewDate, formatFullGregorianDate, 
    getMonthNameHebrew, toHebrewDay, formatHebrewYear 
} from '@/lib/dateUtils'

// פונקציות עיצוב מקומיות
const getRibbonColor = (type: string) => {
    if (!type) return 'bg-gray-500';
    if (type.includes('סמינר')) return 'bg-purple-600';
    if (type.includes('מחנה')) return 'bg-green-600';
    if (type.includes('טיול')) return 'bg-[#00BCD4]';
    return 'bg-blue-600';
};

const getStatusStyles = (status: string) => {
    const config: any = {
        approved: { text: 'מאושר', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircle },
        pending: { text: 'ממתין לבדיקה', bg: 'bg-amber-100', textCol: 'text-amber-700', icon: Clock },
        rejected: { text: 'לא אושר', bg: 'bg-red-100', textCol: 'text-red-700', icon: AlertTriangle },
        draft: { text: 'טיוטה', bg: 'bg-gray-100', textCol: 'text-gray-600', icon: FileEdit },
        cancelled: { text: 'בוטל', bg: 'bg-stone-100', textCol: 'text-stone-500', icon: XCircle }
    };
    return config[status] || config.pending;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // מודלים
  const [cancelModal, setCancelModal] = useState<{show: boolean, tripId: string | null}>({show: false, tripId: null});
  const [deleteDraftModal, setDeleteDraftModal] = useState<{show: boolean, tripId: string | null}>({show: false, tripId: null});
  const [cancelReason, setCancelReason] = useState('');

  const fetchTrips = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/'; return; }
      
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

  useEffect(() => {
    fetchTrips();
  }, []);

  const confirmDeleteDraft = async () => {
      if (!deleteDraftModal.tripId) return;
      const id = deleteDraftModal.tripId;
      
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (!error) {
          setTrips(prev => prev.filter(t => t.id !== id));
          setDeleteDraftModal({show: false, tripId: null});
      } else {
          alert('שגיאה במחיקה');
      }
  };

  const handleEditDraft = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/dashboard/new-trip?id=${id}`);
  };

  const handleCancelTrip = async () => {
      if (!cancelModal.tripId || !cancelReason.trim()) return;
      
      try {
          const trip = trips.find(t => t.id === cancelModal.tripId);
          const updatedDetails = { 
              ...trip.details, 
              cancellationReason: cancelReason 
          };

          const { error } = await supabase.from('trips').update({
              status: 'cancelled',
              cancellation_reason: cancelReason, 
              details: updatedDetails
          }).eq('id', cancelModal.tripId);
          
          if (error) throw error;
          
          setTrips(prev => prev.map(t => t.id === cancelModal.tripId ? {...t, status: 'cancelled', cancellation_reason: cancelReason, details: updatedDetails} : t));
          setCancelModal({show: false, tripId: null});
          setCancelReason('');
      } catch (e: any) {
          alert('שגיאה בביטול: ' + e.message);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcomingTrip = trips
    .filter(t => t.start_date >= today && t.status !== 'rejected' && t.status !== 'cancelled' && t.status !== 'draft')
    .sort((a,b) => a.start_date.localeCompare(b.start_date))[0];

  const displayTrips = trips.filter(t => {
      // מסננים מבוטלים מהדף הראשי
      if (t.status === 'cancelled') return false; 

      const matchesFilter = activeFilter === 'all' ? true : t.status === activeFilter;
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
  });

  const SafetyCard = () => (
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden h-full">
          <div className="absolute top-0 left-0 bg-red-500 text-white text-[9px] px-2 py-1 rounded-br-lg z-20 font-bold shadow-sm">
              אופציונלי - דורש תכנות
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10 pt-2">
              <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                  <ShieldAlert size={20}/>
              </div>
              <h3 className="text-base font-bold text-gray-800">חדר מצב</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed relative z-10">
              אין התראות חריגות להיום.<br/>
              <span className="text-green-600 font-bold">ניתן לקיים פעילות כסדרה.</span>
          </p>
          <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
      </div>
  );

  const WeatherCard = () => (
      <div className="bg-gradient-to-br from-[#00BCD4] to-cyan-600 p-6 rounded-3xl text-white shadow-lg shadow-cyan-100/50 flex flex-col justify-between relative overflow-hidden h-full min-h-[140px]">
          <div className="absolute top-0 left-0 bg-red-500 text-white text-[9px] px-2 py-1 rounded-br-lg z-20 font-bold shadow-sm">
              אופציונלי - דורש תכנות
          </div>
          <div className="relative z-10 pt-2">
              <div className="flex justify-between items-start">
                  <div className="text-xs font-bold opacity-80 mb-1">תחזית להיום</div>
                  <MapPin size={16} className="opacity-60"/>
              </div>
              <div className="flex items-end gap-2 mt-2">
                  <div className="text-4xl font-black">24°</div>
                  <div className="text-sm font-medium opacity-90 mb-1.5">ירושלים</div>
              </div>
              <div className="text-sm opacity-80 mt-1">שמשי ונעים</div>
          </div>
          <Sun size={100} className="absolute -bottom-6 -left-6 text-white opacity-10 rotate-12"/>
      </div>
  );

  return (
    <>
      <Header title="לוח בקרה" />

      {/* מודל ביטול טיול */}
      {cancelModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={28}/>
                  </div>
                  <h3 className="text-lg font-black text-gray-800 mb-2">ביטול פעילות</h3>
                  <p className="text-sm text-gray-500 mb-4 font-medium leading-relaxed">
                      האם את/ה בטוח/ה שברצונך לבטל את הפעילות? <br/>
                      פעולה זו תעדכן את מחלקת המפעלים והבטיחות.
                  </p>
                  <textarea 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-4 outline-none focus:border-red-400 min-h-[80px]"
                      placeholder="נא לפרט את סיבת הביטול..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                  ></textarea>
                  <div className="flex gap-2">
                      <button onClick={() => setCancelModal({show: false, tripId: null})} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">חזרה</button>
                      <button onClick={handleCancelTrip} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 transition-colors">אשר ביטול</button>
                  </div>
              </div>
          </div>
      )}

      {/* מודל מחיקת טיוטה */}
      {deleteDraftModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center border-t-4 border-[#E91E63]">
                  <div className="w-14 h-14 bg-red-50 text-[#E91E63] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={28}/>
                  </div>
                  <h3 className="text-lg font-black text-gray-800 mb-2">מחיקת טיוטה</h3>
                  <p className="text-sm text-gray-500 mb-4 font-medium">האם למחוק את הטיוטה לצמיתות? לא ניתן לשחזר פעולה זו.</p>
                  <div className="flex gap-2">
                      <button onClick={() => setDeleteDraftModal({show: false, tripId: null})} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">ביטול</button>
                      <button onClick={confirmDeleteDraft} className="flex-1 py-2 bg-[#E91E63] text-white font-bold rounded-xl text-sm hover:bg-pink-600 transition-colors">מחק</button>
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 md:p-8 space-y-6 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* כרטיס טיול קרוב */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all h-full md:col-span-1">
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">הפעילות הבאה</div>
                        {upcomingTrip && <div className="bg-cyan-50 text-[#00BCD4] px-2 py-1 rounded-lg text-[10px] font-bold">בקרוב</div>}
                      </div>
                      
                      {upcomingTrip ? (
                          <>
                            <h3 className="text-xl font-black text-gray-800 truncate mb-1 leading-tight">{upcomingTrip.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-bold mt-2">
                                <Calendar size={16} className="text-[#E91E63]"/>
                                <span>{formatHebrewDate(upcomingTrip.start_date)}</span>
                            </div>
                          </>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                              <span className="text-gray-300 mb-2">--</span>
                              <div className="text-gray-400 font-medium text-sm">אין פעילויות מתוכננות בקרוב</div>
                          </div>
                      )}
                  </div>
                  <div className="w-32 h-32 bg-gradient-to-tr from-[#E91E63]/10 to-transparent rounded-full absolute -bottom-10 -left-10 transition-transform group-hover:scale-110"></div>
              </div>

              <div className="hidden md:block h-full"><SafetyCard /></div>
              <div className="hidden md:block h-full"><WeatherCard /></div>
          </div>

          <div className="space-y-4 pt-2">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar shadow-sm">
                      {['all', 'approved', 'pending', 'rejected', 'draft'].map(f => {
                          const labels: any = { all: 'הכל', approved: 'אושר', pending: 'בבדיקה', rejected: 'נדחה', draft: 'טיוטות' };
                          const isActive = activeFilter === f;
                          return (
                            <button key={f} onClick={() => setActiveFilter(f)} 
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none
                                ${isActive ? 'bg-[#00BCD4] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {labels[f]}
                            </button>
                          )
                      })}
                  </div>

                  <div className="relative w-full md:w-72">
                      <input 
                        type="text" 
                        placeholder="חיפוש לפי שם טיול..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-[#00BCD4] outline-none transition-all shadow-sm focus:ring-4 focus:ring-cyan-50"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                  {displayTrips.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                              <Search size={24} className="text-gray-300"/>
                          </div>
                          <span className="text-gray-400 font-bold">לא נמצאו טיולים תואמים</span>
                      </div>
                  ) : displayTrips.map(trip => {
                      const timeline = trip.details.timeline || [];
                      const statusStyle = getStatusStyles(trip.status);
                      const StatusIcon = statusStyle.icon;
                      const isDraft = trip.status === 'draft';
                      
                      const start = new Date(trip.start_date);
                      const end = new Date(trip.details.endDate || trip.start_date);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      const isMultiDay = diffDays > 1;

                      const attractions = timeline.filter((t: any) => t.category === 'attraction').map((t: any) => t.finalSubCategory || t.details).filter(Boolean);
                      const uniqueAttractions = Array.from(new Set(attractions));

                      const sleeping = timeline.filter((t: any) => t.category === 'sleeping').map((t: any) => t.finalLocation || t.otherDetail).filter(Boolean);
                      const uniqueSleeping = Array.from(new Set(sleeping));

                      const allLocations = timeline.map((t: any) => t.finalLocation).filter(Boolean);
                      const uniqueLocations = Array.from(new Set(allLocations));
                      const locationsString = uniqueLocations.length > 0 ? uniqueLocations.join(' / ') : 'מיקום לא הוגדר';

                      const stepsCount = timeline.length;

                      const tripLink = isDraft ? '#' : `/dashboard/trip/${trip.id}`;

                      return (
                      <Link key={trip.id} href={tripLink} className={isDraft ? 'cursor-default' : ''}>
                          <div className={`bg-white border ${isDraft ? 'border-dashed border-gray-300 bg-gray-50/30' : 'border-gray-100'} rounded-3xl p-5 hover:border-[#00BCD4] transition-all group flex flex-col md:flex-row items-stretch gap-5 shadow-sm hover:shadow-md relative overflow-hidden`}>
                              
                              {/* קצוות */}
                              <div className={`absolute top-0 right-0 px-6 py-1.5 text-white font-bold text-xs rounded-bl-2xl shadow-sm ${getRibbonColor(trip.details.tripType)}`}>
                                  {trip.details.tripType} {trip.details.tripType === 'אחר' && trip.details.tripTypeOther ? `- ${trip.details.tripTypeOther}` : ''}
                              </div>

                              <div className={`absolute top-0 left-0 px-4 py-1.5 rounded-br-2xl shadow-sm flex items-center gap-1.5 font-bold text-xs ${statusStyle.bg} ${statusStyle.textCol}`}>
                                  <StatusIcon size={14}/>
                                  {statusStyle.text}
                              </div>

                              {/* תאריך */}
                              <div className="flex flex-row md:flex-col items-center justify-center bg-gray-50 rounded-2xl px-6 py-4 w-full md:w-24 shrink-0 gap-3 md:gap-1 border border-gray-100 group-hover:bg-cyan-50 group-hover:text-[#00BCD4] transition-colors mt-6 md:mt-0">
                                  <span className="text-3xl font-black text-gray-800 group-hover:text-[#00BCD4] leading-none">
                                      {start.getDate()}
                                  </span>
                                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                      {getMonthNameHebrew(trip.start_date)}
                                  </span>
                              </div>

                              {/* תוכן */}
                              <div className="flex-1 flex flex-col justify-center mt-2 md:mt-0 pt-4 md:pt-0">
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2 pt-2">
                                      <h3 className="text-xl font-black text-gray-800 group-hover:text-[#00BCD4] transition-colors leading-tight max-w-[70%]">
                                          {trip.name || 'ללא שם'}
                                      </h3>
                                      <div className="flex flex-wrap gap-2 pl-2">
                                          {uniqueAttractions.length > 0 && (
                                              <div className="flex items-center gap-1 bg-pink-50 text-pink-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-pink-100 max-w-[150px]" title={uniqueAttractions.join(' / ')}>
                                                  <Ticket size={12} className="shrink-0"/>
                                                  <span className="truncate">{uniqueAttractions.join(' / ')}</span>
                                              </div>
                                          )}
                                          {uniqueSleeping.length > 0 && (
                                              <div className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-purple-100 max-w-[150px]" title={uniqueSleeping.join(' / ')}>
                                                  <Tent size={12} className="shrink-0"/>
                                                  <span className="truncate">{uniqueSleeping.join(' / ')}</span>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
                                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                          <Calendar size={14} className="text-[#E91E63]"/>
                                          <span className="font-bold">{formatHebrewDate(trip.start_date)}</span>
                                          <span className="text-gray-300">|</span>
                                          <span>{formatFullGregorianDate(trip.start_date)}</span>
                                          {isMultiDay && <span>- {formatFullGregorianDate(trip.details.endDate)}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 max-w-[200px]" title={locationsString}>
                                          <MapPin size={14} className="text-[#00BCD4] shrink-0"/>
                                          <span className="truncate">{locationsString}</span>
                                      </div>
                                      {isMultiDay && (
                                          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100 font-bold">
                                              <Timer size={14}/> {diffDays} ימים
                                          </div>
                                      )}
                                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                          <Layers size={14} className="text-gray-400"/>
                                          <span>{stepsCount} שלבים</span>
                                      </div>
                                  </div>
                              </div>

                              {/* כפתורי פעולה */}
                              <div className="w-full md:w-auto flex items-center justify-end md:justify-center mt-2 md:mt-0 gap-2">
                                    {isDraft ? (
                                        <>
                                            <button onClick={(e) => handleEditDraft(trip.id, e)} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors border border-blue-100" title="המשך עריכה">
                                                <FileEdit size={20}/>
                                            </button>
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDraftModal({show: true, tripId: trip.id}); }} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors border border-red-100" title="מחק טיוטה">
                                                <Trash2 size={20}/>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {trip.status !== 'cancelled' && (
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCancelModal({show: true, tripId: trip.id}); }} 
                                                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors border border-red-100" 
                                                    title="ביטול פעילות"
                                                >
                                                    <Trash2 size={20}/>
                                                </button>
                                            )}
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00BCD4] group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight size={20}/>
                                            </div>
                                        </>
                                    )}
                              </div>
                          </div>
                      </Link>
                  )})}
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden mt-8 border-t border-gray-100 pt-8">
              <div className="h-[140px]"><SafetyCard /></div>
              <div className="h-[160px]"><WeatherCard /></div>
          </div>

      </div>
    </>
  )
}