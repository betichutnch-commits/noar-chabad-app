"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Save, User, Mail, Lock, ShieldCheck, Camera, Loader2 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { profileSchema } from '@/lib/schemas'
import { saveUserProfile } from '@/lib/profile'
import { formatUserRoleLabel, isManagerUser } from '@/lib/auth'
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel'
import { PushAdminTestPanel } from '@/components/PushAdminTestPanel'
import Image from 'next/image'

export default function ManagerProfile() {
  const { user, profile, loading: userLoading, refresh } = useUser('/');
  const isAdminLike = isManagerUser(user, profile)

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm: undefined });

  const [formData, setFormData] = useState({
    officialName: '', 
    lastName: '',
    idNumber: '', 
    birthDate: '',
    nickname: '',
    fullNameAndMother: '', 
    email: '',
    phone: '',
    profileImage: null as string | null
  });

  useEffect(() => {
    if (user && !userLoading) {
        const meta = user.user_metadata || {};
        
        let extractedId = profile?.identity_number || meta.id_number || '';
        if (!extractedId && user.email?.includes('@')) {
            const possibleId = user.email.split('@')[0];
            if (/^\d+$/.test(possibleId)) extractedId = possibleId;
        }

        const fallbackFirstName = meta.full_name?.split(' ')[0] || '';
        const fallbackLastName = meta.full_name?.split(' ').slice(1).join(' ') || '';

        setFormData({
            officialName: profile?.official_name || meta.official_name || meta.first_name || fallbackFirstName,
            lastName: profile?.last_name || meta.last_name || fallbackLastName,
            idNumber: extractedId,
            birthDate: profile?.birth_date || meta.birth_date || '', 
            nickname: meta.nickname || '',
            fullNameAndMother: meta.full_name_mother || '', 
            email: profile?.email || meta.contact_email || user.email || '',
            phone: profile?.phone || meta.phone || '',
            profileImage: profile?.avatar_url || meta.avatar_url || null
        });
    }
  }, [user, profile, userLoading]);

  // --- הפונקציה המתוקנת להעלאת תמונת פרופיל מנהל ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // ולידציה
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showModal('error', 'קובץ לא נתמך', 'ניתן להעלות תמונות בלבד (JPG, PNG).');
        return;
    }

    setUploading(true);

    try {
      if (!user) throw new Error("User not found");
      const fileExt = file.name.split('.').pop();
      // העלאה לדלי הציבורי 'avatars'
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (error) throw error;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, profileImage: data.publicUrl }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      showModal('error', 'שגיאה', message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
      const validation = profileSchema.safeParse({
          officialName: formData.officialName,
          lastName: formData.lastName,
          idNumber: formData.idNumber,
          phone: formData.phone,
          email: formData.email,
          birthDate: formData.birthDate,
          nickname: formData.nickname,
          fullNameAndMother: formData.fullNameAndMother,
      });

      if (!validation.success) {
          showModal('error', 'שגיאה בטופס', validation.error.issues[0].message);
          return;
      }

      setSaving(true);
      try {
        if (!user) throw new Error("User not found");
        await saveUserProfile({
          userId: user.id,
          officialName: formData.officialName,
          lastName: formData.lastName,
          idNumber: formData.idNumber,
          birthDate: formData.birthDate,
          nickname: formData.nickname,
          fullNameAndMother: formData.fullNameAndMother,
          phone: formData.phone,
          email: formData.email,
          avatarUrl: formData.profileImage,
        });

        refresh();
        showModal('success', 'נשמר', 'הפרופיל עודכן בהצלחה');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'שגיאה בשמירה';
        showModal('error', 'שגיאה', message);
      } finally {
        setSaving(false);
      }
  };

  if (userLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
      <ManagerHeader title="פרופיל אישי" />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} type={modal.type} title={modal.title} message={modal.message} />
      
      <div className="p-8 max-w-5xl mx-auto pb-32 animate-fadeIn">
          
          <div className="bg-surface-card rounded-[32px] p-8 border border-border-subtle shadow-sm flex items-center gap-8 mb-8">
               <div className="relative group w-24 h-24">
                   <div className="w-full h-full bg-gray-800 rounded-3xl flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-white shadow-lg">
                      {formData.profileImage ? (
                          <Image src={formData.profileImage} alt="Profile" fill className="object-cover" unoptimized/>
                      ) : (
                          formData.officialName?.[0] || <User/>
                      )}
                   </div>
                   <label className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all text-white">
                       <Camera size={24}/>
                       <input type="file" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                   </label>
               </div>
               <div>
                   <h2 className="text-3xl font-black text-text-primary">{formData.officialName} {formData.lastName}</h2>
                   <div className="flex items-center gap-2 text-gray-500 font-bold mt-1">
                       <ShieldCheck size={18} className="text-brand-cyan"/>
                       {formatUserRoleLabel({
                         role: user?.user_metadata?.role,
                         department: user?.user_metadata?.department,
                         branchName: user?.user_metadata?.branch_name || user?.user_metadata?.branch,
                       })}
                   </div>
               </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-green-50 p-6 rounded-3xl border border-green-100 h-fit">
                  <div className="flex items-center gap-2 mb-6 text-brand-green font-bold text-sm uppercase tracking-wider">
                      <Lock size={14}/> פרטי מערכת
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-400">שם פרטי (רשמי)</label>
                          <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-1">{formData.officialName || '-'}</div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400">שם משפחה</label>
                          <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-1">{formData.lastName || '-'}</div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400">תעודת זהות</label>
                          <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-1 tracking-wider">{formData.idNumber || '-'}</div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400">תאריך לידה</label>
                          <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-1">{formData.birthDate || '-'}</div>
                      </div>
                  </div>
              </div>

              <div className="md:col-span-2 bg-surface-card p-8 rounded-3xl border border-border-subtle shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">עדכון פרטים</h3>
                  <div className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="שם פרטי (כפי שמופיע בתעודת זהות)" value={formData.officialName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, officialName: e.target.value})} />
                          <Input label="כינוי / שם חיבה" value={formData.nickname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nickname: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="שם משפחה" value={formData.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, lastName: e.target.value})} />
                          <Input label="טלפון נייד" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
                      </div>

                      <Input label="שם מלא + שם האם (לתפילה)" value={formData.fullNameAndMother} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fullNameAndMother: e.target.value})} placeholder="לדוגמה: יוסף בן שרה" />

                      <Input label="אימייל ליצירת קשר" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} icon={<Mail size={18}/>} />
                      
                      <div className="pt-6 flex justify-end border-t border-gray-100 mt-6">
                          <Button onClick={handleSave} isLoading={saving} icon={<Save size={18}/>} className="bg-gray-800 hover:bg-gray-900 px-10 shadow-lg shadow-gray-200">
                              שמור שינויים
                          </Button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="mt-8">
            <NotificationPreferencesPanel userId={user?.id} />
            <PushAdminTestPanel enabled={isAdminLike} />
          </div>
      </div>
    </>
  )
}