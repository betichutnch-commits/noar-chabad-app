"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, LogIn, UserPlus, ShieldCheck, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation'; // שים לב: next/navigation ולא next/router

// --- הגדרות ---
const DEPARTMENTS = ["בת מלך", "בנות חב\"ד", "הפנסאים", "מועדוני המעשים הטובים", "תמים"];

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

export default function Home() {
  // ניהול מצבים (Views)
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

  // בדיקת התחברות אוטומטית - גרסה בטוחה ללא לופים
  useEffect(() => {
    const autoLogin = async () => {
      // 1. בדיקה שקטה האם יש סשן שמור בדפדפן
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setLoading(true); // מציג טעינה כדי שלא יראו את דף הנחיתה לשבריר שנייה
        try {
          // 2. אם יש סשן, מנסים לנתב אותו לפי התפקיד
          await checkRoleAndRedirect(session.user);
        } catch (error) {
          // 3. אם היה כישלון (למשל משתמש חסום), לא עושים ריפרש!
          // פשוט מנתקים אותו ומשאירים אותו בדף הבית
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

    console.log("Checking user role:", meta); // לוג לבדיקה

    if (user.email !== SUPER_ADMIN_EMAIL && status !== 'approved') {
        await supabase.auth.signOut();
        if (status === 'pending') {
            throw new Error('ההרשמה נקלטה אך טרם אושרה.');
        } else {
            throw new Error('הגישה למערכת נחסמה.');
        }
    }

    // 1. קודם כל מרעננים את הראוטר
      router.refresh(); 
      
      // 2. נותנים למערכת זמן לעכל את העוגייה (הגדלנו ל-500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. ניתוב
      if (meta.department === 'בטיחות ומפעלים' || meta.role === 'safety_admin') {
          console.log("Redirecting to manager..."); // לוג שיעזור לנו לראות אם הגענו לכאן
          router.push('/manager');
      } else {
          router.push('/dashboard');
      }
};

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- לוגיקה לכניסה ---
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');

    try {
        // תמיכה בהתחברות עם ת"ז או אימייל
        const email = formData.idNumber.includes('@') ? formData.idNumber : `${formData.idNumber}@noar.chabad.co.il`; 
        
        const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: formData.password });

        if (error) {
          setErrorMsg('שגיאה בהתחברות: בדוק את תעודת הזהות והסיסמה.');
          setLoading(false);
          return;
        }

        // אם הסיסמה נכונה, בודקים אם הוא מאושר
        await checkRoleAndRedirect(data.user);
        
    } catch (err: any) {
        console.error(err);
        // מציג את השגיאה שנזרקה מ-checkRoleAndRedirect (למשל: "טרם אושרת")
        setErrorMsg(err.message || 'שגיאה כללית במערכת');
        setLoading(false);
    }
  };

  // --- לוגיקה להרשמה ---
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
              status: 'pending' // <--- הוספה חשובה: ברירת מחדל לממתין
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

  // --- View: Landing ---
  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-white">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-cyan via-brand-green to-brand-pink"></div>
        
        <main className="max-w-md w-full text-center z-10 animate-fadeIn">
          <div className="mb-8 flex justify-center">
             <div className="bg-white p-6 rounded-full shadow-xl w-40 h-40 flex items-center justify-center border-4 border-white ring-1 ring-gray-100">
                <img src="/logo.png" alt="לוגו נוער חב״ד" className="w-full h-full object-contain"/>
             </div>
          </div>

          <h1 className="text-3xl font-black mb-3 text-brand-green leading-tight">
            ברוכים הבאים למערכת הטיולים והאירועים של ארגון נוער חב"ד
          </h1>
          
          <h2 className="text-lg text-gray-500 font-medium mb-10 px-4">
            פלטפורמת הניהול לתכנון, אישור ובקרה – הכל במקום אחד
          </h2>

          <div className="space-y-4">
            <Button onClick={() => setView('login')} className="w-full justify-between group" icon={<LogIn size={20} />}>
              כניסה למערכת
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">משתמש חדש?</span></div>
            </div>

            <Button onClick={() => setView('dept_selection')} variant="outline" className="w-full justify-center gap-2" icon={<UserPlus size={20} />}>
              הרשמה למערכת
            </Button>
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
        <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-gray-400 hover:text-brand-cyan transition-colors">
            <ArrowLeft size={24} className="rotate-180" />
        </button>

        <div className="w-full max-w-sm animate-fadeIn">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-brand-dark">התחברות</h2>
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

              <Button type="submit" isLoading={loading} className="w-full mt-4">כניסה</Button>
            </form>
        </div>
      </div>
    );
  }

  // --- View: Dept Selection ---
  if (view === 'dept_selection') {
    return (
      <div className="min-h-screen bg-bg-light p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-10 mt-4">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-brand-cyan"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 1 מתוך 3</div>
        </header>

        <main className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-black text-brand-dark mb-2 text-center">לאיזו מחלקה בארגון את/ה שייך/ת?</h2>
          <p className="text-center text-gray-400 mb-8 text-sm">בחר את המחלקה הרלוונטית להמשך ההרשמה</p>
          
          <div className="space-y-3">
            {DEPARTMENTS.map((dept) => (
                <button key={dept} onClick={() => { setSelectedDept(dept); setView('role_selection'); }}
                  className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-brand-cyan hover:shadow-md transition-all text-right font-bold text-gray-700 hover:text-brand-cyan flex justify-between items-center group">
                  <span className="text-lg">{dept}</span>
                  <ArrowLeft size={18} className="text-gray-300 group-hover:text-brand-cyan transition-colors" />
                </button>
            ))}
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
             <Button variant="dark" onClick={() => { setSelectedDept('בטיחות ומפעלים'); setSelectedRoleType('safety_admin'); setView('register_form'); }} className="w-full" icon={<ShieldCheck size={20} className="text-brand-green" />}>
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
      <div className="min-h-screen bg-bg-light p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-10 mt-4">
            <button onClick={() => setView('dept_selection')} className="text-gray-400 hover:text-brand-cyan"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 2 מתוך 3</div>
        </header>

        <main className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-black text-brand-dark mb-2 text-center">הגדרת תפקיד</h2>
          <p className="text-center text-gray-400 mb-8">מחלקה נבחרת: <span className="font-bold text-brand-cyan">{selectedDept}</span></p>
          
          <div className="space-y-4">
            <button onClick={() => { setSelectedRoleType('coordinator'); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-brand-cyan text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-brand-cyan">רכז/ת סניף</h3>
                    <p className="text-sm text-gray-400 mt-1">ניהול פעילות סניפית והגשת טיולים</p>
                  </div>
                  <Users className="text-gray-200 group-hover:text-brand-cyan transition-colors" size={32} />
              </div>
            </button>

            <button onClick={() => { setSelectedRoleType('dept_staff'); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-brand-pink text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-brand-pink">צוות מטה</h3>
                    <p className="text-sm text-gray-400 mt-1">מטה {selectedDept} (ללא הרשאות בטיחות)</p>
                  </div>
                  <Briefcase className="text-gray-200 group-hover:text-brand-pink transition-colors" size={32} />
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
      <div className="min-h-screen bg-bg-light p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-6 mt-4">
            <button onClick={() => isSafety ? setView('dept_selection') : setView('role_selection')} className="text-gray-400 hover:text-brand-cyan"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 3 מתוך 3</div>
        </header>

        <main className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-fadeIn">
            
            <h2 className="text-2xl font-black text-brand-dark mb-2">יצירת חשבון</h2>
            <div className="flex items-center gap-2 mb-6">
                <span className={`h-2 w-2 rounded-full ${isSafety ? 'bg-brand-green' : 'bg-brand-cyan'}`}></span>
                <p className="text-sm text-gray-500 font-bold">
                    {isSafety ? 'מחלקת בטיחות ומפעלים' : `${selectedDept} - ${selectedRoleType === 'coordinator' ? 'רכז סניף' : 'צוות מטה'}`}
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {selectedRoleType === 'coordinator' && (
                <Input label="שם הסניף" name="branch" required onChange={handleInputChange} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input label="שם מלא" name="fullName" required onChange={handleInputChange} />
                <Input label="טלפון נייד" name="phone" type="tel" required onChange={handleInputChange} />
              </div>

              <Input label="תעודת זהות" name="idNumber" required maxLength={9} onChange={handleInputChange} />

              <div className="grid grid-cols-2 gap-4">
                 <Input label="אימייל" name="email" type="email" required onChange={handleInputChange} />
                 <Input label="תאריך לידה" name="birthDate" type="date" required onChange={handleInputChange} />
              </div>

              <Input label="סיסמה" name="password" type="password" required minLength={6} placeholder="לפחות 6 תווים" onChange={handleInputChange} />

              {errorMsg && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-bold border border-red-100 text-center">{errorMsg}</p>}
              {successMsg && <div className="text-green-700 text-sm bg-green-50 p-4 rounded-lg font-bold border border-green-200 text-center">{successMsg}</div>}

              <Button type="submit" isLoading={loading} variant={isSafety ? 'dark' : 'primary'} className="w-full mt-6">
                סיום הרשמה
              </Button>
            </form>
        </main>
      </div>
    );
  }

  return null;
}