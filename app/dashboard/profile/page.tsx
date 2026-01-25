"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  User, Mail, Building2, Save, CheckCircle, Loader2, Camera, ShieldCheck, Lock
} from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    // נתונים בסיסיים
    officialName: '', // שם פרטי לפי ת"ז (חדש)
    lastName: '',
    idNumber: '', 
    birthDate: '',
    nickname: '', // כינוי (חדש)
    
    // נתונים נוספים
    fullNameAndMother: '',
    contactEmail: '',
    phone: '',
    branchAddress: '',
    studentCount: '',
    staffCount: '',
    additionalStaff: '',
    profileImage: null as string | null
  });

  const isHQ = user?.user_metadata?.branch === 'מטה' || !user?.user_metadata?.branch;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const meta = user.user_metadata || {};
        
        // חילוץ ת"ז
        let extractedId = meta.id_number || '';
        if (!extractedId && user.email?.includes('@')) {
            const possibleId = user.email.split('@')[0];
            if (/^\d+$/.test(possibleId)) extractedId = possibleId;
        }

        setFormData({
          // לוקחים את השם הרשמי, ואם אין - מנסים לחלץ מהשם המלא הישן
          officialName: meta.official_name || meta.first_name || meta.full_name?.split(' ')[0] || '',
          lastName: meta.last_name || meta.full_name?.split(' ').slice(1).join(' ') || '',
          idNumber: extractedId, 
          birthDate: meta.birth_date || '',
          nickname: meta.nickname || '', // טעינת הכינוי

          fullNameAndMother: meta.full_name_mother || meta.full_name || '',
          contactEmail: meta.contact_email || '', 
          phone: meta.phone || '',
          branchAddress: meta.branch_address || '',
          studentCount: meta.student_count || '',
          staffCount: meta.staff_count || '',
          additionalStaff: meta.additional_staff || '',
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

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          official_name: formData.officialName, // שמירת השם הרשמי
          nickname: formData.nickname, // שמירת הכינוי
          last_name: formData.lastName,
          id_number: formData.idNumber,
          birth_date: formData.birthDate,
          
          full_name_mother: formData.fullNameAndMother,
          contact_email: formData.contactEmail,
          phone: formData.phone,
          branch_address: formData.branchAddress,
          student_count: formData.studentCount,
          staff_count: formData.staffCount,
          additional_staff: formData.additionalStaff,
          avatar_url: formData.profileImage
        }
      });

      if (error) throw error;
      setSuccessMsg('הפרטים נשמרו בהצלחה!');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (e: any) {
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
            
            {/* תמונת פרופיל */}
            <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-[30px] bg-gradient-to-tr from-[#00BCD4] to-cyan-100 flex items-center justify-center text-white font-bold text-5xl shadow-xl shadow-cyan-100 border-[5px] border-white ring-1 ring-gray-100 overflow-hidden">
                    {uploading ? (
                       <Loader2 className="animate-spin text-[#00BCD4]" size={32}/>
                    ) : formData.profileImage ? (
                        <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover"/>
                    ) : (
                        formData.officialName?.[0] || <User size={48}/>
                    )}
                </div>
                <label className="absolute inset-0 bg-black/40 rounded-[30px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer transition-all">
                    <Camera size={24}/>
                    <span className="text-xs font-bold mt-1">שנה תמונה</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading}/>
                </label>
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
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* עמודה ימנית: נתונים מערכתיים - רקע ירוק עדין */}
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
                        <div className="font-bold text-gray-800 text-lg border-b border-green-200/50 pb-2">{formData.birthDate || '-'}</div>
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
                    {/* שדות שם חדשים */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="שם פרטי (כפי שמופיע בתעודת הזהות)" 
                            value={formData.officialName} 
                            onChange={e => setFormData({...formData, officialName: e.target.value})}
                            placeholder="לדוגמה: יוסף חיים"
                        />
                        <Input 
                            label="כינוי / שם חיבה" 
                            value={formData.nickname} 
                            onChange={e => setFormData({...formData, nickname: e.target.value})}
                            placeholder="לדוגמה: יוסי"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="שם מלא + שם האם" 
                            value={formData.fullNameAndMother} 
                            onChange={e => setFormData({...formData, fullNameAndMother: e.target.value})}
                        />
                        <Input 
                            label="טלפון נייד" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>

                    <Input 
                        label="אימייל ליצירת קשר" 
                        value={formData.contactEmail} 
                        onChange={e => setFormData({...formData, contactEmail: e.target.value})} 
                        icon={<Mail size={18}/>}
                        placeholder="example@gmail.com"
                    />
                    <Input 
                        label="כתובת הסניף למשלוח דואר" 
                        value={formData.branchAddress} 
                        onChange={e => setFormData({...formData, branchAddress: e.target.value})}
                        placeholder="רחוב, מספר, עיר..."
                    />

                    <div className="h-px bg-gray-100 my-2"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="כמות חניכים" type="number" value={formData.studentCount} onChange={e => setFormData({...formData, studentCount: e.target.value})}/>
                        <Input label="כמות אנשי צוות" type="number" value={formData.staffCount} onChange={e => setFormData({...formData, staffCount: e.target.value})}/>
                    </div>

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
                    <Button onClick={handleSave} isLoading={saving} variant="secondary" className="w-full md:w-auto px-12 shadow-xl shadow-green-100" icon={<Save size={20}/>}>שמור שינויים</Button>
                </div>
            </section>
        </div>
      </div>
    </>
  )
}