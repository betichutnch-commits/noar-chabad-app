"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  User, Mail, Building2, Save, CheckCircle, Loader2, Camera, ShieldCheck, Lock, Trash2, Calendar, AlertTriangle
} from 'lucide-react'

// פונקציית עזר לפרמוט תאריך לתצוגה עם סלאשים
const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // הופך YYYY-MM-DD ל-DD/MM/YYYY
    return dateStr.split('-').reverse().join('/');
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // משתנה לניהול החלון הקופץ של המחיקה
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    // נתונים בסיסיים
    officialName: '', 
    lastName: '',
    idNumber: '', 
    birthDate: '',
    nickname: '', 
    
    // נתונים נוספים
    fullNameAndMother: '',
    contactEmail: '',
    phone: '',
    branchAddress: '',
    startYear: '', 
    studentCount: '',
    staffCount: '',
    additionalStaff: '',
    profileImage: null as string | null
  });

  // בדיקה אם המשתמש הוא מטה
  const isHQ = user?.user_metadata?.branch === 'מטה' || !user?.user_metadata?.branch;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // שליפת נתונים קיימים
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

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
          startYear: profile?.start_year || meta.start_year || '', 
          studentCount: meta.student_count || '',
          staffCount: meta.staff_count || '',
          additionalStaff: meta.additional_staff || '',
          profileImage: profile?.avatar_url || meta.avatar_url || null
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
      if (!user) throw new Error("User not found");
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trip-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trip-files')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, profileImage: publicUrl }));
    } catch (error: any) {
      alert('שגיאה בהעלאת תמונה: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // פתיחת המודל במקום הודעת דפדפן
  const handleRemoveImageClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowDeleteModal(true);
  };

  // אישור מחיקה בתוך המודל
  const confirmRemoveImage = () => {
      setFormData(prev => ({ ...prev, profileImage: null }));
      setShowDeleteModal(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');

    try {
      // 1. עדכון מטא-דאטה
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
          student_count: formData.studentCount,
          staff_count: formData.staffCount,
          additional_staff: formData.additionalStaff,
        }
      });
      
      // 2. עדכון טבלת profiles
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
              updated_at: new Date()
          };

          const { error } = await supabase.from('profiles').upsert(updates);
          if (error) throw error;
      }

      setSuccessMsg('הפרטים נשמרו בהצלחה!');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (e: any) {
      console.error(e);
      alert('שגיאה בשמירה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <Header title="פרופיל אישי" />

      <div className="max-w-5xl mx-auto p-8 space-y-8 animate-fadeIn pb-32">
        
        {/* כרטיס עליון */}
        <section className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00BCD4] to-[#8BC34A]"></div>
            
            {/* תמונת פרופיל + כפתור מחיקה */}
            <div className="relative group">
                <div className="w-32 h-32 rounded-[30px] bg-gradient-to-tr from-[#00BCD4] to-cyan-100 flex items-center justify-center text-white font-bold text-5xl shadow-xl shadow-cyan-100 border-[5px] border-white ring-1 ring-gray-100 overflow-hidden cursor-pointer relative">
                    {uploading ? (
                       <Loader2 className="animate-spin text-[#00BCD4]" size={32}/>
                    ) : formData.profileImage ? (
                        <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                    ) : (
                        formData.officialName?.[0] || <User size={48}/>
                    )}
                    
                    {/* שכבת העלאה */}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                        <Camera size={24}/>
                        <span className="text-xs font-bold mt-1">שנה תמונה</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading}/>
                    </label>
                </div>

                {/* כפתור מחיקת תמונה */}
                {formData.profileImage && (
                    <button 
                        onClick={handleRemoveImageClick}
                        className="absolute -bottom-2 -right-2 bg-white text-red-500 p-2 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-colors z-20"
                        title="הסר תמונה"
                    >
                        <Trash2 size={16}/>
                    </button>
                )}
            </div>

            <div className="text-center md:text-right flex-1 space-y-3">
                <div className="flex flex-col md:items-start items-center">
                    <h2 className="text-3xl font-black text-gray-800">
                        {formData.officialName} {formData.lastName}
                    </h2>
                    {formData.nickname && (
                        <span className="text-lg text-gray-400 font-bold">({formData.nickname})</span>
                    )}
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                    <span className="bg-cyan-50 text-[#00BCD4] border border-cyan-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        <Building2 size={16}/> {user?.user_metadata?.department} • {user?.user_metadata?.branch || 'מטה'}
                    </span>
                    {formData.startYear && (
                        <span className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Calendar size={16}/> משנת {formData.startYear}
                        </span>
                    )}
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* עמודה ימנית: נתונים מערכתיים */}
            <section className="bg-[#F1F8E9] rounded-[32px] border border-green-100 p-8 shadow-inner lg:col-span-1 h-fit">
                <div className="flex items-center gap-2 mb-6 text-[#8BC34A] font-bold text-sm uppercase tracking-wider">
                    <Lock size={14}/> נתונים מערכתיים (תצוגה)
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">שם (לפי ת"ז)</label>
                        <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.officialName || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">שם משפחה</label>
                        <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.lastName || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">תעודת זהות</label>
                        <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2 tracking-wider">{formData.idNumber || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">תאריך לידה</label>
                        <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">
                            {formatDisplayDate(formData.birthDate)}
                        </div>
                    </div>
                </div>
            </section>

            {/* עמודה שמאלית: טופס עריכה */}
            <section className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
                    <ShieldCheck size={24} className="text-[#00BCD4]"/>
                    <h3 className="text-xl font-bold text-gray-800">עדכון פרטים אישיים</h3>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="שם פרטי (כפי שמופיע בתעודת הזהות)" 
                            value={formData.officialName} 
                            onChange={(e: any) => setFormData({...formData, officialName: e.target.value})}
                            placeholder="לדוגמה: יוסף חיים"
                        />
                        <Input 
                            label="כינוי / שם חיבה" 
                            value={formData.nickname} 
                            onChange={(e: any) => setFormData({...formData, nickname: e.target.value})}
                            placeholder="לדוגמה: יוסי"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="שם משפחה" 
                            value={formData.lastName} 
                            onChange={(e: any) => setFormData({...formData, lastName: e.target.value})}
                        />
                         <Input 
                            label="שם מלא + שם האם" 
                            value={formData.fullNameAndMother} 
                            onChange={(e: any) => setFormData({...formData, fullNameAndMother: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="תעודת זהות" 
                            value={formData.idNumber} 
                            onChange={(e: any) => setFormData({...formData, idNumber: e.target.value})}
                        />
                        <Input 
                            label="תאריך לידה" 
                            type="date"
                            value={formData.birthDate} 
                            onChange={(e: any) => setFormData({...formData, birthDate: e.target.value})}
                        />
                    </div>

                    <Input 
                        label="טלפון נייד" 
                        value={formData.phone} 
                        onChange={(e: any) => setFormData({...formData, phone: e.target.value})}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="אימייל ליצירת קשר" 
                            value={formData.contactEmail} 
                            onChange={(e: any) => setFormData({...formData, contactEmail: e.target.value})} 
                            icon={<Mail size={18}/>}
                            placeholder="example@gmail.com"
                        />
                        <Input 
                            label="שנת הצטרפות לצוות" 
                            type="number"
                            value={formData.startYear} 
                            onChange={(e: any) => setFormData({...formData, startYear: e.target.value})} 
                            placeholder="לדוגמה: 2020"
                        />
                    </div>

                    {/* שינוי התווית למטה/סניף */}
                    <Input 
                        label={isHQ ? "כתובת מגורים" : "כתובת הסניף למשלוח דואר"} 
                        value={formData.branchAddress} 
                        onChange={(e: any) => setFormData({...formData, branchAddress: e.target.value})}
                        placeholder="רחוב, מספר, עיר..."
                    />

                    <div className="h-px bg-gray-100 my-2"></div>

                    {/* הסתרת נתוני חניכים/צוות אם זה מטה */}
                    {!isHQ && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <Input label="כמות חניכים" type="number" value={formData.studentCount} onChange={(e: any) => setFormData({...formData, studentCount: e.target.value})}/>
                            <Input label="כמות אנשי צוות" type="number" value={formData.staffCount} onChange={(e: any) => setFormData({...formData, staffCount: e.target.value})}/>
                        </div>
                    )}

                    <div className="bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100">
                        <label className="text-sm font-bold text-gray-600 block mb-2">{isHQ ? 'שמות חברי מטה נוספים' : 'שמות רכזים נוספים בסניף'}</label>
                        <textarea 
                            className="w-full p-4 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#00BCD4] min-h-[80px] resize-none text-sm font-medium"
                            placeholder="הזן שמות מופרדים בפסיקים..."
                            value={formData.additionalStaff}
                            onChange={e => setFormData({...formData, additionalStaff: e.target.value})}
                        ></textarea>
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-end gap-4">
                    {successMsg && <div className="text-[#8BC34A] font-bold text-sm flex items-center gap-2 animate-fadeIn bg-green-50 px-4 py-2 rounded-xl"><CheckCircle size={18}/> {successMsg}</div>}
                    <Button onClick={handleSave} isLoading={saving} variant="secondary" className="w-full md:w-auto px-12 shadow-xl shadow-green-100" icon={<Save size={20}/>}>שמירת שינויים</Button>
                </div>
            </section>
        </div>

        {/* Modal למחיקת תמונה */}
        {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">מחיקת תמונת פרופיל</h3>
                    <p className="text-gray-500 mb-8 text-sm font-medium leading-relaxed">
                        האם את/ה בטוח/ה שברצונך להסיר את התמונה?
                        <br/>
                        לא ניתן לשחזר את הפעולה לאחר השמירה.
                    </p>
                    <div className="flex gap-3 justify-center">
                       <button 
                           onClick={() => setShowDeleteModal(false)}
                           className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                       >
                           ביטול
                       </button>
                       <button 
                           onClick={confirmRemoveImage}
                           className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                       >
                           מחק תמונה
                       </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </>
  )
}