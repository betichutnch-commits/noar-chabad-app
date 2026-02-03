"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'

// --- Custom Alert ---
const CustomAlert = ({ isOpen, type, title, message, onConfirm, onCancel, confirmText = "אישור", cancelText = "ביטול" }: any) => {
    if (!isOpen) return null;
    const iconColor = type === 'error' ? 'text-red-500' : (type === 'success' ? 'text-green-500' : 'text-blue-500');
    const Icon = type === 'error' ? AlertTriangle : (type === 'success' ? CheckCircle : Info);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-full bg-gray-50 ${iconColor}`}><Icon size={32} /></div>
                    <h3 className="text-lg font-black text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
                    <div className="flex gap-3 w-full mt-4">
                        {type === 'confirm' && <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">{cancelText}</button>}
                        <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00BCD4] hover:bg-cyan-600'}`}>{confirmText}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [newStaffData, setNewStaffData] = useState({ name: '', idNumber: '', phone: '', email: '', role: '' });
  const [alertConfig, setAlertConfig] = useState<any>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: string, title: string, message: string, onConfirm?: any) => setAlertConfig({ isOpen: true, type, title, message, onConfirm: onConfirm || (() => setAlertConfig({ ...alertConfig, isOpen: false })) });
  const closeAlert = () => setAlertConfig({ ...alertConfig, isOpen: false });

  useEffect(() => {
    const fetchTripAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', params.id).single();
      if (error || !tripData) { router.push('/dashboard'); return; }
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

  const handleDeleteSecondaryStaff = async () => {
      if (!canManageStaff) return;
      showAlert('confirm', 'מחיקת איש צוות', 'האם למחוק?', async () => {
          const updatedDetails = { ...trip.details };
          delete updatedDetails.secondaryStaffObj;
          const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', trip.id);
          if (!error) { setTrip({ ...trip, details: updatedDetails }); setIsAddingStaff(false); closeAlert(); }
      });
  };

  const handleEditSecondaryStaff = () => { if (canManageStaff && trip.details?.secondaryStaffObj) { setNewStaffData(trip.details.secondaryStaffObj); setIsAddingStaff(true); } };

  const handleSaveSecondaryStaff = async () => {
      if (!canManageStaff) return;
      if (!newStaffData.name.trim() || !newStaffData.idNumber.trim()) { showAlert('error', 'חסרים פרטים', 'חובה למלא את כל השדות'); return; }
      setIsVerifying(true);
      const { data: existingUser, error: checkError } = await supabase.from('profiles').select('id, official_name, last_name').eq('identity_number', newStaffData.idNumber).single();
      if (checkError || !existingUser) { showAlert('error', 'משתמש לא נמצא', 'תעודת הזהות אינה קיימת במערכת'); setIsVerifying(false); return; }
      
      const updatedDetails = { ...trip.details, secondaryStaffObj: { ...newStaffData, userId: existingUser.id, verifiedName: `${existingUser.official_name} ${existingUser.last_name}` } };
      const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', trip.id);
      if (!error) {
          await supabase.from('notifications').insert({ user_id: existingUser.id, title: 'שיבוץ לטיול', message: `שובצת לטיול: ${trip.name}`, link: `/dashboard/trip/${trip.id}`, type: 'assignment' });
          setTrip({ ...trip, details: updatedDetails }); setIsAddingStaff(false); setNewStaffData({ name: '', idNumber: '', phone: '', email: '', role: '' }); showAlert('success', 'הוספה בוצעה', 'המשתמש נוסף בהצלחה');
      }
      setIsVerifying(false);
  };

  const handleEditTrip = () => {
      if (!canManage) return;
      if (trip.status === 'draft') { router.push(`/dashboard/new-trip?id=${trip.id}`); return; }
      showAlert('confirm', 'עריכת טיול פעיל', 'הטיול כבר נשלח. עריכה תחזיר אותו לסטטוס ממתין. להמשיך?', () => router.push(`/dashboard/new-trip?id=${trip.id}`));
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  if (!trip) return null;

  return (
    <>
      <Header title="פרטי פעילות" />
      <CustomAlert {...alertConfig} onCancel={closeAlert} />
      <div className="p-4 md:p-8">
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