"use client"

import React, { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Check, X, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

// ייבוא Hook
import { useUser } from '@/hooks/useUser'

export default function ManagerTripView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // 1. שימוש ב-Hook
  const { user, profile, loading: userLoading } = useUser('/');

  const [trip, setTrip] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null); // פרופיל של מי שיצר את הטיול
  const [dataLoading, setDataLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // מודל גלובלי
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string, onConfirm?: () => void) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm });

  // 2. טעינת הנתונים
  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;

        // בדיקת הרשאות (רק למנהלים)
        const isManager = profile?.role === 'admin' || profile?.role === 'safety_admin' || user.user_metadata?.department === 'בטיחות ומפעלים';
        
        if (profile && !isManager) {
             router.push('/dashboard');
             return;
        }

        const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', id).single();
        if (error || !tripData) { 
            router.push('/manager/approvals'); 
            return; 
        }
        setTrip(tripData);

        if (tripData?.user_id) {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', tripData.user_id).single();
            setOwnerProfile(profileData);
        }
        setDataLoading(false);
    };
    
    if (!userLoading && user) {
        fetchData();
    }
  }, [id, router, user, userLoading, profile]);

  const handleStatusUpdate = (newStatus: 'approved' | 'rejected') => {
      showModal(
          'confirm', 
          newStatus === 'approved' ? 'אישור טיול' : 'דחיית טיול',
          `האם אתה בטוח שברצונך ${newStatus === 'approved' ? 'לאשר' : 'לדחות'} את הטיול?\nפעולה זו תשלח עדכון לרכז.`,
          async () => {
              setProcessing(true);
              const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', trip.id);

              if (error) {
                  showModal('error', 'שגיאה', 'שגיאה בעדכון הסטטוס');
              } else {
                  // שליחת התראה
                  await supabase.from('notifications').insert({
                      user_id: trip.user_id,
                      title: newStatus === 'approved' ? 'הטיול אושר!' : 'הטיול נדחה',
                      message: newStatus === 'approved' ? `הטיול "${trip.name}" אושר בהצלחה.` : `הטיול "${trip.name}" נדחה. היכנס לפרטים לבירור.`,
                      link: `/dashboard/trip/${trip.id}`,
                      type: newStatus === 'approved' ? 'success' : 'error'
                  });

                  setTrip({ ...trip, status: newStatus });
                  showModal('success', 'בוצע', newStatus === 'approved' ? 'הטיול אושר בהצלחה!' : 'הטיול נדחה.');
              }
              setProcessing(false);
          }
      );
  };

  // בדיקת טעינה משולבת
  if (userLoading || dataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-800 pb-32" dir="rtl">
      
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm} 
      />

      <header className="bg-[#263238] text-white shadow-md sticky top-0 z-30 border-b-4 border-[#00BCD4]">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-full transition-colors"><ArrowRight size={20} /></button>
            <div>
                <h1 className="font-bold text-lg">{trip.name}</h1>
                <p className="text-xs text-gray-400">אישור ובקרה • {trip.branch}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <TripDetailsView 
            trip={trip}
            profile={ownerProfile}
            isEditable={false} 
            isPublic={false}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 font-bold hidden md:block">
                ניהול סטטוס עבור טיול #{trip.id.substring(0,8)}...
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <Button 
                    variant="danger" 
                    onClick={() => handleStatusUpdate('rejected')} 
                    isLoading={processing}
                    icon={<X size={18}/>}
                    className="flex-1 md:w-auto h-12"
                >
                    דחה טיול
                </Button>
                
                <Button 
                    variant="primary" 
                    onClick={() => handleStatusUpdate('approved')} 
                    isLoading={processing}
                    icon={<Check size={18}/>}
                    className="flex-1 md:w-auto h-12"
                >
                    אשר טיול
                </Button>
            </div>
         </div>
      </div>
    </div>
  )
}