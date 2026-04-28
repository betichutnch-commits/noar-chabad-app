"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Loader2, Trash2, RotateCcw, FileEdit } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Modal } from '@/components/ui/Modal'

// ייבוא Hook ו-Zod
import { useUser } from '@/hooks/useUser'
import { cancellationSchema, staffSchema } from '@/lib/schemas'
import { normalizeTripStatus } from '@/lib/tripStatus'
import type { TripRecord } from '@/lib/types'

type TripState = TripRecord & {
  details: Record<string, unknown>;
  cancellation_reason?: string;
  dept_review_notes?: string | null;
  dept_reviewed_at?: string | null;
};

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  // 1. שימוש ב-Hook
  const { user, profile, loading: userLoading } = useUser('/');

  const [trip, setTrip] = useState<TripState | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [newStaffData, setNewStaffData] = useState({ name: '', idNumber: '', phone: '', email: '', role: '' });
  
  // מודל לביטול טיול
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ניהול המודל הגלובלי
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined,
      confirmText: 'אישור',
      cancelText: 'ביטול'
  });

  const showAlert = (type: 'success' | 'error' | 'info' | 'confirm', title: string, message: string, onConfirm?: () => void) => {
      setModal({ 
          isOpen: true, 
          type, 
          title, 
          message, 
          onConfirm,
          confirmText: type === 'confirm' ? 'אישור' : 'סגור',
          cancelText: type === 'confirm' ? 'ביטול' : ''
      });
  };

  // 2. טעינת הטיול
  useEffect(() => {
    const fetchTrip = async () => {
      if (!user) return;

      const { data: tripData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error || !tripData) { 
          router.push('/dashboard'); 
          return; 
      }
      
      setTrip({ ...tripData, details: (tripData.details as Record<string, unknown>) || {} } as TripState);
      setTripLoading(false);
    };

    if (!userLoading && user) {
        fetchTrip();
    }
  }, [params.id, router, user, userLoading]);

  // לוגיקת הרשאות
  const isOwner = user?.id === trip?.user_id;
  const isHQ = (profile?.role === 'safety_admin' || profile?.role === 'dept_staff' || profile?.role === 'admin' || trip?.branch === 'מטה');
  const canManage = isOwner || isHQ;
  const canManageStaff = isHQ;

  // --- פונקציות לביטול טיול ---
  const handleCancelClick = () => {
      setCancelReason('');
      setShowCancelModal(true);
  };

  const executeCancelTrip = async () => {
      if (!cancelReason || !trip) return;

      // 3. ולידציה עם Zod (ביטול)
      const validation = cancellationSchema.safeParse({ reason: cancelReason });
      if (!validation.success) {
          showAlert('error', 'חסר פירוט', validation.error.issues[0].message);
          return;
      }
      
      try {
          const updatedDetails = { ...trip.details, cancellationReason: cancelReason };
          
          const res = await fetch(`/api/trips/${trip.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: cancelReason }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || 'שגיאה בביטול');
          
          setTrip({ ...trip, status: 'cancelled', cancellation_reason: cancelReason, details: updatedDetails });
          setShowCancelModal(false);
          
          showAlert('success', 'הפעילות בוטלה', 'הסטטוס עודכן והודעה נשלחה לגורמים הרלוונטיים.');

      } catch (e: unknown) { 
          const message = e instanceof Error ? e.message : 'שגיאה לא ידועה';
          showAlert('error', 'שגיאה', 'שגיאה בביטול: ' + message);
      }
  };

  // --- פונקציות ניהול צוות וטיול ---
  const handleDeleteSecondaryStaff = async () => {
      if (!canManageStaff || !trip) return;
      
      showAlert('confirm', 'מחיקת איש צוות', 'האם את/ה בטוח/ה שברצונך להסיר את איש הצוות?', async () => {
          const updatedDetails = { ...trip.details };
          delete updatedDetails.secondaryStaffObj;
          const res = await fetch(`/api/trips/${trip.id}/secondary-staff`, { method: 'DELETE' });
          const payload = await res.json();
          if (res.ok) { 
              setTrip({ ...trip, details: updatedDetails }); 
              setIsAddingStaff(false); 
          } else {
              showAlert('error', 'שגיאה', payload.error || 'לא ניתן היה למחוק את איש הצוות');
          }
      });
  };

  const handleEditSecondaryStaff = () => { 
      if (canManageStaff && trip && trip.details?.secondaryStaffObj) { 
          setNewStaffData(trip.details.secondaryStaffObj as { name: string; idNumber: string; phone: string; email: string; role: string }); 
          setIsAddingStaff(true); 
      } 
  };

  const handleSaveSecondaryStaff = async () => {
      if (!canManageStaff || !trip) return;

      // 4. ולידציה עם Zod (איש צוות)
      const validation = staffSchema.safeParse(newStaffData);
      if (!validation.success) {
          showAlert('error', 'נתונים שגויים', validation.error.issues[0].message);
          return;
      }
      
      setIsVerifying(true);
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, official_name, last_name')
        .eq('identity_number', newStaffData.idNumber)
        .single();
      
      if (checkError || !existingUser) { 
          showAlert('error', 'משתמש לא נמצא', 'תעודת הזהות אינה קיימת במערכת.\nניתן להוסיף רק משתמשים רשומים.'); 
          setIsVerifying(false); 
          return; 
      }
      
      const updatedDetails = { 
          ...trip.details, 
          secondaryStaffObj: { 
              ...newStaffData, 
              userId: existingUser.id, 
              verifiedName: `${existingUser.official_name} ${existingUser.last_name}` 
          } 
      };
      
      const res = await fetch(`/api/trips/${trip.id}/secondary-staff`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStaffData),
      });
      const payload = await res.json();
      if (res.ok) {
          setTrip({ ...trip, details: updatedDetails }); 
          setIsAddingStaff(false); 
          setNewStaffData({ name: '', idNumber: '', phone: '', email: '', role: '' }); 
          showAlert('success', 'הוספה בוצעה', 'איש הצוות נוסף בהצלחה!');
      } else {
          showAlert('error', 'שגיאה', payload.error || 'אירעה שגיאה בשמירה');
      }
      setIsVerifying(false);
  };

  const handleEditTrip = () => {
      if (!canManage || !trip) return;
      if (trip.status === 'draft') { 
          router.push(`/dashboard/new-trip?id=${trip.id}`); 
          return; 
      }
      
      showAlert('confirm', 'עריכת טיול פעיל', 'הטיול כבר נשלח. עריכה תחזיר אותו לסטטוס "ממתין" ותצריך אישור מחדש.\nהאם להמשיך?', () => {
          router.push(`/dashboard/new-trip?id=${trip.id}`);
      });
  };

  // בדיקת טעינה משולבת
  if (userLoading || tripLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>;
  if (!trip) return null;

  return (
    <>
      <Header title="פרטי פעילות" />
      
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
                      <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200">חזרה</button>
                      <button onClick={executeCancelTrip} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 shadow-lg shadow-red-100">אשר ביטול</button>
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 md:p-8 pb-32 animate-fadeIn space-y-4">
          {normalizeTripStatus(trip.status) === 'returned_for_changes' && trip.dept_review_notes && isOwner && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <RotateCcw size={20}/>
                </div>
                <div className="flex-1">
                    <div className="text-sm font-black text-orange-800 mb-1">הבקשה הוחזרה להערות</div>
                    <p className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">{trip.dept_review_notes}</p>
                    {trip.dept_reviewed_at && (
                        <div className="text-[11px] text-orange-700 mt-2">
                            התקבל ב-{new Date(trip.dept_reviewed_at).toLocaleString('he-IL')}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => router.push(`/dashboard/new-trip?id=${trip.id}`)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 self-start md:self-center shrink-0"
                >
                    <FileEdit size={16}/> ערוך והגש מחדש
                </button>
            </div>
          )}

          <TripDetailsView 
            trip={trip} 
            profile={profile}
            isEditable={canManage}
            isPublic={false}
            onBack={() => router.back()}
            onEditTrip={handleEditTrip}
            onEditStaff={handleEditSecondaryStaff}
            onDeleteStaff={handleDeleteSecondaryStaff}
            onSaveStaff={handleSaveSecondaryStaff}
            onCancelTrip={handleCancelClick}
            isAddingStaff={isAddingStaff}
            setIsAddingStaff={setIsAddingStaff}
            newStaffData={newStaffData}
            setNewStaffData={setNewStaffData}
            isVerifying={isVerifying}
          />
      </div>
    </>
  )
}