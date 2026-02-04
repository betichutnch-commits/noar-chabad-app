"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Save, User, Mail, Lock, ShieldCheck, Camera, Loader2 } from 'lucide-react'

export default function ManagerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // מודל גלובלי
  const [modal, setModal] = useState({ isOpen: false, type: 'info' as any, title: '', message: '' });
  const showModal = (type: string, title: string, msg: string) => setModal({ isOpen: true, type: type as any, title, message: msg });

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
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const meta = user.user_metadata || {};
        
        let extractedId = meta.id_number || '';
        if (!extractedId && user.email?.includes('@')) {
            const possibleId = user.email.split('@')[0];
            if (/^\d+$/.test(possibleId)) extractedId = possibleId;
        }

        const fallbackFirstName = meta.full_name?.split(' ')[0] || '';
        const fallbackLastName = meta.full_name?.split(' ').slice(1).join(' ') || '';

        setFormData({
            officialName: meta.official_name || meta.first_name || fallbackFirstName,
            lastName: meta.last_name || fallbackLastName,
            idNumber: extractedId,
            birthDate: meta.birth_date || '', 
            nickname: meta.nickname || '',
            fullNameAndMother: meta.full_name_mother || '', 
            email: meta.contact_email || user.email || '',
            phone: meta.phone || '',
            profileImage: meta.avatar_url || null
        });
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('trip-files').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('trip-files').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, profileImage: data.publicUrl }));
    } catch (error: any) {
      showModal('error', 'שגיאה', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
      setSaving(true);
      
      const { error } = await supabase.auth.updateUser({
          data: { 
              official_name: formData.officialName,
              first_name: formData.officialName, 
              last_name: formData.lastName,
              nickname: formData.nickname,
              birth_date: formData.birthDate,
              full_name_mother: formData.fullNameAndMother, 
              phone: formData.phone,
              contact_email: formData.email,
              avatar_url: formData.profileImage,
              full_name: `${formData.officialName} ${formData.lastName}`
          }
      });

      setSaving(false);
      
      if (error) {
          showModal('error', 'שגיאה', error.message);
      } else {
          showModal('success', 'נשמר', 'הפרופיל עודכן בהצלחה');
          setTimeout(() => window.location.reload(), 1500); 
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
      <ManagerHeader title="פרופיל אישי - מנהל" />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} type={modal.type} title={modal.title} message={modal.message} />
      
      <div className="p-8 max-w-5xl mx-auto pb-32 animate-fadeIn">
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm flex items-center gap-8 mb-8">
               <div className="relative group w-24 h-24">
                   <div className="w-full h-full bg-gray-800 rounded-3xl flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-white shadow-lg">
                      {formData.profileImage ? (
                          <img src={formData.profileImage} className="w-full h-full object-cover"/>
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
                   <h2 className="text-3xl font-black text-gray-800">{formData.officialName} {formData.lastName}</h2>
                   <div className="flex items-center gap-2 text-gray-500 font-bold mt-1">
                       <ShieldCheck size={18} className="text-[#00BCD4]"/> מנהל מערכת ראשי
                   </div>
               </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-[#F1F8E9] p-6 rounded-3xl border border-green-100 h-fit">
                  <div className="flex items-center gap-2 mb-6 text-[#8BC34A] font-bold text-sm uppercase tracking-wider">
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

              <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">עדכון פרטים</h3>
                  <div className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="שם פרטי (כפי שמופיע בתעודת זהות)" value={formData.officialName} onChange={(e: any) => setFormData({...formData, officialName: e.target.value})} />
                          <Input label="כינוי / שם חיבה" value={formData.nickname} onChange={(e: any) => setFormData({...formData, nickname: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="שם משפחה" value={formData.lastName} onChange={(e: any) => setFormData({...formData, lastName: e.target.value})} />
                          <Input label="טלפון נייד" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
                      </div>

                      <Input label="שם מלא + שם האם (לתפילה)" value={formData.fullNameAndMother} onChange={(e: any) => setFormData({...formData, fullNameAndMother: e.target.value})} placeholder="לדוגמה: יוסף בן שרה" />

                      <Input label="אימייל ליצירת קשר" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} icon={<Mail size={18}/>} />
                      
                      <div className="pt-6 flex justify-end border-t border-gray-100 mt-6">
                          <Button onClick={handleSave} isLoading={saving} icon={<Save size={18}/>} className="bg-gray-800 hover:bg-gray-900 px-10 shadow-lg shadow-gray-200">
                              שמור שינויים
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </>
  )
}