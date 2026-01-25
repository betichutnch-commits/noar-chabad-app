"use client"

import React, { useState, useEffect, use } from 'react' // הוספתי את use
import { createClient } from '@supabase/supabase-js'
import { ArrowRight, Calendar, MapPin, CheckCircle, XCircle, Clock, AlertTriangle, Link as LinkIcon, User, FileText, Check, X } from 'lucide-react'

import { supabase } from '@/lib/supabaseClient'

// הגדרת הטיפוסים החדשה (Promise)
export default function ManagerTripView({ params }: { params: Promise<{ id: string }> }) {
  // --- התיקון הקריטי: "פתיחת" הפרמטרים באמצעות use ---
  const { id } = use(params); 
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      // משתמשים ב-id שכבר חילצנו למעלה
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error(error);
        alert('שגיאה בטעינת הטיול');
        return;
      }
      setTrip(data);
      setLoading(false);
    };
    
    if (id) {
        fetchTrip();
    }
  }, [id]); // התלות היא ב-id המחולץ

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
      if (!confirm(`האם אתה בטוח שברצונך ${newStatus === 'approved' ? 'לאשר' : 'לדחות'} את הטיול?`)) return;
      
      setProcessing(true);
      const { error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', trip.id);

      if (error) {
          alert('שגיאה בעדכון הסטטוס');
      } else {
          setTrip({ ...trip, status: newStatus });
          alert(newStatus === 'approved' ? 'הטיול אושר בהצלחה!' : 'הטיול נדחה.');
      }
      setProcessing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#00BCD4] rounded-full"></div></div>;

  const details = trip.details || {};
  const timeline = details.timeline || [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-800 pb-20" dir="rtl">
      <header className="bg-[#212121] text-white shadow-md sticky top-0 z-30 border-b-4 border-[#00BCD4]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="hover:bg-white/10 p-2 rounded-full transition-colors"><ArrowRight size={20} /></button>
            <div>
                <h1 className="font-bold text-lg">{trip.name}</h1>
                <p className="text-xs text-gray-400">רכז: {trip.coordinator_name} | סניף: {trip.branch}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 
            ${trip.status === 'approved' ? 'bg-green-500 text-white' : trip.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
            {trip.status === 'approved' ? <CheckCircle size={14}/> : trip.status === 'rejected' ? <XCircle size={14}/> : <Clock size={14}/>}
            {trip.status === 'approved' ? 'מאושר' : trip.status === 'rejected' ? 'נדחה' : 'ממתין לאישור'}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-800"><FileText size={20} className="text-[#00BCD4]"/> פרטי הבקשה</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div><span className="text-xs font-bold text-gray-400 block mb-1">תאריכים</span><div className="font-bold text-sm">{details.startDate} - {details.endDate}</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">משתתפים</span><div className="font-bold text-sm">{details.totalTravelers} (מתוכם {details.chanichimCount} חניכים)</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">גילאים</span><div className="font-bold text-sm">{details.gradeFrom} - {details.gradeTo}</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">מחלקת</span><div className="font-bold text-sm">{trip.department || 'כללי'}</div></div>
            </div>
            
            {details.generalComments && (
                <div className="mt-4 pt-4 border-t">
                    <span className="text-xs font-bold text-gray-400 block mb-1">הערות רכז:</span>
                    <p className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-gray-700">{details.generalComments}</p>
                </div>
            )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-black text-gray-800">פירוט הפעילות והאישורים</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
             {timeline.length === 0 && <div className="p-10 text-center text-gray-400">אין פעילויות מוזנות</div>}
             {timeline.map((item: any, idx: number) => {
                 const isMissing = item.requiresLicense && !item.files;
                 return (
                   <div key={idx} className={`p-5 transition-colors ${isMissing ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-start gap-4">
                         <div className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-sm min-w-[60px] text-center mt-1 border border-gray-200">
                             {item.date ? item.date.split('-').slice(1).reverse().join('/') : '?'}
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                               <div>
                                   <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                       {item.finalSubCategory}
                                       {item.requiresLicense && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">דורש רישוי</span>}
                                   </h4>
                                   <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                      <span className="flex items-center gap-1"><MapPin size={14} className="text-[#00BCD4]"/> {item.finalLocation}</span>
                                      <span className="text-gray-400">| {item.category}</span>
                                   </div>
                               </div>
                               {item.requiresLicense && (
                                   <div className="flex-shrink-0">
                                       {item.files ? (
                                           <a href={item.files.url} target="_blank" className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                                               <LinkIcon size={14}/> צפה ברישיון
                                           </a>
                                       ) : (
                                           <div className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                               <AlertTriangle size={14}/> חסר קובץ!
                                           </div>
                                       )}
                                   </div>
                               )}
                            </div>
                            {item.details && <div className="mt-3 text-sm text-gray-600 bg-white p-2.5 rounded border border-gray-100">{item.details}</div>}
                         </div>
                      </div>
                   </div>
                 )
             })}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
         <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
                פעולות ניהול עבור טיול #{trip.id}
            </div>
            <div className="flex gap-3">
                <button onClick={() => handleStatusUpdate('rejected')} disabled={processing} className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                    <X size={18}/> דחה טיול
                </button>
                <button onClick={() => handleStatusUpdate('approved')} disabled={processing} className="px-8 py-2.5 rounded-xl bg-[#00BCD4] text-white font-bold hover:bg-[#00ACC1] shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                    {processing ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full"></div> : <Check size={18}/>}
                    אשר טיול לביצוע
                </button>
            </div>
         </div>
      </div>
    </div>
  )
}