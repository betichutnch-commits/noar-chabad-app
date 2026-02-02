"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Loader2, Calendar, MapPin, Clock, FileText, Phone, 
  Bus, Utensils, Tent, Ticket, CheckCircle, AlertTriangle, ChevronLeft, Download,
  Users, Info, Home, Navigation, HelpCircle, User, Mail, 
  ArrowLeft, ShieldCheck, ShieldAlert, FileCheck, FileX, CreditCard, BadgeCheck, Cake, XCircle
} from 'lucide-react'

// ייבוא מתיקיות העזר
import { 
    toHebrewDay, getHebrewDateRange, formatDate, 
    getShortDate, getDayName, calculateAge 
} from '@/lib/dateUtils'
import { DEFAULT_STYLE, CATEGORY_STYLES } from '@/lib/constants'

// פונקציות מקומיות קטנות שנשארו (כי הן תלויות בלוגיקה ספציפית לתצוגה)
const getRibbonColor = (type: string) => { 
    if (!type) return 'bg-gray-500'; 
    if (type.includes('סמינר')) return 'bg-purple-600'; 
    if (type.includes('מחנה')) return 'bg-green-600'; 
    if (type.includes('טיול')) return 'bg-[#00BCD4]'; 
    return 'bg-blue-600'; 
};

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'files' | 'contacts'>('schedule');

  useEffect(() => {
    const fetchTripData = async () => {
        if (!params?.id) return;
        setLoading(true);
        const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', params.id).single();
        if (error || !tripData) { console.error(error); setLoading(false); return; }
        setTrip(tripData);
        if (tripData.user_id) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', tripData.user_id).single();
            if (profile) setCreatorProfile(profile);
        }
        setLoading(false);
    };
    fetchTripData();
  }, [params?.id]);

  const getCoordinatorTitle = (dept: string) => { if (!dept) return 'אחראי/ת הטיול'; if (['בת מלך', 'בנות חב״ד', 'בנות חב"ד'].some(d => dept.includes(d))) { return 'אחראית הטיול'; } return 'אחראי/ת הטיול'; };
  const getCategoryData = (catKey: string) => { if (!catKey) return DEFAULT_STYLE; return CATEGORY_STYLES[catKey] || DEFAULT_STYLE; };

  const getStatusDisplay = (status: string) => {
      const config: any = {
          approved: { text: 'מאושר', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircle },
          pending: { text: 'ממתין לבדיקה', bg: 'bg-amber-100', textCol: 'text-amber-700', icon: Clock },
          rejected: { text: 'לא אושר', bg: 'bg-red-100', textCol: 'text-red-700', icon: AlertTriangle },
          cancelled: { text: 'בוטל', bg: 'bg-stone-100', textCol: 'text-stone-500', icon: XCircle }
      };
      const style = config[status] || config.pending;
      const Icon = style.icon;
      return (
          <div className={`absolute top-0 left-0 px-4 py-2 rounded-br-2xl shadow-sm flex items-center gap-2 font-bold text-sm ${style.bg} ${style.textCol}`}>
              <Icon size={16}/> {style.text}
          </div>
      );
  };

  const getSafeProfileData = () => {
      if (!creatorProfile) return { fullName: trip?.coordinator_name || 'לא ידוע', officialName: 'לא הוזן', idNumber: 'לא הוזן', birthDate: null, phone: '', email: '', avatarUrl: null };
      const officialFirst = creatorProfile.official_name || ''; const lastName = creatorProfile.last_name || ''; let officialFullName = (officialFirst && lastName) ? `${officialFirst} ${lastName}` : ''; if (!officialFullName) officialFullName = 'לא הוזן'; const displayName = creatorProfile.full_name || trip?.coordinator_name || 'לא הוזן';
      return { idNumber: creatorProfile.identity_number || creatorProfile.id_number || 'לא הוזן', fullName: displayName, officialName: officialFullName, birthDate: creatorProfile.birth_date || null, phone: creatorProfile.phone, email: creatorProfile.contact_email || creatorProfile.email, avatarUrl: creatorProfile.avatar_url || null };
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  if (!trip) return <div className="p-10 text-center text-xl font-bold text-gray-400">הטיול לא נמצא במערכת</div>;

  const d = trip.details || {};
  const timeline = d.timeline || [];
  const profileData = getSafeProfileData();
  const coordinatorAge = profileData.birthDate ? calculateAge(profileData.birthDate) : null;
  const allFiles = timeline.flatMap((item: any) => { const files = []; if (item.licenseFile) files.push({ ...item.licenseFile, type: 'רישוי עסק', itemTitle: item.finalSubCategory }); if (item.insuranceFile) files.push({ ...item.insuranceFile, type: 'ביטוח', itemTitle: item.finalSubCategory }); return files; });

  return (
    <>
      <Header title="פרטי טיול" />

      <div className="max-w-6xl mx-auto p-3 md:p-6 animate-fadeIn pb-32">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 hover:text-[#00BCD4] mb-4 text-xs font-bold transition-colors">
            <ChevronLeft size={16}/> חזרה לרשימה
        </button>

        {/* --- כותרת (Hero) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 pt-12 md:pt-6 mb-6 overflow-hidden relative">
            {getStatusDisplay(trip.status)}
            <div className={`absolute top-0 right-0 px-6 py-1.5 text-white font-bold text-sm shadow-md rounded-bl-2xl ${getRibbonColor(d.tripType)}`}>
                {d.tripType} {d.tripType === 'אחר' && d.tripTypeOther ? `- ${d.tripTypeOther}` : ''}
            </div>

            <div className="mt-6 md:mt-4 mb-4">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900">{d.name}</h1>
            </div>

            {/* --- הצגת סיבת ביטול אם הטיול בוטל --- */}
            {trip.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex gap-4 items-start">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500 shrink-0">
                        <XCircle size={20}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-red-800 mb-1">הפעילות בוטלה</h3>
                        <p className="text-sm text-red-700 leading-relaxed font-medium">
                            {trip.cancellation_reason || d.cancellationReason || 'לא צוינה סיבה'}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 w-full">
                {/* קוביית תאריכים */}
                <div className="flex flex-col justify-center text-gray-700 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-h-[50px] shrink-0">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#E91E63]"/>
                        <div className="flex flex-col leading-tight"><span className="font-bold text-sm">{formatDate(d.startDate)}</span>{d.startTime && <span className="text-[10px] text-gray-500">{d.startTime}</span>}</div>
                        <ArrowLeft size={14} className="text-gray-400 mx-1"/>
                        <div className="flex flex-col leading-tight"><span className="font-bold text-sm">{formatDate(d.endDate)}</span>{d.endTime && <span className="text-[10px] text-gray-500">{d.endTime}</span>}</div>
                    </div>
                    <div className="text-[12px] text-gray-900 text-center font-bold mt-1 border-t border-gray-200 pt-1">
                        {getHebrewDateRange(d.startDate, d.endDate)}
                    </div>
                </div>
                {(d.gradeFrom || d.gradeTo) && ( <div className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl border border-gray-200 flex flex-col justify-center min-w-[70px] min-h-[50px] shrink-0"><div className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">שכבות</div><div className="font-bold text-xs leading-none">{d.gradeFrom}-{d.gradeTo}</div></div> )}
                <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-xl border border-blue-100 flex flex-col items-center justify-center min-w-[70px] min-h-[50px] shrink-0"><span className="font-black text-lg leading-none">{d.chanichimCount || '0'}</span><span className="text-[9px] opacity-70 font-bold leading-none">חניכים</span></div>
                <div className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl border border-gray-200 flex flex-col justify-center min-w-[90px] min-h-[50px] shrink-0"><div className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">צוות</div><div className="font-bold text-xs leading-tight whitespace-normal max-w-[200px]">{d.staffAges?.join(', ') || '-'}</div></div>
                <div className="bg-purple-50 text-purple-800 px-3 py-1 rounded-xl border border-purple-100 flex flex-col items-center justify-center min-w-[80px] min-h-[50px] shrink-0"><span className="font-black text-lg leading-none">{d.totalTravelers || '0'}</span><span className="text-[9px] opacity-70 font-bold leading-none">סה"כ משתתפים</span></div>
            </div>
        </div>

        {/* --- טאבים --- */}
        <div className="flex border-b border-gray-200 mb-5">
            {[{ id: 'schedule', label: 'לו״ז ופעילויות', icon: Clock }, { id: 'contacts', label: getCoordinatorTitle(trip.department), icon: Phone }, { id: 'files', label: `קבצים (${allFiles.length})`, icon: FileText }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#00BCD4] text-[#00BCD4]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    <tab.icon size={16}/>{tab.label}
                </button>
            ))}
        </div>

        {/* --- תוכן הטאבים --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[300px] p-5">
            {activeTab === 'schedule' && (
                <div className="space-y-2">
                    {timeline.map((item: any, index: number) => {
                        const style = getCategoryData(item.category);
                        const CatIcon = style.icon;
                        let hoverBgClass = 'hover:bg-gray-50'; try { hoverBgClass = style.light.replace('bg-', 'hover:bg-'); } catch(e) {}
                        let titleColorClass = 'text-gray-900'; try { titleColorClass = style.text.replace('text-', 'text-').replace('600', '900'); } catch(e) {}
                        let detailPrefix = "פרטים נוספים:";
                        if (item.category === 'sleeping') detailPrefix = "מקום הלינה:"; if (item.category === 'attraction') detailPrefix = "שם האטרקציה:"; if (item.category === 'transport') detailPrefix = "פרטי התניידות:"; if (item.category === 'settlement') detailPrefix = "מיקום הפעילות:";
                        const fullDetails = [item.otherDetail ? `${item.otherDetail}` : null, item.details ? `${item.details}` : null].filter(Boolean).join(' • ');

                        return (
                            <div key={index} className="flex gap-3 group items-stretch">
                                <div className="flex flex-col items-center min-w-[50px] pt-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${style.bg || 'bg-gray-500'} shrink-0`}><CatIcon size={16}/></div>
                                    <div className="text-[10px] font-bold text-gray-400 mt-1 text-center leading-tight">{getShortDate(item.date)}<div className="font-normal opacity-70">{getDayName(item.date)}</div></div>
                                    {index !== timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1"></div>}
                                </div>
                                <div className={`flex-1 bg-white border border-gray-100 hover:border-[#00BCD4] rounded-lg p-3 transition-all mb-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm ${hoverBgClass}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-1 mb-1">
                                            <div className="flex items-center gap-2"><span className={`text-[12px] font-black uppercase tracking-wider ${style.text || 'text-gray-600'} bg-white border border-gray-100 px-2 py-0.5 rounded-md`}>{style.label || 'כללי'}</span></div>
                                            <h3 className={`font-black text-xl leading-none truncate ${titleColorClass}`}>{item.finalSubCategory}</h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                                            {item.finalLocation && item.category !== 'branch' && (<div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-100"><MapPin size={12} className="text-gray-400"/>{item.finalLocation}</div>)}
                                            {fullDetails && (<div className="flex items-center gap-1 text-xs font-medium"><Info size={12} className="text-gray-400"/><span className="font-bold text-gray-500">{detailPrefix}</span><span>{fullDetails}</span></div>)}
                                        </div>
                                    </div>
                                    {item.requiresLicense && (<div className="flex gap-2 shrink-0">{item.licenseFile ? (<a href={item.licenseFile.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center px-2 py-1 rounded border text-[10px] font-bold w-16 text-center bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"><FileCheck size={14}/><span>רישוי</span></a>) : (<div className="flex flex-col items-center justify-center px-2 py-1 rounded border text-[10px] font-bold w-16 text-center bg-red-50 border-red-200 text-red-600 opacity-70"><FileX size={14}/><span>חסר רישוי</span></div>)}{item.insuranceFile ? (<a href={item.insuranceFile.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center px-2 py-1 rounded border text-[10px] font-bold w-16 text-center bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"><ShieldCheck size={14}/><span>ביטוח</span></a>) : (<div className="flex flex-col items-center justify-center px-2 py-1 rounded border text-[10px] font-bold w-16 text-center bg-red-50 border-red-200 text-red-600 opacity-70"><ShieldAlert size={14}/><span>חסר ביטוח</span></div>)}</div>)}
                                </div>
                            </div>
                        );
                    })}
                    {timeline.length === 0 && (<div className="text-center py-10 text-gray-400 text-sm">לא הוזן פירוט לטיול זה</div>)}
                    {d.generalComments && (<div className="mt-8 pt-6 border-t border-dashed border-gray-200"><div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex gap-3 items-start"><Info size={18} className="text-yellow-600 mt-0.5 shrink-0"/><div><h4 className="font-bold text-yellow-800 text-xs mb-1">הערות כלליות שהוזנו בטופס:</h4><p className="text-sm text-yellow-900 leading-relaxed font-medium whitespace-pre-wrap">{d.generalComments}</p></div></div></div>)}
                </div>
            )}

            {activeTab === 'contacts' && (
                <div className="animate-fadeIn">
                     <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col md:flex-row gap-8">
                         <div className="flex flex-col items-center md:w-1/3 text-center border-b md:border-b-0 md:border-l border-gray-200 pb-6 md:pb-0 md:pl-6">
                             <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-[#00BCD4] font-black text-4xl shadow-sm border-2 border-white ring-1 ring-gray-100 mb-3 overflow-hidden">{profileData.avatarUrl ? (<img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover"/>) : (profileData.fullName?.[0] || 'U')}</div>
                             <div className="font-black text-gray-900 text-2xl mb-1">{profileData.fullName}</div>
                             <div className="text-sm text-gray-500 font-bold bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">{getCoordinatorTitle(trip.department)}</div>
                         </div>
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm hover:border-blue-200 transition-colors"><div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><BadgeCheck size={20}/></div><div className="overflow-hidden"><div className="text-[10px] text-gray-400 font-bold uppercase">שם מלא (עפ"י ת.ז.)</div><div className="font-bold text-gray-800 truncate" title={profileData.officialName}>{profileData.officialName}</div></div></div>
                             <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-colors"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><CreditCard size={20}/></div><div><div className="text-[10px] text-gray-400 font-bold uppercase">תעודת זהות</div><div className="font-bold text-gray-800 tracking-wider">{profileData.idNumber}</div></div></div>
                             <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm hover:border-pink-200 transition-colors"><div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0"><Cake size={20}/></div><div><div className="text-[10px] text-gray-400 font-bold uppercase">תאריך לידה</div><div className="flex items-center gap-2"><span className="font-bold text-gray-800">{profileData.birthDate ? formatDate(profileData.birthDate) : 'לא הוזן'}</span>{coordinatorAge !== null && (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${coordinatorAge >= 18 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>גיל: {coordinatorAge}</span>)}</div></div></div>
                             <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm hover:border-green-200 transition-colors"><div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0"><Phone size={20}/></div><div className="overflow-hidden"><div className="text-[10px] text-gray-400 font-bold uppercase">טלפון נייד</div>{profileData.phone ? (<a href={`tel:${profileData.phone}`} className="font-bold text-gray-800 hover:text-green-600 transition-colors">{profileData.phone}</a>) : <span className="text-gray-400 font-medium text-sm">לא הוזן</span>}</div></div>
                             <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm hover:border-cyan-200 transition-colors md:col-span-2"><div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0"><Mail size={20}/></div><div className="overflow-hidden"><div className="text-[10px] text-gray-400 font-bold uppercase">דואר אלקטרוני</div>{profileData.email ? (<a href={`mailto:${profileData.email}`} className="font-bold text-gray-800 hover:text-cyan-600 transition-colors truncate block">{profileData.email}</a>) : <span className="text-gray-400 font-medium text-sm">לא הוזן</span>}</div></div>
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'files' && (
                <div className="grid grid-cols-1 gap-3 animate-fadeIn">
                    {allFiles.length > 0 ? allFiles.map((file: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#00BCD4] hover:bg-white transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#00BCD4] shadow-sm border border-gray-100"><FileText size={18}/></div>
                                <div className="truncate"><div className="text-[10px] text-gray-400 font-bold">{file.type} עבור {file.itemTitle}</div><div className="font-bold text-gray-800 text-xs truncate">{file.name}</div></div>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[#00BCD4] hover:bg-cyan-50 rounded-lg transition-all"><Download size={18}/></a>
                        </div>
                    )) : (<div className="text-center py-10 text-gray-400 text-sm"><FileText size={32} className="opacity-20 mx-auto mb-2"/>לא הועלו קבצים לטיול זה</div>)}
                </div>
            )}
        </div>
      </div>
    </>
  )
}