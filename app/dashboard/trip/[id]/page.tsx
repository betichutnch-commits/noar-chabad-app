"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Loader2, Calendar, Users, Clock, ArrowRight, 
  FileText, ShieldCheck, AlertTriangle, CheckCircle, 
  Share2, Printer, Phone, User, Paperclip, MapPin, 
  Mail, CreditCard, Plus, UserPlus, Briefcase, 
  Hash, Building2, Tent, Info, X, Edit2, Trash2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORY_STYLES, TRIP_TYPES_CONFIG } from '@/lib/constants'
import { formatHebrewDateRange, formatHebrewDate } from '@/lib/dateUtils'

// --- רכיב הודעה קופצת (Modal) ---
const CustomAlert = ({ isOpen, type, title, message, onConfirm, onCancel, confirmText = "אישור", cancelText = "ביטול" }: any) => {
    if (!isOpen) return null;
    
    const isConfirm = type === 'confirm';
    const iconColor = type === 'error' ? 'text-red-500' : (type === 'success' ? 'text-green-500' : 'text-blue-500');
    const Icon = type === 'error' ? AlertTriangle : (type === 'success' ? CheckCircle : Info);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-full bg-gray-50 ${iconColor}`}>
                        <Icon size={32} />
                    </div>
                    <h3 className="text-lg font-black text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
                    
                    <div className="flex gap-3 w-full mt-4">
                        {isConfirm && (
                            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
                                {cancelText}
                            </button>
                        )}
                        <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-[#00BCD4] hover:bg-cyan-600 shadow-cyan-200'}`}>
                            {confirmText}
                        </button>
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
  const [newStaffData, setNewStaffData] = useState({
      name: '',
      idNumber: '',
      phone: '',
      email: '',
      role: ''
  });

  const [alertConfig, setAlertConfig] = useState<any>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: string, title: string, message: string, onConfirm?: any) => {
      setAlertConfig({ isOpen: true, type, title, message, onConfirm: onConfirm || closeAlert });
  };

  const closeAlert = () => {
      setAlertConfig({ ...alertConfig, isOpen: false });
  };

  useEffect(() => {
    const fetchTripAndProfile = async () => {
      const { data: tripData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error || !tripData) {
        router.push('/dashboard');
        return;
      }
      setTrip(tripData);

      if (tripData.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', tripData.user_id)
            .single();
          setProfile(profileData || {});
      }
      setLoading(false);
    };
    fetchTripAndProfile();
  }, [params.id, router]);

  const formatDayMonth = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${d}.${m}`;
  };

  const formatDateShortYear = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear().toString().slice(-2);
      return `${d}.${m}.${y}`;
  };

  const getYear = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).getFullYear();
  };

  const calculateDuration = (startStr: string, endStr: string) => {
      if (!startStr || !endStr) return 1;
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getCategoryBorder = (category: string) => {
      switch (category) {
          case 'transport': return 'border-blue-500';
          case 'activity': return 'border-pink-500';
          case 'food': return 'border-orange-500';
          case 'sleeping': return 'border-purple-500';
          case 'security': return 'border-green-500';
          case 'ceremony': return 'border-yellow-500';
          case 'hiking': return 'border-green-600';
          case 'attraction': return 'border-pink-600';
          case 'settlement': return 'border-indigo-500';
          default: return 'border-cyan-500';
      }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
      if (navigator.share) {
          try { await navigator.share({ title: trip.name, text: trip.name, url: window.location.href }); } catch (err) {}
      } else {
          navigator.clipboard.writeText(window.location.href);
          showAlert('success', 'הקישור הועתק', 'קישור לעמוד הטיול הועתק ללוח.');
      }
  };

  const handleDeleteSecondaryStaff = async () => {
      setAlertConfig({
          isOpen: true, 
          type: 'confirm', 
          title: 'מחיקת איש צוות', 
          message: 'האם את/ה בטוח/ה שברצונך להסיר את האחראי/ת הנוסף/ת?',
          onConfirm: async () => {
              const updatedDetails = { ...trip.details };
              delete updatedDetails.secondaryStaffObj;
              const { error } = await supabase.from('trips').update({ details: updatedDetails }).eq('id', trip.id);
              if (!error) {
                  setTrip({ ...trip, details: updatedDetails });
                  setIsAddingStaff(false);
                  closeAlert();
              }
          },
          onCancel: closeAlert
      });
  };

  const handleEditSecondaryStaff = () => {
      if (trip.details?.secondaryStaffObj) {
          setNewStaffData(trip.details.secondaryStaffObj);
          setIsAddingStaff(true);
      }
  };

  const handleSaveSecondaryStaff = async () => {
      if (!newStaffData.name.trim() || !newStaffData.idNumber.trim() || !newStaffData.phone.trim() || !newStaffData.email.trim() || !newStaffData.role.trim()) {
          showAlert('error', 'חסרים פרטים', 'חובה למלא את כל השדות (שם, תפקיד, ת"ז, טלפון, אימייל) כדי לשמור.');
          return;
      }

      setIsVerifying(true);

      const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id, official_name, last_name')
          .eq('identity_number', newStaffData.idNumber)
          .single();

      if (checkError || !existingUser) {
          showAlert('error', 'משתמש לא נמצא', 'תעודת הזהות שהזנת אינה קיימת במערכת. לא ניתן להוסיף איש צוות שאינו רשום.');
          setIsVerifying(false);
          return;
      }

      const updatedDetails = { 
          ...trip.details, 
          secondaryStaffObj: {
              ...newStaffData,
              userId: existingUser.id,
              verifiedName: `${existingUser.official_name} ${existingUser.last_name}`
          } 
      };

      const { error: updateError } = await supabase
          .from('trips')
          .update({ details: updatedDetails })
          .eq('id', trip.id);

      if (!updateError) {
          await supabase.from('notifications').insert({
              user_id: existingUser.id,
              title: 'שיבוץ לטיול',
              message: `שובצת כגורם אחראי בטיול: ${trip.name}`,
              link: `/dashboard/trip/${trip.id}`,
              type: 'assignment'
          });

          setTrip({ ...trip, details: updatedDetails });
          setIsAddingStaff(false);
          setNewStaffData({ name: '', idNumber: '', phone: '', email: '', role: '' });
          showAlert('success', 'הוספה בוצעה', `המשתמש ${existingUser.official_name} נוסף בהצלחה והודעה נשלחה אליו.`);
      }
      setIsVerifying(false);
  };

  // --- טיפול בעריכת הטיול ---
  const handleEditTrip = () => {
      if (trip.status === 'draft') {
          router.push(`/dashboard/new-trip?id=${trip.id}`);
          return;
      }

      showAlert(
          'confirm',
          'עריכת טיול פעיל',
          'שים לב: הטיול כבר נשלח לאישור. ביצוע עריכה יחזיר את סטטוס הטיול ל"ממתין לאישור" ויחייב בדיקה מחדש של מחלקת הבטיחות והמפעלים. האם להמשיך?',
          () => {
              router.push(`/dashboard/new-trip?id=${trip.id}`);
          }
      );
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  if (!trip) return null;

  const d = trip.details || {};
  const timeline = d.timeline || [];
  const typeConfig = TRIP_TYPES_CONFIG.find(t => t.id === d.tripType) || TRIP_TYPES_CONFIG[4];
  
  const deptName = trip.department || '';
  const isFemale = deptName.includes('בת מלך') || deptName.includes('בנות חב"ד') || deptName.includes('בנות חב״ד');
  
  const isHQ = (profile?.role === 'safety_admin' || profile?.role === 'dept_staff' || profile?.role === 'admin' || trip.branch === 'מטה');

  const participantsTitle = isFemale ? 'סה"כ משתתפות' : 'סה"כ משתתפים'; 
  const traineesLabel = isFemale ? 'חניכות' : 'חניכים';
  const boxTitle = isFemale ? 'אחראית הפעילות' : 'אחראי הפעילות';
  const addStaffBtnLabel = isFemale ? 'הוספת אחראית טיול' : 'הוספת אחראי טיול';
  const secondStaffTitle = isFemale ? 'אחראית נוספת' : 'אחראי נוסף';
  const namePlaceholder = "שם מלא כפי שמופיע בתעודת זהות";
  
  let subRoleDisplay = '';
  if (isHQ) {
      const dept = profile?.department || trip.department || '';
      subRoleDisplay = `צוות מטה • ${dept}`;
  } else {
      const roleBase = isFemale ? 'רכזת סניף' : 'רכז סניף';
      const branchName = trip.branch || '';
      subRoleDisplay = `${roleBase} • ${branchName}`;
  }

  const missingDocsCount = timeline.filter((t: any) => t.requiresLicense && (!t.licenseFile || !t.insuranceFile)).length;
  const durationDays = calculateDuration(trip.start_date, d.endDate);

  const showSecondaryStaffCard = d.secondaryStaffObj && !isAddingStaff;
  const showAddStaffForm = isHQ && (isAddingStaff || !d.secondaryStaffObj);

  const getStatusBadge = (status: string) => {
      const styles: any = {
          approved: { text: 'מאושר', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircle },
          pending: { text: 'ממתין לאישור', bg: 'bg-orange-100', textCol: 'text-orange-700', icon: Clock },
          rejected: { text: 'לא אושר', bg: 'bg-red-100', textCol: 'text-red-700', icon: AlertTriangle },
          draft: { text: 'טיוטה', bg: 'bg-gray-100', textCol: 'text-gray-600', icon: FileText },
          cancelled: { text: 'בוטל', bg: 'bg-gray-200', textCol: 'text-gray-500', icon: AlertTriangle }
      };
      const conf = styles[status] || styles.pending;
      const Icon = conf.icon;
      return (
          // התאמה למובייל: text-xs, הקטנת ריפוד
          <div className={`flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold ${conf.bg} ${conf.textCol} shadow-sm border border-white/20 shrink-0`}>
              <Icon size={14} className="md:w-4 md:h-4"/> {conf.text}
          </div>
      );
  };

  const DateBox = ({ dateStr }: { dateStr: string }) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return (
          <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 min-w-[60px] md:min-w-[75px] text-center h-full shadow-inner shrink-0">
              <div className="text-base md:text-lg font-black text-gray-800 leading-none mb-0.5">{date.getDate()}.{date.getMonth() + 1}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-gray-400">{date.getFullYear()}</div>
              <div className="w-full h-px bg-gray-200 my-1.5"></div>
              <div className="text-[9px] md:text-[10px] font-bold text-gray-500 leading-tight">{formatHebrewDate(dateStr)}</div>
          </div>
      );
  };

  return (
    <>
      <Header title="פרטי פעילות" />
      <CustomAlert {...alertConfig} onCancel={closeAlert} />
      
      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[1600px] mx-auto print:p-0">
        
        <button 
            onClick={() => router.back()} 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 transition-colors font-bold text-sm print:hidden"
        >
            <ArrowRight size={18}/> חזרה
        </button>

        {/* --- כרטיס עליון --- */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden mb-8 print:shadow-none print:border-none">
            
            {/* רקע וHeader */}
            <div className={`h-auto py-6 md:h-32 ${typeConfig.bg} relative overflow-hidden flex items-center px-4 md:px-8`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                {/* Flex Container למובייל */}
                <div className="relative z-10 w-full flex flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start md:items-center gap-4">
                        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-lg text-gray-700 hidden md:block">
                            {React.createElement(typeConfig.icon, { size: 36, className: typeConfig.text })}
                        </div>
                        <div>
                            {/* פונטים מוקטנים במובייל */}
                            <div className={`text-sm md:text-xl font-black uppercase tracking-wider mb-1 ${typeConfig.text} opacity-90 drop-shadow-sm`}>
                                {d.tripType}
                            </div>
                            <h1 className="text-xl md:text-4xl font-black text-gray-900 leading-none">{trip.name}</h1>
                        </div>
                    </div>
                    {getStatusBadge(trip.status)}
                </div>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-6 divide-y md:divide-y-0 md:divide-x divide-x-reverse divide-gray-100">
                
                {/* 1. זמנים - col-span-2 תמיד (תופס רוחב מלא במובייל, 2/7 בדסקטופ) */}
                <div className="col-span-2 md:col-span-2 text-center md:text-right pl-0 md:pl-2 flex flex-col justify-center">
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col gap-3">
                        
                        <div className="flex justify-between items-center w-full gap-1">
                            {/* התחלה */}
                            <div className="flex flex-col items-center flex-1">
                                <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wide">התחלה</span>
                                <span className="text-base md:text-lg font-black text-gray-800 leading-none mb-1">
                                    {formatDateShortYear(trip.start_date)}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    {d.startTime || '--:--'}
                                </span>
                            </div>

                            <div className="w-px h-10 bg-gray-300 mx-1 md:mx-2"></div>

                            {/* סיום */}
                            <div className="flex flex-col items-center flex-1">
                                <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wide">סיום</span>
                                <span className="text-base md:text-lg font-black text-gray-800 leading-none mb-1">
                                    {formatDateShortYear(d.endDate)}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                    {d.endTime || '--:--'}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-2 flex items-center justify-center gap-2">
                            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">
                                {formatHebrewDateRange(trip.start_date, d.endDate)}
                            </span>
                            <span className="text-[10px] md:text-[11px] font-black text-gray-800 border-r border-gray-300 pr-2">
                                סה"כ {durationDays} ימים
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. שכבות */}
                <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0">
                    <span className="text-xs font-bold text-gray-400 block mb-1">שכבות</span>
                    <div className="font-black text-gray-800 text-lg md:text-xl flex items-center justify-center md:justify-start">
                        כיתות {d.gradeFrom}-{d.gradeTo}
                    </div>
                </div>

                {/* 3. סה"כ חניכים */}
                <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0">
                    <span className="text-xs font-bold text-gray-400 block mb-1">סה"כ {traineesLabel}</span>
                    <div className="font-black text-gray-800 text-lg md:text-xl flex items-center gap-2 justify-center md:justify-start">
                        <Users size={18} className="text-[#00BCD4] shrink-0"/>
                        {d.chanichimCount || '0'}
                    </div>
                </div>

                {/* 4. הרכב צוות */}
                <div className="text-center md:text-right px-2 md:col-span-1 flex flex-col justify-center pt-2 md:pt-0">
                    <span className="text-xs font-bold text-gray-400 block mb-1">הרכב צוות</span>
                    <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                        {d.staffAges?.map((s: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-full">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 5. סה"כ כולל */}
                <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0">
                    <span className="text-xs font-bold text-gray-400 block mb-1">{participantsTitle}</span>
                    <div className="font-black text-gray-800 text-lg md:text-xl flex items-center gap-2 justify-center md:justify-start">
                        <Users size={18} className="text-[#00BCD4] shrink-0"/>
                        {d.totalTravelers}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">כולל צוות</div>
                </div>

                {/* 6. פעולות - רוחב מלא במובייל */}
                <div className="col-span-2 md:col-span-1 text-center md:text-right pr-0 md:pr-4 flex flex-row md:flex-col justify-center gap-2 print:hidden pt-2 md:pt-0">
                     <button onClick={handlePrint} className="flex-1 md:w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 md:py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                        <Printer size={14}/> הדפסה
                     </button>
                     <button onClick={handleShare} className="flex-1 md:w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 md:py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                        <Share2 size={14}/> שיתוף
                     </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- לו"ז --- */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-gray-400" size={20}/>
                    <h2 className="text-xl font-bold text-gray-800">לו"ז הפעילות</h2>
                </div>

                <div className="relative">
                    <div className="absolute top-4 bottom-4 right-[27px] w-[2px] bg-gray-200 z-0"></div>

                    <div className="space-y-4 relative z-10">
                        {timeline.map((item: any, i: number) => {
                            const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.other;
                            const Icon = catStyle.icon;
                            const borderClass = getCategoryBorder(item.category);

                            return (
                                <div key={i} className="flex gap-3 md:gap-4 items-stretch">
                                    <div className="shrink-0 flex flex-col items-center w-14 pt-1 gap-1">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-sm border-4 border-white ${catStyle.pastelBg} ${catStyle.darkText} z-10`}>
                                            <Icon size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md text-center leading-tight w-full break-words ${catStyle.pastelBg} ${catStyle.darkText}`}>
                                            {catStyle.label}
                                        </span>
                                    </div>

                                    <div className={`flex-1 bg-white rounded-xl p-3 shadow-sm border-2 ${borderClass} flex gap-3 md:gap-4`}>
                                        
                                        <div className="shrink-0">
                                            {item.date ? <DateBox dateStr={item.date} /> : (
                                                <div className="w-[60px] md:w-[75px] h-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-xs text-gray-300">-</div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center">
                                            <h3 className="text-sm md:text-base font-black text-gray-800 leading-tight mb-2">
                                                {item.finalSubCategory}
                                            </h3>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                                                    <MapPin size={14} className="text-[#E91E63] shrink-0 mt-0.5"/> 
                                                    <span>{item.finalLocation}</span>
                                                </div>
                                                
                                                {item.otherDetail && item.finalSubCategory !== item.otherDetail && (
                                                    <div className="flex items-start gap-2 text-xs text-gray-800 bg-slate-50 p-2 rounded border border-gray-100">
                                                        <div className="shrink-0 mt-0.5">
                                                            {item.category === 'sleeping' ? <Tent size={14} className="text-purple-500"/> : <Info size={14} className="text-gray-400"/>}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-gray-500 ml-1">
                                                                {item.category === 'sleeping' ? 'מקום הלינה:' : 'פרטים:'}
                                                            </span>
                                                            <span className="font-bold">{item.otherDetail}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.details && (
                                                    <div className="text-xs text-gray-500 leading-relaxed pl-2 border-r-2 border-gray-100 pr-2">
                                                        {item.details}
                                                    </div>
                                                )}
                                            </div>

                                            {item.requiresLicense && (
                                                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                                                    {item.licenseFile ? (
                                                        <a href={item.licenseFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100">
                                                            <ShieldCheck size={12}/> רישוי עסק
                                                        </a>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                            <AlertTriangle size={12}/> חסר רישוי
                                                        </span>
                                                    )}
                                                    {item.insuranceFile ? (
                                                        <a href={item.insuranceFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100">
                                                            <ShieldCheck size={12}/> ביטוח
                                                        </a>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                            <AlertTriangle size={12}/> חסר ביטוח
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- עמודה שמאלית (Sidebar) --- */}
            <div className="space-y-6">
                
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Briefcase size={18} className="text-[#00BCD4] shrink-0"/> {boxTitle}
                    </h3>
                    
                    <div className="flex flex-col gap-0 text-sm">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-t-xl border-b border-white">
                            <User size={16} className="text-gray-400"/>
                            <div>
                                <span className="block font-black text-[#00BCD4] text-lg">{trip.coordinator_name}</span>
                                <span className="text-xs font-bold text-gray-500">{subRoleDisplay}</span>
                            </div>
                        </div>

                        {profile?.official_name && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white">
                                <CreditCard size={16} className="text-gray-400"/>
                                <div>
                                    <span className="text-[10px] text-gray-400 block font-bold">שם מלא (ת.ז)</span>
                                    <span className="block font-bold text-gray-700">{profile.official_name} {profile.last_name}</span>
                                </div>
                            </div>
                        )}

                        {profile?.identity_number && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white">
                                <Hash size={16} className="text-gray-400"/>
                                <div>
                                    <span className="text-[10px] text-gray-400 block font-bold">תעודת זהות</span>
                                    <span className="block font-bold text-gray-800">{profile.identity_number}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white">
                            <Phone size={16} className="text-gray-400"/>
                            <div>
                                <span className="text-[10px] text-gray-400 block font-bold">טלפון</span>
                                <span className="block font-bold text-gray-800">{d.phone || profile?.phone || '-'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-b-xl overflow-hidden">
                            <Mail size={16} className="text-gray-400 shrink-0"/>
                            <div className="overflow-hidden">
                                <span className="text-[10px] text-gray-400 block font-bold">אימייל</span>
                                <span className="block font-bold text-gray-800 truncate">{profile?.email || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* הצגת רכז משני אם קיים - עם אפשרות מחיקה ועריכה */}
                    {showSecondaryStaffCard && (
                        <div className="mt-4 pt-4 border-t border-gray-100 group">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-[10px] font-bold text-purple-600 uppercase">{secondStaffTitle}</div>
                                {isHQ && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={handleEditSecondaryStaff} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-500" title="עריכה">
                                            <Edit2 size={12}/>
                                        </button>
                                        <button onClick={handleDeleteSecondaryStaff} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-500" title="מחיקה">
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-sm">
                                <div className="font-bold text-purple-900 mb-1 flex justify-between">
                                    {d.secondaryStaffObj.name}
                                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded text-purple-500">{d.secondaryStaffObj.role}</span>
                                </div>
                                <div className="mt-2 text-xs text-purple-600 flex flex-col gap-1">
                                    <div className="flex items-center gap-1"><Hash size={10}/> {d.secondaryStaffObj.idNumber}</div>
                                    <div className="flex items-center gap-1"><Phone size={10}/> {d.secondaryStaffObj.phone}</div>
                                    <div className="flex items-center gap-1"><Mail size={10}/> {d.secondaryStaffObj.email}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* הוספת אחראי נוסף - רק למטה */}
                    {showAddStaffForm && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            {isAddingStaff ? (
                                <div className="animate-fadeIn bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-500">{addStaffBtnLabel}</span>
                                        <button onClick={() => setIsAddingStaff(false)}><X size={14} className="text-gray-400"/></button>
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder={namePlaceholder}
                                            value={newStaffData.name} onChange={e => setNewStaffData({...newStaffData, name: e.target.value})}
                                        />
                                        <input 
                                            type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder="תפקיד בארגון"
                                            value={newStaffData.role} onChange={e => setNewStaffData({...newStaffData, role: e.target.value})}
                                        />
                                        <input 
                                            type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder="תעודת זהות"
                                            value={newStaffData.idNumber} onChange={e => setNewStaffData({...newStaffData, idNumber: e.target.value})}
                                        />
                                        <input 
                                            type="tel" dir="rtl" className="w-full p-2 text-xs border rounded-lg bg-white text-right" placeholder="טלפון"
                                            value={newStaffData.phone} onChange={e => setNewStaffData({...newStaffData, phone: e.target.value})}
                                        />
                                        <input 
                                            type="email" className="w-full p-2 text-xs border rounded-lg bg-white text-right" placeholder="אימייל"
                                            value={newStaffData.email} onChange={e => setNewStaffData({...newStaffData, email: e.target.value})}
                                        />
                                        <button 
                                            onClick={handleSaveSecondaryStaff} 
                                            disabled={isVerifying}
                                            className="w-full bg-[#00BCD4] text-white text-xs font-bold py-2 rounded-lg hover:bg-cyan-600 transition-colors mt-1 disabled:opacity-50"
                                        >
                                            {isVerifying ? 'בודק במערכת...' : 'אימות ושמירה'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingStaff(true)} className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:text-[#00BCD4] flex items-center justify-center gap-1">
                                    <Plus size={14}/> {addStaffBtnLabel}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Paperclip size={18} className="text-[#E91E63]"/>קבצים ומסמכים</h3>
                    {missingDocsCount > 0 ? (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 items-start">
                            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0"/>
                            <div><span className="block text-sm font-bold text-red-700">חסרים מסמכים!</span><span className="text-xs text-red-600 block mt-1">יש להשלים {missingDocsCount} אישורים.</span></div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 items-center">
                            <CheckCircle size={20} className="text-green-600 shrink-0"/>
                            <div><span className="block text-sm font-bold text-green-700">הכל תקין</span><span className="text-xs text-green-600">כל האישורים הנדרשים הועלו.</span></div>
                        </div>
                    )}
                </div>

                {d.generalComments && (
                    <div className="bg-yellow-50 rounded-3xl p-6 border border-yellow-100">
                        <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                            <FileText size={18}/> הערות ובקשות
                        </h3>
                        <p className="text-sm text-yellow-700 leading-relaxed whitespace-pre-wrap">
                            {d.generalComments}
                        </p>
                    </div>
                )}

                {/* --- כפתור עריכת טיול המעודכן --- */}
                <button 
                    onClick={handleEditTrip}
                    className="w-full py-4 bg-[#00BCD4] hover:bg-cyan-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Edit2 size={18} />
                    עריכת הטיול
                </button>
            </div>
        </div>
      </div>
    </>
  )
}