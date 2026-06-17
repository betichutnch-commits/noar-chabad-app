"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, UserPlus, ShieldCheck, Users, Briefcase, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input'; 
import { Modal } from '@/components/ui/Modal'; 
import { useRouter } from 'next/navigation';
import Image from 'next/image'; 

// ייבוא הסכמות החדשות
import { loginSchema, registerSchema } from '@/lib/schemas';
import { DEPARTMENTS_CONFIG } from '@/lib/constants'; 
import type { User } from '@supabase/supabase-js';
import { getCoordinatorRoleTitle, getDeptTripsOfficerTitle, isDeptReviewOfficer, isManagerUser } from '@/lib/auth';
import { isUserApprovedForAppAccess } from '@/lib/accountApproval';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'landing' | 'login' | 'dept_selection' | 'role_selection' | 'register_form' | 'reset_password'>('landing');
  const [loading, setLoading] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  
  // ניהול הצגת סיסמה
  const [showPassword, setShowPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // ניהול מודל
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm: undefined });

  const closeModal = () => setModal((m) => ({ ...m, isOpen: false }));

  const appModal = (
    <Modal
      isOpen={modal.isOpen}
      onClose={closeModal}
      type={modal.type}
      title={modal.title}
      message={modal.message}
      onConfirm={modal.onConfirm}
    />
  );

  // דאטה
  const [selectedDept, setSelectedDept] = useState(''); 
  const [selectedRoleType, setSelectedRoleType] = useState('');
  const [isDeptTripsOfficerSignup, setIsDeptTripsOfficerSignup] = useState(false);
  const [formData, setFormData] = useState({
    idNumber: '', password: '', firstName: '', lastName: '', phone: '', email: '', birthDate: '', branch: '', role: ''
  });
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirmPassword: '' });

  const getRoleLabel = (roleType: 'coordinator' | 'hq' | 'dept_trips_officer') => {
    if (roleType === 'coordinator') return getCoordinatorRoleTitle(selectedDept);
    if (roleType === 'dept_trips_officer') return getDeptTripsOfficerTitle(selectedDept);
    return 'צוות מטה';
  };

  const checkRoleAndRedirect = useCallback(async (user: User) => {
    const meta = (user.user_metadata || {}) as Record<string, string>;
    const status = meta.status || 'pending';

    if (!isUserApprovedForAppAccess(user)) {
        await supabase.auth.signOut();
        throw new Error(status === 'pending' ? 'ההרשמה נקלטה אך טרם אושרה.' : 'הגישה למערכת נחסמה.');
    }

    router.refresh(); 
    await new Promise(resolve => setTimeout(resolve, 500));

    if (isDeptReviewOfficer(user)) {
        router.push('/hq/dept-review');
    } else if (isManagerUser(user)) {
        router.push('/manager');
    } else {
        router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const hasRecoveryInUrl = () => {
      if (typeof window === 'undefined') return false;
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashType = hashParams.get('type');
      return hashType === 'recovery' || url.searchParams.get('view') === 'reset-password';
    };

    const autoLogin = async () => {
      if (hasRecoveryInUrl()) {
        setView('reset_password');
        return;
      }

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

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset_password');
        showModal('info', 'איפוס סיסמה', 'נא להזין סיסמה חדשה כדי להשלים את האיפוס.');
      }
    });

    autoLogin();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkRoleAndRedirect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('pending') === '1') {
      showModal('info', 'ממתינים לאישור', 'ההרשמה נקלטה אך טרם אושרה. לאחר אישור ממחלקת הבטיחות תוכל/י להתחבר.');
      url.searchParams.delete('pending');
      const qs = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toAuthEmail = (identifier: string) => {
    const cleaned = identifier.trim();
    return cleaned.includes('@') ? cleaned : `${cleaned}@noar.chabad.co.il`;
  };

  const handleSendResetEmail = async () => {
    if (!forgotIdentifier.trim()) {
      showModal('error', 'חסר נתון', 'נא להזין תעודת זהות או אימייל כדי לשלוח קישור איפוס.');
      return;
    }

    setSendingResetEmail(true);
    try {
      const email = toAuthEmail(forgotIdentifier);
      const redirectTo = `${window.location.origin}/?view=reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showModal('success', 'הקישור נשלח', 'שלחנו למייל שלך קישור לאיפוס סיסמה. אם המשתמש קיים במערכת, ההודעה תגיע תוך כמה דקות.');
      setForgotIdentifier('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      showModal('error', 'שגיאה בשליחת הקישור', message);
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetPasswordData.password.length < 6) {
      showModal('error', 'סיסמה חלשה', 'הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      showModal('error', 'אי התאמה', 'הסיסמאות לא תואמות. נא לנסות שוב.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: resetPasswordData.password });
      if (error) throw error;

      showModal('success', 'הסיסמה עודכנה', 'הסיסמה עודכנה בהצלחה. ניתן להתחבר עם הסיסמה החדשה.');
      setResetPasswordData({ password: '', confirmPassword: '' });
      setView('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      showModal('error', 'שגיאה בעדכון סיסמה', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. ולידציה עם Zod
    const validation = loginSchema.safeParse({
        idNumber: formData.idNumber,
        password: formData.password
    });

    if (!validation.success) {
        showModal('error', 'נתונים שגויים', validation.error.issues[0].message);
        return;
    }

    setLoading(true);

    try {
        const email = formData.idNumber.includes('@') ? formData.idNumber : `${formData.idNumber}@noar.chabad.co.il`; 
        const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: formData.password });

        if (error) {
          showModal('error', 'שגיאה בהתחברות', 'פרטי הזיהוי שגויים, או שהמשתמש טרם אושר.');
          setLoading(false);
          return;
        }
        await checkRoleAndRedirect(data.user);
    } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'שגיאה כללית במערכת';
        showModal('error', 'שגיאה', message);
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const effectiveRole = selectedRoleType;
    const canDeptReview = selectedRoleType === 'dept_staff' ? isDeptTripsOfficerSignup : false;

    // 1. ולידציה עם Zod
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    const validation = registerSchema.safeParse({
        branch: selectedRoleType === 'coordinator' ? formData.branch : undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        idNumber: formData.idNumber,
        email: formData.email,
        birthDate: formData.birthDate,
        password: formData.password
    });

    if (!validation.success) {
        showModal('error', 'שגיאה בטופס', validation.error.issues[0].message);
        return;
    }

    setLoading(true);

    try {
        const email = `${formData.idNumber}@noar.chabad.co.il`;
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email,
          password: formData.password,
          options: {
            data: {
              full_name: fullName,
              first_name: formData.firstName,
              official_name: formData.firstName,
              last_name: formData.lastName,
              identity_number: formData.idNumber,
              department: selectedDept, 
              role: effectiveRole,
              can_dept_review: canDeptReview,
              branch_name: selectedRoleType === 'coordinator' ? formData.branch : null,
              phone: formData.phone,
              contact_email: formData.email,
              birth_date: formData.birthDate,
              status: 'pending'
            },
          },
        });

        if (error) {
          showModal('error', 'שגיאה בהרשמה', error.message);
          setLoading(false);
        } else {
          if (signUpData.session?.access_token) {
            try {
              await fetch('/api/auth/notify-registration', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${signUpData.session.access_token}`,
                },
                credentials: 'include',
              });
            } catch {
              /* התראה לא קריטית לשמירת ההרשמה */
            }
          }
          await supabase.auth.signOut();
          setLoading(false);
          setView('login');
          showModal('success', 'ההרשמה נקלטה!', 'הפרטים נשלחו לאישור מנהל.\nתקבל הודעה כשהחשבון יאושר.');
        }
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
  };

  // --- View: Landing (דף כניסה) ---
  if (view === 'landing') {
    return (
      <>
      {appModal}
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00BCD4] via-[#4CAF50] to-[#E91E63]"></div>
        
        <main className="max-w-md w-full text-center space-y-8 relative z-10 animate-fadeIn">
          
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
            <h1 className="text-4xl md:text-4xl font-black text-[#00BCD4] leading-tight drop-shadow-sm">
                מערכת הטיולים והאירועים
                <span className="block text-2xl md:text-3xl text-gray-800 mt-1">של ארגון נוער חב״ד</span>
            </h1>
            
            <p className="text-gray-500 font-medium text-lg px-4">
                  פלטפורמת הניהול לתכנון, אישור ובקרה של פעילויות שוברות שגרה
            </p>
          </div>

          <div className="space-y-4 pt-4 px-6">
            <Button 
                onClick={() => setView('login')} 
                className="w-full !bg-[#F1F8E9] border-2 !border-[#8BC34A] !text-[#558B2F] py-4 rounded-2xl shadow-lg transition-all font-bold justify-center hover:!bg-[#8BC34A] hover:!text-white"
            >
              כניסה למערכת
            </Button>

            <div className="pt-2 space-y-3">
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">משתמש/ת חדש/ה?</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <Button 
                    onClick={() => setView('dept_selection')} 
                    variant="outline" 
                    className="w-full bg-white border-2 !border-[#E91E63] !text-[#E91E63] hover:!bg-pink-50 py-4 rounded-2xl transition-all font-bold justify-center flex items-center gap-2 shadow-sm hover:shadow-pink-100"
                >
                    <UserPlus size={20} className="text-[#E91E63]" />
                    <span className="text-[#E91E63]">להרשמה</span>
                </Button>
            </div>
          </div>

          <div className="mt-16 text-xs text-gray-300 font-medium">© ארגון נוער חב״ד</div>
        </main>
      </div>
      </>
    );
  }

  // --- View: Login ---
  if (view === 'login') {
    return (
      // שינוי: במובייל מתחיל מלמעלה (justify-start pt-24), במחשב ממורכז (md:justify-center)
      <div className="min-h-screen bg-white flex flex-col items-center justify-start pt-24 md:justify-center md:pt-0 p-6 transition-all">
        {appModal}
          
        <button onClick={() => { setShowResetPassword(false); setView('landing'); }} className="absolute top-6 right-6 text-gray-400 hover:text-[#E91E63] transition-colors">
            <ArrowLeft size={24} className="rotate-180" />
        </button>

        <div className="w-full max-w-sm animate-fadeIn">
            <div className="text-center mb-8">
               <h2 className="text-4xl font-black text-[#00BCD4]">התחברות</h2>
              <p className="text-gray-400 text-sm mt-1">הזן את פרטיך לכניסה למערכת</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Input 
                label="תעודת זהות" 
                name="idNumber" 
                required 
                onChange={handleInputChange} 
                autoFocus 
                className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20"
              />
              
              <div className="relative">
                  <Input 
                    label="סיסמה" 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    required 
                    onChange={handleInputChange} 
                    className="pl-10 focus:!border-[#E91E63] focus:!ring-[#E91E63]/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-[38px] z-10 text-gray-400 hover:text-[#E91E63] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
              </div>

              <div className="flex justify-center -mt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-xs font-bold text-brand-cyan hover:underline"
                >
                  שכחתי סיסמה
                </button>
              </div>

              <Button 
  type="submit" 
  isLoading={loading} 
  variant="secondary" // זה מבטיח שהכפתור יישאר ירוק גם בטעינה
  className="w-full mt-4"
>
  כניסה
</Button>
            </form>
        </div>

        {showResetPassword && (
          <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface-card rounded-3xl border border-border-subtle shadow-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-brand-cyan" />
                <h3 className="font-black text-text-primary">איפוס סיסמה</h3>
              </div>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                הזן/י תעודת זהות או אימייל. נשלח קישור להגדרת סיסמה חדשה.
              </p>
              <Input
                value={forgotIdentifier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotIdentifier(e.target.value)}
                placeholder="תעודת זהות או אימייל"
                autoFocus
              />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResetPassword(false)}
                >
                  ביטול
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  isLoading={sendingResetEmail}
                  onClick={handleSendResetEmail}
                >
                  שליחה
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'reset_password') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start pt-24 md:justify-center md:pt-0 p-6 transition-all">
        {appModal}

        <button onClick={() => setView('login')} className="absolute top-6 right-6 text-gray-400 hover:text-brand-pink transition-colors">
          <ArrowLeft size={24} className="rotate-180" />
        </button>

        <div className="w-full max-w-sm animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-brand-cyan">סיסמה חדשה</h2>
            <p className="text-gray-400 text-sm mt-1">הזינו סיסמה חדשה ואשרו אותה</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="relative">
              <Input
                label="סיסמה חדשה"
                type={showPassword ? 'text' : 'password'}
                required
                value={resetPasswordData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResetPasswordData((prev) => ({ ...prev, password: e.target.value }))
                }
                className="pl-10 focus:!border-brand-pink focus:!ring-pink-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-[38px] z-10 text-gray-400 hover:text-brand-pink transition-colors"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            <div className="relative">
              <Input
                label="אימות סיסמה חדשה"
                type={showResetConfirmPassword ? 'text' : 'password'}
                required
                value={resetPasswordData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResetPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="pl-10 focus:!border-brand-pink focus:!ring-pink-100"
              />
              <button
                type="button"
                onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                className="absolute left-3 top-[38px] z-10 text-gray-400 hover:text-brand-pink transition-colors"
              >
                {showResetConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            <Button type="submit" isLoading={loading} variant="secondary" className="w-full mt-4">
              עדכון סיסמה
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // --- View: Dept Selection ---
  if (view === 'dept_selection') {
    return (
      <>
      {appModal}
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
             <Button variant="dark" onClick={() => { setSelectedDept('בטיחות ומפעלים'); setSelectedRoleType('safety_admin'); setIsDeptTripsOfficerSignup(false); setView('register_form'); }} className="w-full justify-center" icon={<ShieldCheck size={20} className="text-[#8BC34A]" />}>
                הרשמה למחלקת בטיחות ומפעלים
             </Button>
          </div>
        </main>
      </div>
      </>
    );
  }

  // --- View: Role Selection ---
  if (view === 'role_selection') {
    return (
      <>
      {appModal}
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-8 mt-4">
            <button onClick={() => setView('dept_selection')} className="text-gray-400 hover:text-[#00BCD4]"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 2 מתוך 3</div>
        </header>

        <main className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">הגדרת תפקיד</h2>
          <p className="text-center text-gray-400 mb-8">מחלקה נבחרת: <span className="font-bold text-[#00BCD4]">{selectedDept}</span></p>
          
          <div className="space-y-4">
            <button onClick={() => { setSelectedRoleType('coordinator'); setIsDeptTripsOfficerSignup(false); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-pink-400 hover:bg-pink-50 text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 group-hover:text-pink-600">{getRoleLabel('coordinator')}</h3>
                    <p className="text-sm text-gray-400 mt-1">ניהול פעילות סניפית והגשת טיולים</p>
                  </div>
                  <Users className="text-gray-200 group-hover:text-pink-300 transition-colors" size={32} />
              </div>
            </button>

            <button onClick={() => { setSelectedRoleType('dept_staff'); setIsDeptTripsOfficerSignup(false); setView('register_form'); }}
              className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-[#00BCD4] hover:bg-cyan-50 text-right group relative overflow-hidden transition-all">
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 group-hover:text-[#00BCD4]">{getRoleLabel('hq')}</h3>
                    <p className="text-sm text-gray-400 mt-1">מטה {selectedDept} (כולל אפשרות לסמן {getRoleLabel('dept_trips_officer')} בשלב הבא)</p>
                  </div>
                  <Briefcase className="text-gray-200 group-hover:text-[#00BCD4] transition-colors" size={32} />
              </div>
            </button>
          </div>
        </main>
      </div>
      </>
    );
  }

  // --- View: Register Form ---
  if (view === 'register_form') {
    const isSafety = selectedRoleType === 'safety_admin';

    return (
      <>
      {appModal}
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center">
        <header className="w-full max-w-md flex justify-between items-center mb-6 mt-4">
            <button onClick={() => { closeModal(); setView(isSafety ? 'dept_selection' : 'role_selection'); }} className="text-gray-400 hover:text-[#00BCD4]"><ArrowLeft className="rotate-180"/></button>
            <div className="text-xs font-bold text-gray-300">שלב 3 מתוך 3</div>
        </header>

        <main className="w-full max-w-md bg-white p-5 md:p-8 rounded-[32px] shadow-sm border border-gray-100 animate-fadeIn">
            
            <h2 className="text-2xl font-black text-gray-800 mb-2">יצירת חשבון</h2>
            <div className="flex items-center gap-2 mb-6">
                <span className={`h-2 w-2 rounded-full ${isSafety ? 'bg-[#8BC34A]' : 'bg-[#00BCD4]'}`}></span>
                <p className="text-sm text-gray-500 font-bold">
                    {isSafety
                      ? 'מחלקת בטיחות ומפעלים'
                      : `${selectedDept} - ${getRoleLabel(
                          selectedRoleType === 'coordinator'
                            ? 'coordinator'
                            : selectedRoleType === 'dept_staff' && isDeptTripsOfficerSignup
                              ? 'dept_trips_officer'
                              : 'hq',
                        )}`}
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {selectedRoleType === 'coordinator' && (
                <Input label="שם הסניף" name="branch" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input label="שם פרטי" name="firstName" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />
                <Input label="שם משפחה" name="lastName" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />
              </div>

              <Input label="טלפון נייד" name="phone" type="tel" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />

              <Input label="תעודת זהות" name="idNumber" required maxLength={9} onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="אימייל" name="email" type="email" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />
                  <Input label="תאריך לידה" name="birthDate" type="date" required onChange={handleInputChange} className="focus:!border-[#E91E63] focus:!ring-[#E91E63]/20" />
              </div>

              <div className="relative">
                  <Input 
                    label="סיסמה" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    minLength={6} 
                    placeholder="לפחות 6 תווים" 
                    onChange={handleInputChange} 
                    className="pl-10 focus:!border-[#E91E63] focus:!ring-[#E91E63]/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-[38px] z-10 text-gray-400 hover:text-[#E91E63] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
              </div>

              {selectedRoleType === 'dept_staff' && (
                <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDeptTripsOfficerSignup}
                    onChange={(e) => setIsDeptTripsOfficerSignup(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-amber-500"
                  />
                  <div className="text-sm">
                    <div className="font-bold text-amber-800">הרשאת אישור ראשוני מחלקתי</div>
                    <div className="text-amber-700">סימון זה יפעיל עבורך הרשאת אישור ראשוני ל{getCoordinatorRoleTitle(selectedDept).replace(' סניף', '')} (בנוסף לתפקיד צוות מטה).</div>
                  </div>
                </label>
              )}

              <Button type="submit" isLoading={loading} className="w-full mt-6 bg-[#8BC34A] hover:bg-green-600 shadow-green-200 border border-transparent">
                סיום הרשמה
              </Button>
            </form>
        </main>
      </div>
      </>
    );
  }

  return null;
}