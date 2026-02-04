"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, Map, ShieldCheck } from 'lucide-react'
import { useParams } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'

export default function PublicTripPage() {
  const params = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!params.id) return;

      // שליפה ציבורית (מסתמך על הגדרות ה-Policies ב-Supabase)
      const { data: tripData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error || !tripData) {
        console.error(error);
        setError(true);
      } else {
        setTrip(tripData);
      }
      setLoading(false);
    };
    
    fetchTrip();
  }, [params.id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  
  if (error || !trip) return (
      <div className="h-screen flex flex-col items-center justify-center text-center p-4 bg-gray-50">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Map size={40} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">הטיול לא נמצא</h1>
          <p className="text-gray-500 max-w-xs">ייתכן שהקישור שגוי, שהטיול הוסר, או שאין לך הרשאה לצפות בו.</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-800 pb-32" dir="rtl">
        
        {/* כותרת מינימלית לדף ציבורי */}
        <header className="bg-white border-b border-gray-200 py-4 px-6 mb-6 shadow-sm flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00BCD4] rounded-lg flex items-center justify-center text-white">
                    <ShieldCheck size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">מערכת תיאום טיולים</span>
            </div>
            <div className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                צפייה ציבורית
            </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-4 md:p-6">
            {/* שימוש ברכיב המשותף במצב קריאה בלבד וציבורי */}
            <TripDetailsView 
                trip={trip}
                isEditable={false} // אין עריכה
                isPublic={true}    // מסתיר מידע רגיש (טלפונים וכו')
            />
        </main>

        <div className="text-center text-xs text-gray-400 mt-8 font-medium">
            © נוער חב"ד - הופק באמצעות מערכת הטיולים
        </div>
    </div>
  );
}