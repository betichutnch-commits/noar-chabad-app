"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Loader2, Search, History, Trash2 } from 'lucide-react' // Trash2 לשימוש במודל אם צריך
import { useRouter } from 'next/navigation'
import { TripCard } from '@/components/TripCard' 
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter'
import { Modal } from '@/components/ui/Modal' // <-- החדש

export default function MyTripsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // --- ניהול מודל מאוחד ---
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined,
      confirmText: 'אישור',
      cancelText: 'ביטול'
  });

  // State עבור סיבת ביטול (מיוחד לביטול)
  const [cancelReason, setCancelReason] = useState('');
  const [pendingTripId, setPendingTripId] = useState<string | null>(null); // שומר ID לפעולה

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

  // --- פעולת מחיקת טיוטה ---
  const handleDeleteDraftClick = (id: string) => {
      setPendingTripId(id);
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
          alert('שגיאה במחיקה: ' + error.message);
      }
  };

  // --- פעולת ביטול טיול (דורש טקסט) ---
  // מכיוון שהמודל הגלובלי לא תומך ב-Textarea, כאן נשתמש בטריק: 
  // נפתח מודל אישור, ואם מאשרים, נשתמש ב-prompt של הדפדפן או נשאיר את המודל המותאם אישית (עדיף מותאם).
  // במקרה הזה, נשאיר את המודל המותאם אישית לביטול כי הוא דורש סיבה, 
  // אבל נשתמש ב-Modal הגלובלי להודעות שגיאה/הצלחה.
  
  const [showCustomCancelModal, setShowCustomCancelModal] = useState(false);

  const handleCancelClick = (id: string) => {
      setPendingTripId(id);
      setCancelReason('');
      setShowCustomCancelModal(true);
  };

  const executeCancelTrip = async () => {
      if (!pendingTripId || !cancelReason.trim()) return;
      try {
          const trip = trips.find(t => t.id === pendingTripId);
          const updatedDetails = { ...trip.details, cancellationReason: cancelReason };
          
          const { error } = await supabase.from('trips').update({
              status: 'cancelled',
              cancellation_reason: cancelReason, 
              details: updatedDetails
          }).eq('id', pendingTripId);
          
          if (error) throw error;
          
          setTrips(prev => prev.map(t => t.id === pendingTripId ? {...t, status: 'cancelled', cancellation_reason: cancelReason, details: updatedDetails} : t));
          setShowCustomCancelModal(false);
          
          // הודעת הצלחה עם המודל הגלובלי
          setModal({
              isOpen: true,
              type: 'success',
              title: 'הפעילות בוטלה',
              message: 'הסטטוס עודכן והודעה נשלחה לגורמים הרלוונטיים.',
              onConfirm: undefined,
              confirmText: 'סגור',
              cancelText: ''
          });

      } catch (e: any) { 
          // הודעת שגיאה
          setModal({
              isOpen: true,
              type: 'error',
              title: 'שגיאה',
              message: 'לא ניתן היה לבטל את הפעילות: ' + e.message,
              onConfirm: undefined,
              confirmText: 'סגור',
              cancelText: ''
          });
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  const displayTrips = trips.filter(t => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tripDate = new Date(t.start_date);
      
      let matchesFilter = true;
      if (activeFilter === 'future') matchesFilter = tripDate >= today;
      else if (activeFilter === 'past') matchesFilter = tripDate < today;
      else if (activeFilter !== 'all') matchesFilter = t.status === activeFilter;

      const matchesType = selectedTypes.length === 0 
        ? true 
        : selectedTypes.includes(t.details?.tripType);

      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesType && matchesSearch;
  });

  return (
    <>
      <Header title="הטיולים שלי" />
      
      {/* המודל הגלובלי */}
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type as any} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />

      {/* מודל מותאם אישית לביטול (כי הוא מכיל Textarea) */}
      {showCustomCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-4 border-red-500">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">ביטול פעילות</h3>
                  <p className="text-sm text-gray-500 mb-4 font-medium leading-relaxed">האם את/ה בטוח/ה? <br/>פעולה זו תעדכן את מחלקת המפעלים.</p>
                  <textarea 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-4 outline-none focus:border-red-400 min-h-[100px] resize-none" 
                    placeholder="חובה לפרט את סיבת הביטול..." 
                    value={cancelReason} 
                    onChange={e => setCancelReason(e.target.value)}
                  ></textarea>
                  <div className="flex gap-3">
                      <button onClick={() => setShowCustomCancelModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200">חזרה</button>
                      <button onClick={executeCancelTrip} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 shadow-lg shadow-red-100">אשר ביטול</button>
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 md:p-8 space-y-6 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden md:max-w-7xl md:mx-auto">
          <div className="space-y-4 pt-2">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar shadow-sm">
                      {[
                          { id: 'all', label: 'כל הטיולים' }, { id: 'future', label: 'עתידיים' }, { id: 'past', label: 'היסטוריה' },
                          { id: 'draft', label: 'טיוטות' }, { id: 'approved', label: 'אושר' }, { id: 'pending', label: 'בבדיקה' },
                          { id: 'rejected', label: 'נדחה' }, { id: 'cancelled', label: 'בוטל' },
                      ].map(f => {
                          const isActive = activeFilter === f.id;
                          return (<button key={f.id} onClick={() => setActiveFilter(f.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${isActive ? 'bg-[#00BCD4] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{f.label}</button>)
                      })}
                  </div>

                  <div className="flex flex-col-reverse md:flex-row gap-2 w-full md:w-auto">
                      <MultiSelectFilter 
                        options={filterOptions}
                        selected={selectedTypes}
                        onChange={setSelectedTypes}
                      />
                      <div className="relative flex-1 md:w-64">
                          <input type="text" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-[#00BCD4] outline-none transition-all shadow-sm focus:ring-4 focus:ring-cyan-50"/>
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {displayTrips.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3"><History size={24} className="text-gray-300"/></div><span className="text-gray-400 font-bold">לא נמצאו פעילויות</span></div>
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
      </div>
    </>
  )
}