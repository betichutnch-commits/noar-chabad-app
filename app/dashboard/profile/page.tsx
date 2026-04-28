"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { 
  User, Mail, Building2, Save, Loader2, Camera, 
  ShieldCheck, Lock, Trash2, ArrowRight, Info, MapPin, ExternalLink
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { profileSchema } from '@/lib/schemas'
import { saveUserProfile } from '@/lib/profile'
import { sanitizeInternalReturnUrl, formatUserRoleLabel, getCoordinatorRoleTitle, getCoordinatorsPluralTitle } from '@/lib/auth'
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel'
import Image from 'next/image'

const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return dateStr.split('-').reverse().join('/');
};

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = sanitizeInternalReturnUrl(searchParams.get('returnUrl'), '');

  const { user, profile, loading: userLoading, refresh } = useUser('/');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string, onConfirm?: () => void) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm });

  const [formData, setFormData] = useState({
    officialName: '', 
    lastName: '',
    idNumber: '', 
    birthDate: '',
    nickname: '', 
    fullNameAndMother: '',
    contactEmail: '',
    phone: '',
    branchAddress: '',
    zipCode: '', 
    startYear: '', 
    studentCount: '',
    staffCount: '',
    additionalStaff: '',
    profileImage: null as string | null
  });

  const role = user?.user_metadata?.role;
  const isHQ =
    role === 'dept_staff' ||
    role === 'safety_admin' ||
    role === 'admin' ||
    role === 'dept_trips_officer';
  const branchName = user?.user_metadata?.branch_name || user?.user_metadata?.branch || '';
  const department = user?.user_metadata?.department || '';

  const getRoleTitle = () => getCoordinatorRoleTitle(department);

  const fullRoleString = isHQ
    ? `${formatUserRoleLabel({ role, department, branchName })}${
        department && !formatUserRoleLabel({ role, department, branchName }).includes(department)
          ? ` | ${department}`
          : ''
      }`
    : `${department} | ${getRoleTitle()} ${branchName}`;

  const systemRoleDescription = isHQ
    ? formatUserRoleLabel({ role, department, branchName })
    : `${getRoleTitle()} ${branchName}`;

  useEffect(() => {
    if (user && !userLoading) {
        const meta = user.user_metadata || {};
        
        setFormData({
            officialName: profile?.official_name || meta.official_name || '',
            lastName: profile?.last_name || meta.last_name || '',
            idNumber: profile?.identity_number || meta.identity_number || '', 
            birthDate: profile?.birth_date || meta.birth_date || '',
            nickname: meta.nickname || '', 
            fullNameAndMother: meta.full_name_mother || '',
            contactEmail: profile?.email || meta.contact_email || user.email || '', 
            phone: profile?.phone || meta.phone || '',
            branchAddress: meta.branch_address || '',
            zipCode: meta.zip_code || '', 
            startYear: profile?.start_year || meta.start_year || '', 
            studentCount: meta.student_count || '',
            staffCount: meta.staff_count || '',
            additionalStaff: meta.additional_staff || '',
            profileImage: profile?.avatar_url || meta.avatar_url || null
        });
    }
  }, [user, profile, userLoading]);

  // --- הפונקציה המתוקנת להעלאת תמונת פרופיל ---
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
        // שינוי: העלאה לדלי הציבורי 'avatars'
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        // כאן אנחנו משתמשים ב-getPublicUrl כי הדלי 'avatars' הוא ציבורי!
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        
        setFormData(prev => ({ ...prev, profileImage: data.publicUrl }));
    } catch (error: unknown) { 
        const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
        showModal('error', 'שגיאה', 'שגיאה בהעלאת תמונה: ' + message); 
    } finally { 
        setUploading(false); 
    }
  };

  const handleRemoveImageClick = (e: React.MouseEvent) => { 
      e.preventDefault(); 
      showModal('confirm', 'מחיקת תמונה', 'האם את/ה בטוח/ה שברצונך להסיר את התמונה?\nלא ניתן לשחזר את הפעולה לאחר השמירה.', () => {
          setFormData(prev => ({ ...prev, profileImage: null }));
      });
  };

  const handleSave = async () => {
    const validation = profileSchema.safeParse({
        officialName: formData.officialName,
        lastName: formData.lastName,
        idNumber: formData.idNumber,
        phone: formData.phone,
        email: formData.contactEmail,
        birthDate: formData.birthDate,
        nickname: formData.nickname,
        fullNameAndMother: formData.fullNameAndMother,
        branchAddress: formData.branchAddress,
        zipCode: formData.zipCode,
        startYear: formData.startYear,
        studentCount: formData.studentCount,
        staffCount: formData.staffCount,
        additionalStaff: formData.additionalStaff,
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
        email: formData.contactEmail,
        avatarUrl: formData.profileImage,
        startYear: formData.startYear,
        zipCode: formData.zipCode,
        branchAddress: formData.branchAddress,
        studentCount: formData.studentCount,
        staffCount: formData.staffCount,
        additionalStaff: formData.additionalStaff,
      });

      refresh();
      showModal('success', 'הפרטים נשמרו', 'העדכון בוצע בהצלחה!');
      
      if (returnUrl) {
          setTimeout(() => { router.push(returnUrl); }, 1500);
      }

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      showModal('error', 'שגיאה', 'שגיאה בשמירה: ' + message);
    } 
    finally { setSaving(false); }
  };

  if (userLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>;

  return (
    <>
      <Header title="פרופיל אישי" />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} />

      <div className="max-w-5xl mx-auto p-8 space-y-8 animate-fadeIn pb-32">
        
        {returnUrl && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Info size={20}/></div>
                    <div>
                        <span className="block text-sm font-bold text-blue-900">הגעת לכאן מתוך טופס הטיול</span>
                        <span className="text-xs text-blue-700">לאחר עדכון הפרטים לחץ על שמירה כדי לחזור לטופס.</span>
                    </div>
                </div>
                <button 
                    onClick={() => router.push(returnUrl)} 
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                >
                    <ArrowRight size={14}/> חזרה ללא שמירה
                </button>
            </div>
        )}

        <section className="bg-surface-card rounded-[32px] border border-border-subtle p-8 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-cyan to-brand-green"></div>
            
            <div className="relative group">
                <div className="w-32 h-32 rounded-[30px] bg-gradient-to-tr from-brand-cyan to-cyan-100 flex items-center justify-center text-white font-bold text-5xl shadow-xl shadow-cyan-100 border-[5px] border-white ring-1 ring-gray-100 overflow-hidden cursor-pointer relative">
                    {uploading ? <Loader2 className="animate-spin text-brand-cyan" size={32}/> : formData.profileImage ? <Image src={formData.profileImage} alt="Profile" fill className="object-cover" unoptimized/> : (formData.officialName?.[0] || <User size={48}/>)}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                        <Camera size={24}/>
                        <span className="text-xs font-bold mt-1">שנה תמונה</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading}/>
                    </label>
                </div>
                {formData.profileImage && (
                    <button onClick={handleRemoveImageClick} className="absolute -bottom-2 -right-2 bg-white text-red-500 p-2 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-colors z-20" title="הסר תמונה"><Trash2 size={16}/></button>
                )}
            </div>

            <div className="text-center md:text-right flex-1 space-y-3">
                <div className="flex flex-col md:items-start items-center">
                    <h2 className="text-3xl font-black text-text-primary">{formData.officialName} {formData.lastName}</h2>
                    {formData.nickname && <span className="text-lg text-text-muted font-bold">({formData.nickname})</span>}
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                    <span className="bg-cyan-50 text-brand-cyan border border-cyan-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        <Building2 size={16}/> {fullRoleString}
                    </span>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="bg-green-50 rounded-[32px] border border-green-100 p-8 shadow-inner lg:col-span-1 h-fit">
                <div className="flex items-center gap-2 mb-6 text-brand-green font-bold text-sm uppercase tracking-wider"><Lock size={14}/> נתונים מערכתיים (תצוגה)</div>
                <div className="space-y-6">
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תפקיד</label><div className="font-bold text-gray-800 text-base border-b border-green-200/50 pb-2">{systemRoleDescription}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">שם (לפי ת״ז)</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.officialName || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">שם משפחה</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.lastName || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תעודת זהות</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2 tracking-wider">{formData.idNumber || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תאריך לידה</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formatDisplayDate(formData.birthDate)}</div></div>
                </div>
            </section>

            <section className="bg-surface-card rounded-[32px] border border-border-subtle p-8 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-3 mb-8 border-b border-border-subtle pb-4"><ShieldCheck size={24} className="text-brand-cyan"/><h3 className="text-xl font-bold text-text-primary">עדכון פרטים אישיים</h3></div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="שם פרטי (כפי שמופיע בתעודת הזהות)" value={formData.officialName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, officialName: e.target.value})} placeholder="לדוגמה: יוסף חיים"/>
                        <Input label="כינוי / שם חיבה" value={formData.nickname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nickname: e.target.value})} placeholder="לדוגמה: יוסי"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="שם משפחה" value={formData.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, lastName: e.target.value})}/>
                        <Input label="שם מלא + שם האם" value={formData.fullNameAndMother} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fullNameAndMother: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="תעודת זהות" value={formData.idNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, idNumber: e.target.value})}/>
                        <Input label="תאריך לידה" type="date" value={formData.birthDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, birthDate: e.target.value})}/>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="טלפון נייד" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})}/>
                        <Input label="אימייל ליצירת קשר" value={formData.contactEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, contactEmail: e.target.value})} icon={<Mail size={18}/>} placeholder="example@gmail.com"/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="md:col-span-2">
                            <Input label={isHQ ? "כתובת מגורים" : "כתובת הסניף"} value={formData.branchAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, branchAddress: e.target.value})} placeholder="רחוב, מספר, עיר..."/>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1.5">
                                <label className="text-xs font-bold text-gray-500">מיקוד</label>
                                <a href="https://doar.israelpost.co.il/locatezip" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-pink flex items-center gap-1 hover:underline">
                                    <ExternalLink size={10} /> איתור מיקוד
                                </a>
                            </div>
                            <Input value={formData.zipCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, zipCode: e.target.value})} placeholder="1234567" icon={<MapPin size={16}/>}/>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>
                    
                    {!isHQ && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                            <Input label="שנת הצטרפות לארגון" type="number" value={formData.startYear} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, startYear: e.target.value})} placeholder="2020"/>
                            <Input label="כמות חניכים בסניף" type="number" value={formData.studentCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, studentCount: e.target.value})}/>
                            <Input label="כמות אנשי צוות בסניף" type="number" value={formData.staffCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, staffCount: e.target.value})}/>
                        </div>
                    )}
                    
                    {isHQ && (
                         <Input label="שנת הצטרפות לצוות" type="number" value={formData.startYear} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, startYear: e.target.value})} placeholder="2020"/>
                    )}
                    
                    <div className="bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100">
                        <label className="text-sm font-bold text-gray-600 block mb-2">{isHQ ? 'שמות חברי מטה נוספים' : `שמות ${getCoordinatorsPluralTitle(department)} נוספים בסניף`}</label>
                        <textarea className="w-full p-4 rounded-xl bg-white border border-border-subtle outline-none focus:border-brand-cyan min-h-[80px] resize-none text-sm font-medium" placeholder="הזן שמות מופרדים בפסיקים..." value={formData.additionalStaff} onChange={e => setFormData({...formData, additionalStaff: e.target.value})}></textarea>
                    </div>
                </div>
                <div className="mt-10 flex items-center justify-end gap-4">
                    <Button onClick={handleSave} isLoading={saving} variant="secondary" className="w-full md:w-auto px-12 shadow-xl shadow-green-100" icon={<Save size={20}/>}>
                        {returnUrl ? 'שמירה וחזרה לטיול' : 'שמירת שינויים'}
                    </Button>
                </div>
            </section>
        </div>

        <div className="mt-8">
          <NotificationPreferencesPanel userId={user?.id} />
        </div>
      </div>
    </>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>}>
       <ProfileContent />
    </Suspense>
  )
}