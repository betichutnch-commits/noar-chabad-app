"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'

export default function PublicTripPage() {
  const params = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      // שליפה ציבורית ללא בדיקת הרשאות (מסתמך על ה-RLS הציבורי שיצרנו ב-Supabase)
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
      <div className="h-screen flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-2xl font-black text-gray-800 mb-2">הטיול לא נמצא</h1>
          <p className="text-gray-500">ייתכן שהקישור שגוי או שהטיול הוסר.</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-32 font-sans" dir="rtl">
        <div className="flex justify-center mb-6">
            {/* אפשר לשים פה לוגו אם תרצה */}
            <div className="text-gray-400 font-bold text-sm">מערכת תיאום טיולים</div>
        </div>
        
        {/* שימוש ברכיב המשותף במצב קריאה בלבד */}
        <TripDetailsView 
            trip={trip}
            isEditable={false} // אין עריכה
            isPublic={true}    // מסתיר מידע רגיש
        />
    </div>
  );
}