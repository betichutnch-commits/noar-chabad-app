"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, UserPlus, ShieldCheck, Users, Briefcase, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; 

// ייבוא מתיקיות העזר
import { DEPARTMENTS_CONFIG } from '@/lib/constants'; 

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'landing' | 'login' | 'dept_selection' | 'role_selection' | 'register_form'>('landing');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // דאטה
  const [selectedDept, setSelectedDept] = useState(''); 
  const [selectedRoleType, setSelectedRoleType] = useState(''); 
  const [formData, setFormData] = useState({
    idNumber: '', password: '', fullName: '', phone: '', email: '', birthDate: '', branch: '', role: ''
  });

  const getRoleLabel = (roleType: 'coordinator' | 'hq') => {
    // הגנה מפני קריסה אם המחלקה לא נבחרה עדיין
    const config = DEPARTMENTS_CONFIG[selectedDept] || { gender: 'mixed' };
    const gender = config.gender;

    if (roleType === 'coordinator') {
        if (gender === 'female') return 'רכזת סניף';
        if (gender === 'male') return 'רכז סניף';
        return 'רכז/ת סניף';
    } else { // HQ
        return 'צוות מטה';
    }
  };

  useEffect(() => {
    const autoLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(true);
        try {
          await checkRoleAndRedirect(session.user);
        } catch (error) {
          console.log("Auto-login failed:", error);
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    };
    autoLogin();
  }, []);

  const checkRoleAndRedirect = async (user: any) => {
    const meta = user.user_metadata || {};
    const status = meta.status || 'pending';

    if (user.email !== SUPER_ADMIN_EMAIL && status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error(status === 'pending' ? 'ההרשמה נקלטה אך טרם אושרה.' : 'הגישה למערכת נחסמה.');
    }

    router.refresh(); 
    await new Promise(resolve => setTimeout(resolve, 500));

    if (meta.department === 'בטיחות ומפעלים' || meta.role === 'safety_admin') {
        router.push('/manager');
    } else {
        router.push('/dashboard');
    }
  };

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');

    try {
        const email = formData.idNumber.includes('@') ? formData.idNumber : `${formData.idNumber}@noar.chabad.co.il`; 
        const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: formData.password });

        if (error) {
          setErrorMsg('שגיאה בהתחברות: בדוק את תעודת הזהות והסיסמה.');
          setLoading(false);
          return;
        }
        await checkRoleAndRedirect(data.user);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'שגיאה כללית במערכת');
        setLoading(false);
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');

    try {
        const email = `${formData.idNumber}@noar.chabad.co.il`;
        const { error } = await supabase.auth.signUp({
          email: email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              identity_number: formData.idNumber,
              department: selectedDept, 
              role: selectedRoleType,   
              branch_name: selectedRoleType === 'coordinator' ? formData.branch : null,
              phone: formData.phone,
              contact_email: formData.email,
              birth_date: formData.birthDate,
              status: 'pending'
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
        } else {
          setSuccessMsg('נרשמת בהצלחה! החשבון ממתין לאישור מנהל.');
          setTimeout(() => {
              setSuccessMsg('');
              setView('login');
              setLoading(false);
          }, 2000);
        }
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
  };

  // --- View: Landing (דף כניסה) ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 relative overflow-hidden">
        {/* רקע דקורטיבי */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00BCD4] via-[#4CAF50] to-[#E91E63]"></div>
        
        <main className="max-w-md w-full text-center space-y-8 relative z-10 animate-fadeIn">
          
          {/* לוגו במלבן מאוזן מוקטן */}
          <div className="relative mx-auto w-32 h-20 bg-white p-3 rounded-2xl shadow-lg flex items-center justify-center mb-6 border border-gray-50 transform hover:scale-105 transition-transform duration-500">
            <Image 
                src="/logo.png" 
                alt="לוגו נוער חב״ד" 
                fill
                className="object-contain p-1"
                priority
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-black text-[#00BCD4] leading-tight drop-shadow-sm">
                מערכת הטיולים והאירועים
                <span className="block text-2xl md:text-3xl text-gray-800 mt-1">של ארגון נוער חב"ד</span>
            </h1>
            
            <p className="text-gray-500 font-medium text-lg px-4">
                פלטפורמת הניהול לתכנון, אישור ובקרה
            </p>
          </div>

          <div className="space-y-4 pt-4 px-6">
            
            {/* כפתור כניסה - עיצוב ירוק מותאם אישית (השתמשתי ב-! כדי לדרוס את התכלת) */}
            <Button 
                onClick={() => setView('login')} 
                className="w-full !bg-[#F1F8E9] border-2 !border-[#8BC34A] !text-[#558B2F] text-lg py-6 rounded-2xl shadow-lg transition-all font-bold justify-center hover:!bg-[#8BC34A] hover:!text-white"
            >
              כניסה למערכת
            </Button>

            {/* כפתור הרשמה */}
            <div className="pt-2 space-y-3">
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">משתמש/ת חדש/ה?</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <Button 
                    onClick={() => setView('dept_selection')} 
                    className="w-full bg-white border-2 border-[#E91E63] !text-[#E91E63] hover:bg-[#FCE4EC] text-lg py-6 rounded-2xl transition-all font-bold justify-center flex items-center gap-2"
                >
                    <UserPlus size={20} className="text-[#E91E63]" />
                    <span className="text-[#E91E63]">להרשמה</span>
                </Button>
            </div>
          </div>

          <div className="mt-16 text-xs text-gray-300 font-medium">© ארגון נוער חב"ד</div>
        </main>
      </div>
    );
  }

  // --- View: Login ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-gray-400 hover:text-[#00BCD4] transition-colors">
            <ArrowLeft size={24} className="rotate-180" />
        </button>

        <div className="w-full max-w-sm animate-fadeIn">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-800">התחברות</h2>
                <p className="text-gray-400 text-sm mt-1">הזן את פרטיך לכניסה למערכת</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Input label="תעודת זהות" name="idNumber" required onChange={handleInputChange} autoFocus />
              <Input label="סיסמה" type="password" name="password" required onChange={handleInputChange} />

              {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                      <span className="block w-1.5 h-1.5 bg-red-600 rounded-full"></span>{errorMsg}
                  </div>
              )}

              <Button type="submit" isLoading={loading} className="w-full mt-4 bg-[#00BCD4] hover:bg-cyan-600">כניסה</Button>
            </form>
        </div>
      </div>
    );
  }

  // --- View: Dept Selection ---
  if (view === 'dept_selection') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-8 mt-4">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-[#00BCD4]"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 1 מתוך 3</div>
        </header>

        <main className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">לאיזו מחלקה את/ה שייך/ת?</h2>
          <p className="text-center text-gray-400 mb-8 text-sm">בחר/י את המחלקה הרלוונטית להמשך ההרשמה</p>
          
          <div className="grid grid-cols-1 gap-3">
            {Object.keys(DEPARTMENTS_CONFIG).map((dept) => {
                const config = DEPARTMENTS_CONFIG[dept];
                return (
                    <button 
                        key={dept} 
                        onClick={() => { setSelectedDept(dept); setView('role_selection'); }}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-row items-center justify-between gap-4 relative bg-white
                        ${config.color} hover:shadow-md group`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 shrink-0">
                                <Image 
                                    src={config.logo} 
                                    alt={dept} 
                                    fill 
                                    className="object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo.png'; 
                                    }}
                                />
                            </div>
                            <span className="font-bold text-lg">{dept}</span>
                        </div>
                        <ArrowLeft size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                )
            })}
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
             <Button variant="dark" onClick={() => { setSelectedDept('בטיחות ומפעלים'); setSelectedRoleType('safety_admin'); setView('register_form'); }} className="w-full justify-center" icon={<ShieldCheck size={20} className="text-[#8BC34A]" />}>
                הרשמה למחלקת בטיחות ומפעלים
             </Button>
          </div>
        </main>
      </div>
    );
  }

  // --- View: Role Selection ---
  if (view === 'role_selection') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-8 mt-4">
            <button onClick={() => setView('dept_selection')} className="text-gray-400 hover:text-[#00BCD4]"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 2 מתוך 3</div>
        </header>

        <main className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">הגדרת תפקיד</h2>
          <p className="text-center text-gray-400 mb-8">מחלקה נבחרת: <span className="font-bold text-[#00BCD4]">{selectedDept}</span></p>
          
          <div className="space-y-4">
            {/* כפתור רכז - ורוד */}
            <button onClick={() => { setSelectedRoleType('coordinator'); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-pink-400 hover:bg-pink-50 text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 group-hover:text-pink-600">{getRoleLabel('coordinator')}</h3>
                    <p className="text-sm text-gray-400 mt-1">ניהול פעילות סניפית והגשת טיולים</p>
                  </div>
                  <Users className="text-gray-200 group-hover:text-pink-300 transition-colors" size={32} />
              </div>
            </button>

            {/* כפתור מטה - תכלת מותג (כמו שרצית) */}
            <button onClick={() => { setSelectedRoleType('dept_staff'); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-[#00BCD4] hover:bg-cyan-50 text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 group-hover:text-[#00BCD4]">{getRoleLabel('hq')}</h3>
                    <p className="text-sm text-gray-400 mt-1">מטה {selectedDept}</p>
                  </div>
                  <Briefcase className="text-gray-200 group-hover:text-[#00BCD4] transition-colors" size={32} />
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- View: Register Form ---
  if (view === 'register_form') {
    const isSafety = selectedRoleType === 'safety_admin';

    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-6 mt-4">
            <button onClick={() => isSafety ? setView('dept_selection') : setView('role_selection')} className="text-gray-400 hover:text-[#00BCD4]"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 3 מתוך 3</div>
        </header>

        <main className="w-full max-w-md bg-white p-5 md:p-8 rounded-[32px] shadow-sm border border-gray-100 animate-fadeIn">
            
            <h2 className="text-2xl font-black text-gray-800 mb-2">יצירת חשבון</h2>
            <div className="flex items-center gap-2 mb-6">
                <span className={`h-2 w-2 rounded-full ${isSafety ? 'bg-[#8BC34A]' : 'bg-[#00BCD4]'}`}></span>
                <p className="text-sm text-gray-500 font-bold">
                    {isSafety ? 'מחלקת בטיחות ומפעלים' : `${selectedDept} - ${getRoleLabel(selectedRoleType === 'coordinator' ? 'coordinator' : 'hq')}`}
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {selectedRoleType === 'coordinator' && (
                <Input label="שם הסניף" name="branch" required onChange={handleInputChange} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="שם מלא" name="fullName" required onChange={handleInputChange} />
                <Input label="טלפון נייד" name="phone" type="tel" required onChange={handleInputChange} />
              </div>

              <Input label="תעודת זהות" name="idNumber" required maxLength={9} onChange={handleInputChange} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="אימייל" name="email" type="email" required onChange={handleInputChange} />
                  <Input label="תאריך לידה" name="birthDate" type="date" required onChange={handleInputChange} />
              </div>

              <Input label="סיסמה" name="password" type="password" required minLength={6} placeholder="לפחות 6 תווים" onChange={handleInputChange} />

              {errorMsg && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-bold border border-red-100 text-center">{errorMsg}</p>}
              {successMsg && <div className="text-green-700 text-sm bg-green-50 p-4 rounded-lg font-bold border border-green-200 text-center">{successMsg}</div>}

              <Button type="submit" isLoading={loading} variant={isSafety ? 'dark' : 'primary'} className="w-full mt-6 bg-[#4CAF50] hover:bg-green-600">
                סיום הרשמה
              </Button>
            </form>
        </main>
      </div>
    );
  }

  return null;
}