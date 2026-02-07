"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'

export default function SharedTripPage() {
  const params = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null); // State לפרופיל היוצר
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      try {
          // 1. שליפת הטיול
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('*') // שולף הכל כולל user_id
            .eq('id', params.id)
            .single();

          if (tripError || !tripData) {
            setError('הטיול לא נמצא או שהוסר.');
            setLoading(false);
            return;
          }

          setTrip(tripData);

          // 2. שליפת הפרופיל של היוצר (כדי להשלים פרטים חסרים כמו טלפון/סניף)
          if (tripData.user_id) {
              const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', tripData.user_id)
                  .single();
              
              if (profileData) {
                  setCreatorProfile(profileData);
              }
          }

      } catch (err) {
          console.error(err);
          setError('שגיאה בטעינת הנתונים');
      } finally {
          setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  if (error || !trip) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 text-center">
              <AlertCircle size={48} className="text-gray-300 mb-4"/>
              <h1 className="text-xl font-bold text-gray-800">שגיאה</h1>
              <p className="text-gray-500">{error || 'הטיול לא נמצא'}</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dir-rtl font-sans pb-12">
        {/* Header ציבורי */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center justify-center px-4 mb-6">
             <div className="relative h-8 w-32 opacity-90">
                 <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    fill 
                    className="object-contain"
                    priority
                 />
             </div>
        </header>

        <div className="px-4 md:px-8 max-w-5xl mx-auto">
            <TripDetailsView 
                trip={trip}
                profile={creatorProfile} // העברת הפרופיל שנשלף
                isEditable={false}
                isPublic={true}
                onBack={() => {}}
            />
        </div>

        <footer className="mt-12 text-center text-xs text-gray-400 font-medium pb-8">
            © ארגון נוער חב"ד | מערכת הטיולים
        </footer>
    </div>
  );
}