"use client"

import React, { useState, useEffect, use } from 'react' // הוספת use
import { createClient } from '@supabase/supabase-js'
import { ArrowRight, Calendar, MapPin, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Link as LinkIcon } from 'lucide-react'

const supabaseUrl = "https://ehndiifaaobawrnlcqld.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobmRpaWZhYW9iYXdybmxjcWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzY5NzAsImV4cCI6MjA4MzkxMjk3MH0.RjmlRJWHq7UXohiHPVk-Aeu34eneS5e_uBLnbA9-2X4";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TripViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // פתיחת הפרמטרים

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        alert('טיול לא נמצא');
        window.location.href = '/dashboard';
        return;
      }
      setTrip(data);
      setLoading(false);
    };
    
    if (id) fetchTrip();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[#00BCD4] rounded-full"></div></div>;

  const details = trip.details || {};
  const timeline = details.timeline || [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-800 pb-20" dir="rtl">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b-4 border-[#00BCD4]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="hover:bg-gray-100 p-2 rounded-full transition-colors"><ArrowRight size={20} /></button>
            <h1 className="font-bold text-lg">צפייה בטיול: {trip.name}</h1>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 
            ${trip.status === 'approved' ? 'bg-green-100 text-green-700' : trip.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            {trip.status === 'approved' ? <CheckCircle size={14}/> : trip.status === 'rejected' ? <XCircle size={14}/> : <Clock size={14}/>}
            {trip.status === 'approved' ? 'מאושר' : trip.status === 'rejected' ? 'נדחה' : 'ממתין לבדיקה'}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div><span className="text-xs font-bold text-gray-400 block mb-1">תאריכים</span><div className="font-bold">{details.startDate} - {details.endDate}</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">משתתפים</span><div className="font-bold">{details.totalTravelers} (מתוכם {details.chanichimCount} חניכים)</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">גילאים</span><div className="font-bold">{details.gradeFrom} - {details.gradeTo}</div></div>
              <div><span className="text-xs font-bold text-gray-400 block mb-1">סטטוס</span><div className="font-bold">{trip.status === 'pending' ? 'ממתין לאישור' : trip.status === 'approved' ? 'אושר לביצוע' : 'לא אושר'}</div></div>
            </div>
            {details.generalComments && <div className="mt-4 pt-4 border-t"><span className="text-xs font-bold text-gray-400 block mb-1">הערות כלליות</span><p className="text-sm">{details.generalComments}</p></div>}
        </div>

        <section>
          <h3 className="text-xl font-black text-gray-800 mb-4">לו"ז ופעילויות</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
             {timeline.map((item: any, idx: number) => (
                   <div key={idx} className="p-5">
                      <div className="flex items-start gap-4">
                         <div className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-sm min-w-[60px] text-center mt-1">{item.date?.split('-').slice(1).reverse().join('/')}</div>
                         <div className="flex-1">
                            <div className="flex justify-between">
                               <h4 className="font-bold text-gray-900 text-lg">{item.finalSubCategory}</h4>
                               {item.requiresLicense && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">דורש רישוי</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                               <span className="flex items-center gap-1"><MapPin size={14} className="text-[#00BCD4]"/> {item.finalLocation}</span>
                               <span className="text-gray-400">{item.category}</span>
                            </div>
                            {item.details && <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{item.details}</div>}
                            {item.files && (
                              <a href={item.files.url} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#00BCD4] hover:underline">
                                <LinkIcon size={12}/> צפייה בקובץ מצורף ({item.files.name})
                              </a>
                            )}
                         </div>
                      </div>
                   </div>
             ))}
          </div>
        </section>
      </main>
    </div>
  )
}