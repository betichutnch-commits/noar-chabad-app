"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Loader2, Search, MapPin, ShieldAlert, Sun, Trash2, Calendar
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TripCard } from '@/components/TripCard' 
import { formatHebrewDate } from '@/lib/dateUtils'
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter'
import { Modal } from '@/components/ui/Modal'

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // מודל גלובלי - הגדרת ברירת מחדל
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined,
      confirmText: 'אישור',
      cancelText: 'ביטול'
  });

  // מודל מיוחד לביטול (כי צריך שדה טקסט)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTripId, setCancelTripId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filterOptions = [
      { id: "טיול מחוץ לסניף", label: "טיול מחוץ לסניף", color: "bg-[#4DD0E1]" },
      { id: "כנס/אירוע מחוץ לסניף", label: "כנס/אירוע חוץ", color: "bg-[#BA68C8]" },
      { id: "פעילות לא שגרתית בסניף", label: "פעילות בסניף", color: "bg-[#81C784]" },
      { id: "יציאה רגלית באזור הסניף", label: "יציאה רגלית", color: "bg-[#FFB74D]" },
      { id: "אחר", label: "אחר", color: "bg-slate-400" }
  ];

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

  const handleDeleteDraftClick = (id: string) => {
      setModal({
          isOpen: true,
          type: 'confirm',
          title: 'מחיקת טיוטה',
          message: 'האם למחוק את הטיוטה לצמיתות?\nלא ניתן לשחזר פעולה זו.',
          confirmText: 'מחק טיוטה',
          cancelText: 'ביטול',
          onConfirm: () => executeDeleteDraft(id)
      });
  };

  const executeDeleteDraft = async (id: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (!error) {
          setTrips(prev => prev.filter(t => t.id !== id));
          setModal(prev => ({...prev, isOpen: false}));
      } else {
          // תיקון: הוספת כל השדות החסרים
          setModal({
              isOpen: true,
              type: 'error',
              title: 'שגיאה',
              message: 'שגיאה במחיקה: ' + error.message,
              confirmText: 'סגור',
              cancelText: '',
              onConfirm: undefined
          });
      }
  };

  const handleCancelClick = (id: string) => {
      setCancelTripId(id);
      setCancelReason('');
      setShowCancelModal(true);
  };

  const handleCancelTrip = async () => {
      if (!cancelTripId || !cancelReason.trim()) return;
      try {
          const trip = trips.find(t => t.id === cancelTripId);
          const updatedDetails = { ...trip.details, cancellationReason: cancelReason };
          const { error } = await supabase.from('trips').update({
              status: 'cancelled',
              cancellation_reason: cancelReason, 
              details: updatedDetails
          }).eq('id', cancelTripId);
          
          if (error) throw error;
          setTrips(prev => prev.map(t => t.id === cancelTripId ? {...t, status: 'cancelled', cancellation_reason: cancelReason, details: updatedDetails} : t));
          setShowCancelModal(false);
          
          // תיקון: הוספת כל השדות החסרים
          setModal({
              isOpen: true,
              type: 'success',
              title: 'הפעילות בוטלה',
              message: 'הסטטוס עודכן והודעה נשלחה לגורמים הרלוונטיים.',
              confirmText: 'אישור',
              cancelText: '',
              onConfirm: undefined
          });

      } catch (e: any) { 
          // תיקון: הוספת כל השדות החסרים
          setModal({
              isOpen: true,
              type: 'error',
              title: 'שגיאה',
              message: 'שגיאה בביטול: ' + e.message,
              confirmText: 'סגור',
              cancelText: '',
              onConfirm: undefined
          });
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcomingTrip = trips
    .filter(t => t.start_date >= today && t.status !== 'rejected' && t.status !== 'cancelled' && t.status !== 'draft')
    .sort((a,b) => a.start_date.localeCompare(b.start_date))[0];

  const displayTrips = trips.filter(t => {
      if (t.status === 'cancelled') return false; 
      
      const matchesStatus = activeFilter === 'all' ? true : t.status === activeFilter;
      const matchesType = selectedTypes.length === 0 ? true : selectedTypes.includes(t.details?.tripType);
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
  });

  const SafetyCard = () => (
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden h-full">
          <div className="absolute top-0 left-0 bg-red-500 text-white text-[9px] px-2 py-1 rounded-br-lg z-20 font-bold shadow-sm">אופציונלי - דורש תכנות</div>
          <div className="flex items-center gap-3 mb-3 relative z-10 pt-2">
              <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0 shadow-sm"><ShieldAlert size={20}/></div>
              <h3 className="text-base font-bold text-gray-800">חדר מצב</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed relative z-10">אין התראות חריגות להיום.<br/><span className="text-green-600 font-bold">ניתן לקיים פעילות כסדרה.</span></p>
          <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
      </div>
  );

  const WeatherCard = () => (
      <div className="bg-gradient-to-br from-[#00BCD4] to-cyan-600 p-6 rounded-3xl text-white shadow-lg shadow-cyan-100/50 flex flex-col justify-between relative overflow-hidden h-full min-h-[140px]">
          <div className="absolute top-0 left-0 bg-red-500 text-white text-[9px] px-2 py-1 rounded-br-lg z-20 font-bold shadow-sm">אופציונלי - דורש תכנות</div>
          <div className="relative z-10 pt-2">
              <div className="flex justify-between items-start"><div className="text-xs font-bold opacity-80 mb-1">תחזית להיום</div><MapPin size={16} className="opacity-60"/></div>
              <div className="flex items-end gap-2 mt-2"><div className="text-4xl font-black">24°</div><div className="text-sm font-medium opacity-90 mb-1.5">ירושלים</div></div>
              <div className="text-sm opacity-80 mt-1">שמשי ונעים</div>
          </div>
          <Sun size={100} className="absolute -bottom-6 -left-6 text-white opacity-10 rotate-12"/>
      </div>
  );

  return (
    <>
      <Header title="לוח בקרה" />
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText} 
      />

      {showCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28}/></div>
                  <h3 className="text-lg font-black text-gray-800 mb-2">ביטול פעילות</h3>
                  <p className="text-sm text-gray-500 mb-4 font-medium leading-relaxed">האם את/ה בטוח/ה שברצונך לבטל את הפעילות? <br/>פעולה זו תעדכן את מחלקת המפעלים והבטיחות.</p>
                  <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-4 outline-none focus:border-red-400 min-h-[80px]" placeholder="נא לפרט את סיבת הביטול..." value={cancelReason} onChange={e => setCancelReason(e.target.value)}></textarea>
                  <div className="flex gap-2"><button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">חזרה</button><button onClick={handleCancelTrip} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 transition-colors">אשר ביטול</button></div>
              </div>
          </div>
      )}

      <div className="p-4 md:p-8 space-y-6 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all h-full md:col-span-1">
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2"><div className="text-xs font-bold text-gray-400 uppercase tracking-widest">הפעילות הבאה</div>{upcomingTrip && <div className="bg-cyan-50 text-[#00BCD4] px-2 py-1 rounded-lg text-[10px] font-bold">בקרוב</div>}</div>
                      {upcomingTrip ? (<><h3 className="text-xl font-black text-gray-800 truncate mb-1 leading-tight">{upcomingTrip.name}</h3><div className="flex items-center gap-2 text-sm text-gray-500 font-bold mt-2"><Calendar size={16} className="text-[#E91E63]"/><span>{formatHebrewDate(upcomingTrip.start_date)}</span></div></>) : (<div className="flex flex-col items-center justify-center py-4 text-center"><span className="text-gray-300 mb-2">--</span><div className="text-gray-400 font-medium text-sm">אין פעילויות מתוכננות בקרוב</div></div>)}
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
                          return (<button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${isActive ? 'bg-[#00BCD4] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{labels[f]}</button>)
                      })}
                  </div>

                  <div className="flex flex-col-reverse md:flex-row gap-2 w-full md:w-auto">
                      <MultiSelectFilter 
                        options={filterOptions}
                        selected={selectedTypes}
                        onChange={setSelectedTypes}
                      />
                      <div className="relative flex-1 md:w-64">
                          <input type="text" placeholder="חיפוש לפי שם..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-[#00BCD4] outline-none transition-all shadow-sm focus:ring-4 focus:ring-cyan-50"/>
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {displayTrips.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3"><Search size={24} className="text-gray-300"/></div><span className="text-gray-400 font-bold">לא נמצאו פעילויות תואמות</span></div>
                  ) : displayTrips.map(trip => (
                      <TripCard 
                          key={trip.id} 
                          trip={trip} 
                          onDeleteDraft={() => handleDeleteDraftClick(trip.id)}
                          onCancelTrip={() => handleCancelClick(trip.id)}
                      />
                  ))}
              </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:hidden mt-8 border-t border-gray-100 pt-8"><div className="h-[140px]"><SafetyCard /></div><div className="h-[160px]"><WeatherCard /></div></div>
      </div>
    </>
  )
}