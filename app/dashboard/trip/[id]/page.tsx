"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Loader2, Trash2 } from 'lucide-react' // הוספתי את Trash2
import { useParams, useRouter } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Modal } from '@/components/ui/Modal'

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [newStaffData, setNewStaffData] = useState({ name: '', idNumber: '', phone: '', email: '', role: '' });
  
  // --- ניהול מודל לביטול טיול (כמו בדשבורד) ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ניהול המודל הגלובלי (להודעות רגילות)
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined,
      confirmText: 'אישור', // ברירת מחדל
      cancelText: 'ביטול'   // ברירת מחדל
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

  useEffect(() => {
    const fetchTripAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', params.id).single();
      
      if (error || !tripData) { 
          router.push('/dashboard'); 
          return; 
      }
      
      setTrip(tripData);
      
      if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData || {});
      }
      setLoading(false);
    };
    fetchTripAndProfile();
  }, [params.id, router]);

  // לוגיקת הרשאות
  const isOwner = profile?.id === trip?.user_id;
  const isHQ = (profile?.role === 'safety_admin' || profile?.role === 'dept_staff' || profile?.role === 'admin' || trip?.branch === 'מטה');
  const canManage = isOwner || isHQ;
  const canManageStaff = isHQ;

  // --- פונקציות לביטול טיול ---
  const handleCancelClick = () => {
      setCancelReason('');
      setShowCancelModal(true);
  };

  const executeCancelTrip = async () => {
      if (!cancelReason.trim()) return;
      
      try {
          const updatedDetails = { ...trip.details, cancellationReason: cancelReason };
          
          const { error } = await supabase.from('trips').update({
              status: 'cancelled',
              cancellation_reason: cancelReason, 
              details: updatedDetails
          }).eq('id', trip.id);
          
          if (error) throw error;
          
          // עדכון הסטייט המקומי
          setTrip({ ...trip, status: 'cancelled', cancellation_reason: cancelReason, details: updatedDetails });
          setShowCancelModal(false);
          
          // הודעת הצלחה
          showAlert('success', 'הפעילות בוטלה', 'הסטטוס עודכן והודעה נשלחה לגורמים הרלוונטיים.');

      } catch (e: any) { 
          showAlert('error', 'שגיאה', 'שגיאה בביטול: ' + e.message);
      }
  };

  // --- פונקציות ניהול צוות וטיול ---
  const handleDeleteSecondaryStaff = async () => {
      if (!canManageStaff) return;
      
      showAlert('confirm', 'מחיקת איש צוות', 'האם את/ה בטוח/ה שברצונך להסיר את איש הצוות?', async () => {
          const updatedDetails = { ...trip.details };
          delete updatedDetails.secondaryStaffObj;
          
          const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', trip.id);
          
          if (!error) { 
              setTrip({ ...trip, details: updatedDetails }); 
              setIsAddingStaff(false); 
          } else {
              showAlert('error', 'שגיאה', 'לא ניתן היה למחוק את איש הצוות');
          }
      });
  };

  const handleEditSecondaryStaff = () => { 
      if (canManageStaff && trip.details?.secondaryStaffObj) { 
          setNewStaffData(trip.details.secondaryStaffObj); 
          setIsAddingStaff(true); 
      } 
  };

  const handleSaveSecondaryStaff = async () => {
      if (!canManageStaff) return;
      if (!newStaffData.name.trim() || !newStaffData.idNumber.trim()) { 
          showAlert('error', 'חסרים פרטים', 'חובה למלא את כל השדות'); 
          return; 
      }
      
      setIsVerifying(true);
      const { data: existingUser, error: checkError } = await supabase.from('profiles').select('id, official_name, last_name').eq('identity_number', newStaffData.idNumber).single();
      
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
      
      const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', trip.id);
      
      if (!error) {
          // שליחת התראה למשתמש שצוות
          await supabase.from('notifications').insert({ 
              user_id: existingUser.id, 
              title: 'שיבוץ לטיול', 
              message: `שובצת לטיול: ${trip.name}`, 
              link: `/dashboard/trip/${trip.id}`, 
              type: 'assignment' 
          });
          
          setTrip({ ...trip, details: updatedDetails }); 
          setIsAddingStaff(false); 
          setNewStaffData({ name: '', idNumber: '', phone: '', email: '', role: '' }); 
          showAlert('success', 'הוספה בוצעה', 'איש הצוות נוסף בהצלחה!');
      } else {
          showAlert('error', 'שגיאה', 'אירעה שגיאה בשמירה');
      }
      setIsVerifying(false);
  };

  const handleEditTrip = () => {
      if (!canManage) return;
      if (trip.status === 'draft') { 
          router.push(`/dashboard/new-trip?id=${trip.id}`); 
          return; 
      }
      
      showAlert('confirm', 'עריכת טיול פעיל', 'הטיול כבר נשלח. עריכה תחזיר אותו לסטטוס "ממתין" ותצריך אישור מחדש.\nהאם להמשיך?', () => {
          router.push(`/dashboard/new-trip?id=${trip.id}`);
      });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  if (!trip) return null;

  return (
    <>
      <Header title="פרטי פעילות" />
      
      {/* המודל הגלובלי */}
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

      {/* מודל מותאם אישית לביטול (כי צריך Textarea) - בדיוק כמו בדשבורד */}
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

      <div className="p-4 md:p-8 pb-32 animate-fadeIn">
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
            onCancelTrip={handleCancelClick} // העברת פונקציית הביטול
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