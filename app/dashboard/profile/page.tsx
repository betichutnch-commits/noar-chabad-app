"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { 
  User, Mail, Building2, Save, Loader2, Camera, 
  ShieldCheck, Lock, Trash2, Calendar, ArrowRight, Info, MapPin, ExternalLink, Briefcase
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

// ייבוא Hook ו-Zod
import { useUser } from '@/hooks/useUser'
import { profileSchema } from '@/lib/schemas'

const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return dateStr.split('-').reverse().join('/');
};

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  // 1. שימוש ב-Hook
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

  // הגדרות תפקיד ומחלקה
  const role = user?.user_metadata?.role;
  const isHQ = role === 'dept_staff' || role === 'safety_admin' || role === 'admin';
  const branchName = user?.user_metadata?.branch_name || user?.user_metadata?.branch || '';
  const department = user?.user_metadata?.department || '';

  // פונקציה לקביעת תואר מגדרי לרכז - תוקנה לזיהוי מדויק יותר
  const getRoleTitle = () => {
      let title = 'רכז/ת סניף'; // ברירת מחדל (מועדונים וכו')
      
      const deptName = department.trim();

      // בדיקת מחלקות גבריות (הוספנו גם 'תמים' וגם 'התמים')
      const maleKeywords = ['הפנסאים', 'פנסאים', 'התמים', 'תמים', 'בני חב"ד', 'בני חב״ד'];
      
      // בדיקת מחלקות נשיות
      const femaleKeywords = ['בת מלך', 'בנות חב"ד', 'בנות חב״ד'];

      if (maleKeywords.some(d => deptName.includes(d))) {
          title = 'רכז סניף';
      } 
      else if (femaleKeywords.some(d => deptName.includes(d))) {
          title = 'רכזת סניף';
      }

      return title;
  };

  // בניית הכותרת המלאה (למעלה)
  const fullRoleString = isHQ 
    ? `צוות מטה | ${department}` 
    : `${department} | ${getRoleTitle()} ${branchName}`;

  // בניית תיאור התפקיד (עבור הנתונים המערכתיים)
  const systemRoleDescription = isHQ 
    ? (role === 'safety_admin' ? 'מנהל בטיחות ומפעלים' : `מטה ${department}`)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
        if (!user) throw new Error("User not found");
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('trip-files').upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('trip-files').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, profileImage: publicUrl }));
    } catch (error: any) { showModal('error', 'שגיאה', 'שגיאה בהעלאת תמונה: ' + error.message); } 
    finally { setUploading(false); }
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
      await supabase.auth.updateUser({
        data: {
          official_name: formData.officialName,
          last_name: formData.lastName,
          identity_number: formData.idNumber,
          birth_date: formData.birthDate,
          nickname: formData.nickname,
          phone: formData.phone,
          avatar_url: formData.profileImage, 
          start_year: formData.startYear, 
          full_name_mother: formData.fullNameAndMother,
          contact_email: formData.contactEmail,
          branch_address: formData.branchAddress,
          zip_code: formData.zipCode,
          student_count: formData.studentCount,
          staff_count: formData.staffCount,
          additional_staff: formData.additionalStaff,
        }
      });
      
      if (user) {
          const updates = {
              id: user.id,
              official_name: formData.officialName,
              last_name: formData.lastName,
              identity_number: formData.idNumber,
              birth_date: formData.birthDate,
              phone: formData.phone,
              email: formData.contactEmail,
              full_name: `${formData.officialName} ${formData.lastName}`.trim(),
              avatar_url: formData.profileImage,
              start_year: formData.startYear, 
              zip_code: formData.zipCode,
              updated_at: new Date()
          };
          await supabase.from('profiles').upsert(updates);
      }

      refresh();
      showModal('success', 'הפרטים נשמרו', 'העדכון בוצע בהצלחה!');
      
      if (returnUrl) {
          setTimeout(() => { router.push(returnUrl); }, 1500);
      }

    } catch (e: any) { showModal('error', 'שגיאה', 'שגיאה בשמירה: ' + e.message); } 
    finally { setSaving(false); }
  };

  if (userLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

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

        <section className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00BCD4] to-[#8BC34A]"></div>
            
            <div className="relative group">
                <div className="w-32 h-32 rounded-[30px] bg-gradient-to-tr from-[#00BCD4] to-cyan-100 flex items-center justify-center text-white font-bold text-5xl shadow-xl shadow-cyan-100 border-[5px] border-white ring-1 ring-gray-100 overflow-hidden cursor-pointer relative">
                    {uploading ? <Loader2 className="animate-spin text-[#00BCD4]" size={32}/> : formData.profileImage ? <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover"/> : (formData.officialName?.[0] || <User size={48}/>)}
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
                    <h2 className="text-3xl font-black text-gray-800">{formData.officialName} {formData.lastName}</h2>
                    {formData.nickname && <span className="text-lg text-gray-400 font-bold">({formData.nickname})</span>}
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                    <span className="bg-cyan-50 text-[#00BCD4] border border-cyan-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        <Building2 size={16}/> {fullRoleString}
                    </span>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="bg-[#F1F8E9] rounded-[32px] border border-green-100 p-8 shadow-inner lg:col-span-1 h-fit">
                <div className="flex items-center gap-2 mb-6 text-[#8BC34A] font-bold text-sm uppercase tracking-wider"><Lock size={14}/> נתונים מערכתיים (תצוגה)</div>
                <div className="space-y-6">
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תפקיד</label><div className="font-bold text-gray-800 text-base border-b border-green-200/50 pb-2">{systemRoleDescription}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">שם (לפי ת"ז)</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.officialName || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">שם משפחה</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.lastName || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תעודת זהות</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2 tracking-wider">{formData.idNumber || '-'}</div></div>
                    <div><label className="text-xs font-bold text-gray-400 block mb-1">תאריך לידה</label><div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formatDisplayDate(formData.birthDate)}</div></div>
                </div>
            </section>

            <section className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4"><ShieldCheck size={24} className="text-[#00BCD4]"/><h3 className="text-xl font-bold text-gray-800">עדכון פרטים אישיים</h3></div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="שם פרטי (כפי שמופיע בתעודת הזהות)" value={formData.officialName} onChange={(e: any) => setFormData({...formData, officialName: e.target.value})} placeholder="לדוגמה: יוסף חיים"/>
                        <Input label="כינוי / שם חיבה" value={formData.nickname} onChange={(e: any) => setFormData({...formData, nickname: e.target.value})} placeholder="לדוגמה: יוסי"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="שם משפחה" value={formData.lastName} onChange={(e: any) => setFormData({...formData, lastName: e.target.value})}/>
                        <Input label="שם מלא + שם האם" value={formData.fullNameAndMother} onChange={(e: any) => setFormData({...formData, fullNameAndMother: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="תעודת זהות" value={formData.idNumber} onChange={(e: any) => setFormData({...formData, idNumber: e.target.value})}/>
                        <Input label="תאריך לידה" type="date" value={formData.birthDate} onChange={(e: any) => setFormData({...formData, birthDate: e.target.value})}/>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="טלפון נייד" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})}/>
                        <Input label="אימייל ליצירת קשר" value={formData.contactEmail} onChange={(e: any) => setFormData({...formData, contactEmail: e.target.value})} icon={<Mail size={18}/>} placeholder="example@gmail.com"/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="md:col-span-2">
                            <Input label={isHQ ? "כתובת מגורים" : "כתובת הסניף"} value={formData.branchAddress} onChange={(e: any) => setFormData({...formData, branchAddress: e.target.value})} placeholder="רחוב, מספר, עיר..."/>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1.5">
                                <label className="text-xs font-bold text-gray-500">מיקוד</label>
                                <a href="https://doar.israelpost.co.il/locatezip" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#E91E63] flex items-center gap-1 hover:underline">
                                    <ExternalLink size={10} /> איתור מיקוד
                                </a>
                            </div>
                            <Input value={formData.zipCode} onChange={(e: any) => setFormData({...formData, zipCode: e.target.value})} placeholder="1234567" icon={<MapPin size={16}/>}/>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>
                    
                    {!isHQ && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                            <Input label="שנת הצטרפות לארגון" type="number" value={formData.startYear} onChange={(e: any) => setFormData({...formData, startYear: e.target.value})} placeholder="2020"/>
                            <Input label="כמות חניכים בסניף" type="number" value={formData.studentCount} onChange={(e: any) => setFormData({...formData, studentCount: e.target.value})}/>
                            <Input label="כמות אנשי צוות בסניף" type="number" value={formData.staffCount} onChange={(e: any) => setFormData({...formData, staffCount: e.target.value})}/>
                        </div>
                    )}
                    
                    {isHQ && (
                         <Input label="שנת הצטרפות לצוות" type="number" value={formData.startYear} onChange={(e: any) => setFormData({...formData, startYear: e.target.value})} placeholder="2020"/>
                    )}
                    
                    <div className="bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100">
                        <label className="text-sm font-bold text-gray-600 block mb-2">{isHQ ? 'שמות חברי מטה נוספים' : 'שמות רכזים נוספים בסניף'}</label>
                        <textarea className="w-full p-4 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#00BCD4] min-h-[80px] resize-none text-sm font-medium" placeholder="הזן שמות מופרדים בפסיקים..." value={formData.additionalStaff} onChange={e => setFormData({...formData, additionalStaff: e.target.value})}></textarea>
                    </div>
                </div>
                <div className="mt-10 flex items-center justify-end gap-4">
                    <Button onClick={handleSave} isLoading={saving} variant="secondary" className="w-full md:w-auto px-12 shadow-xl shadow-green-100" icon={<Save size={20}/>}>
                        {returnUrl ? 'שמירה וחזרה לטיול' : 'שמירת שינויים'}
                    </Button>
                </div>
            </section>
        </div>
      </div>
    </>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>}>
       <ProfileContent />
    </Suspense>
  )
}