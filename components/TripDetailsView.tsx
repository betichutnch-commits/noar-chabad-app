"use client"

import React from 'react'
import { 
  CheckCircle, Clock, AlertTriangle, FileText, 
  Printer, Share2, Users, MapPin, Tent, Info, 
  User, CreditCard, Hash, Phone, Mail, 
  Briefcase, Edit2, Trash2, Plus, X, Paperclip, ShieldCheck,
  ArrowRight
} from 'lucide-react'
import { TRIP_TYPES_CONFIG } from '@/lib/constants'
import { formatHebrewDateRange, formatHebrewDate } from '@/lib/dateUtils'

// --- פונקציות עזר ---
const formatDateShortYear = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    return `${d}.${m}.${y}`;
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

// --- Props ---
interface TripDetailsViewProps {
    trip: any;
    profile?: any;
    isEditable: boolean;
    isPublic: boolean;
    onBack?: () => void;
    onEditTrip?: () => void;
    onCancelTrip?: () => void; // <--- הוספתי את השדה החסר כאן
    onEditStaff?: () => void;
    onDeleteStaff?: () => void;
    onSaveStaff?: () => void;
    isAddingStaff?: boolean;
    setIsAddingStaff?: (val: boolean) => void;
    newStaffData?: any;
    setNewStaffData?: (data: any) => void;
    isVerifying?: boolean;
}

export const TripDetailsView: React.FC<TripDetailsViewProps> = ({
    trip, profile, isEditable, isPublic,
    onBack, onEditTrip, onCancelTrip, onEditStaff, onDeleteStaff, onSaveStaff,
    isAddingStaff, setIsAddingStaff, newStaffData, setNewStaffData, isVerifying
}) => {
    
    const d = trip.details || {};
    const timeline = d.timeline || [];
    const typeConfig = TRIP_TYPES_CONFIG.find(t => t.id === d.tripType) || TRIP_TYPES_CONFIG[4];
    
    // חישובים לביטול
    const isPast = new Date(trip.start_date) < new Date(new Date().setHours(0,0,0,0));
    const isCancelled = trip.status === 'cancelled';

    // זיהוי מגדר
    const deptName = trip.department || '';
    const isFemale = deptName.includes('בת מלך') || deptName.includes('בנות חב"ד') || deptName.includes('בנות חב״ד');
    
    const participantsTitle = isFemale ? 'סה"כ משתתפות' : 'סה"כ משתתפים'; 
    const traineesLabel = isFemale ? 'חניכות' : 'חניכים';
    const boxTitle = isFemale ? 'אחראית הפעילות' : 'אחראי הפעילות';
    const addStaffBtnLabel = isFemale ? 'הוספת אחראית טיול' : 'הוספת אחראי טיול';
    const secondStaffTitle = isFemale ? 'אחראית נוספת' : 'אחראי נוסף';
    const namePlaceholder = "שם מלא כפי שמופיע בתעודת זהות";

    // --- לוגיקה משופרת לתצוגת תפקיד (HQ Fix) ---
    let subRoleDisplay = '';
    const isBranchHQ = trip.branch === 'מטה' || (trip.branch || '').includes('הנהלה');
    const isProfileHQ = profile?.role === 'admin' || profile?.role === 'dept_staff' || profile?.role === 'safety_admin';

    if (isBranchHQ || isProfileHQ) {
        subRoleDisplay = `צוות מטה • ${trip.department || ''}`;
    } else {
        const roleBase = isFemale ? 'רכזת סניף' : 'רכז סניף';
        const branchName = trip.branch || '';
        subRoleDisplay = `${roleBase} • ${branchName}`;
    }

    const missingDocsCount = timeline.filter((t: any) => t.requiresLicense && (!t.licenseFile || !t.insuranceFile)).length;
    const durationDays = calculateDuration(trip.start_date, d.endDate);

    const getStatusBadge = (status: string) => {
        const styles: any = {
            approved: { text: 'מאושר', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircle },
            pending: { text: 'ממתין לאישור', bg: 'bg-orange-100', textCol: 'text-orange-700', icon: Clock },
            rejected: { text: 'לא אושר', bg: 'bg-red-100', textCol: 'text-red-700', icon: AlertTriangle },
            draft: { text: 'טיוטה', bg: 'bg-gray-100', textCol: 'text-gray-600', icon: FileText },
            cancelled: { text: 'בוטל', bg: 'bg-stone-100', textCol: 'text-stone-500', icon: AlertTriangle }
        };
        const conf = styles[status] || styles.pending;
        const Icon = conf.icon;
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold ${conf.bg} ${conf.textCol} shadow-sm border border-white/20 shrink-0`}>
                <Icon size={14} className="md:w-4 md:h-4"/> {conf.text}
            </div>
        );
    };

    const handlePrint = () => window.print();
    const handleShare = async () => {
        const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
        const publicUrl = `${origin}/share/trip/${trip.id}`;
        if (navigator.share) {
            try { await navigator.share({ title: trip.name, text: trip.name, url: publicUrl }); } catch (err) {}
        } else {
            navigator.clipboard.writeText(publicUrl);
            alert('הקישור הציבורי הועתק ללוח!');
        }
    };

    const showSecondaryStaffCard = d.secondaryStaffObj && !isAddingStaff;
    const showAddStaffForm = isEditable && !isPublic && isAddingStaff && setNewStaffData && setIsAddingStaff;
    const showAddButton = isEditable && !isPublic && !isAddingStaff && !d.secondaryStaffObj && setIsAddingStaff;

    return (
        <div className="animate-fadeIn pb-32 max-w-[1600px] mx-auto print:p-0">
            
            {!isPublic && onBack && (
                <button onClick={onBack} className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 transition-colors font-bold text-sm print:hidden">
                    <ArrowRight size={18}/> חזרה
                </button>
            )}

            {/* --- Hero --- */}
            <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden mb-8 print:shadow-none print:border-none">
                <div className={`h-auto py-6 md:h-32 ${typeConfig.bg} relative overflow-hidden flex items-center px-4 md:px-8`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 w-full flex flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start md:items-center gap-4">
                            <div className="bg-white p-3 md:p-4 rounded-2xl shadow-lg text-gray-700 hidden md:block">
                                {React.createElement(typeConfig.icon, { size: 36, className: typeConfig.text })}
                            </div>
                            <div>
                                <div className={`text-sm md:text-xl font-black uppercase tracking-wider mb-1 ${typeConfig.text} opacity-90 drop-shadow-sm`}>{d.tripType}</div>
                                <h1 className="text-xl md:text-4xl font-black text-gray-900 leading-none">{trip.name}</h1>
                            </div>
                        </div>
                        {getStatusBadge(trip.status)}
                    </div>
                </div>

                <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-6 divide-y md:divide-y-0 md:divide-x divide-x-reverse divide-gray-100">
                    <div className="col-span-2 md:col-span-2 text-center md:text-right pl-0 md:pl-2 flex flex-col justify-center">
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col gap-3">
                            <div className="flex justify-between items-center w-full gap-1">
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wide">התחלה</span>
                                    <span className="text-base md:text-lg font-black text-gray-800 leading-none mb-1">{formatDateShortYear(trip.start_date)}</span>
                                    <span className="text-[10px] md:text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{d.startTime || '--:--'}</span>
                                </div>
                                <div className="w-px h-10 bg-gray-300 mx-1 md:mx-2"></div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wide">סיום</span>
                                    <span className="text-base md:text-lg font-black text-gray-800 leading-none mb-1">{formatDateShortYear(d.endDate)}</span>
                                    <span className="text-[10px] md:text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{d.endTime || '--:--'}</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex items-center justify-center gap-2">
                                <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">{formatHebrewDateRange(trip.start_date, d.endDate)}</span>
                                <span className="text-[10px] md:text-[11px] font-black text-gray-800 border-r border-gray-300 pr-2">סה"כ {durationDays} ימים</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0"><span className="text-xs font-bold text-gray-400 block mb-1">שכבות</span><div className="font-black text-gray-800 text-lg md:text-xl">כיתות {d.gradeFrom}-{d.gradeTo}</div></div>
                    <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0"><span className="text-xs font-bold text-gray-400 block mb-1">סה"כ {traineesLabel}</span><div className="font-black text-gray-800 text-lg md:text-xl flex items-center gap-2 justify-center md:justify-start"><Users size={18} className="text-[#00BCD4] shrink-0"/>{d.chanichimCount || '0'}</div></div>
                    <div className="text-center md:text-right px-2 md:col-span-1 flex flex-col justify-center pt-2 md:pt-0"><span className="text-xs font-bold text-gray-400 block mb-1">הרכב צוות</span><div className="flex flex-wrap gap-1 justify-center md:justify-start">{d.staffAges?.map((s: string, i: number) => (<span key={i} className="text-[10px] font-bold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-full">{s}</span>))}</div></div>
                    <div className="text-center md:text-right px-2 flex flex-col justify-center pt-2 md:pt-0"><span className="text-xs font-bold text-gray-400 block mb-1">{participantsTitle}</span><div className="font-black text-gray-800 text-lg md:text-xl flex items-center gap-2 justify-center md:justify-start"><Users size={18} className="text-[#00BCD4] shrink-0"/>{d.totalTravelers}</div><div className="text-[10px] text-gray-400 mt-0.5">כולל צוות</div></div>
                    
                    <div className="col-span-2 md:col-span-1 text-center md:text-right pr-0 md:pr-4 flex flex-row md:flex-col justify-center gap-2 print:hidden pt-2 md:pt-0">
                         <button onClick={handlePrint} className="flex-1 md:w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 md:py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"><Printer size={14}/> הדפסה</button>
                         <button onClick={handleShare} className="flex-1 md:w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 md:py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"><Share2 size={14}/> שיתוף</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Timeline --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2"><Clock className="text-gray-400" size={20}/><h2 className="text-xl font-bold text-gray-800">לו"ז הפעילות</h2></div>
                    <div className="relative">
                        <div className="absolute top-4 bottom-4 right-[27px] w-[2px] bg-gray-200 z-0"></div>
                        <div className="space-y-4 relative z-10">
                            {timeline.map((item: any, i: number) => {
                                const catStyle = require('@/lib/constants').CATEGORY_STYLES[item.category] || require('@/lib/constants').CATEGORY_STYLES.other;
                                const Icon = catStyle.icon;
                                const borderClass = getCategoryBorder(item.category);
                                return (
                                    <div key={i} className="flex gap-3 md:gap-4 items-stretch">
                                        <div className="shrink-0 flex flex-col items-center w-14 pt-1 gap-1">
                                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-sm border-4 border-white ${catStyle.pastelBg} ${catStyle.darkText} z-10`}><Icon size={20} className="md:w-6 md:h-6" /></div>
                                            <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md text-center leading-tight w-full break-words ${catStyle.pastelBg} ${catStyle.darkText}`}>{catStyle.label}</span>
                                        </div>
                                        <div className={`flex-1 bg-white rounded-xl p-3 shadow-sm border-2 ${borderClass} flex gap-3 md:gap-4`}>
                                            <div className="shrink-0">{item.date ? <DateBox dateStr={item.date} /> : <div className="w-[60px] md:w-[75px] h-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-xs text-gray-300">-</div>}</div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h3 className="text-sm md:text-base font-black text-gray-800 leading-tight mb-2">{item.finalSubCategory}</h3>
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-2 text-xs text-gray-700 font-medium"><MapPin size={14} className="text-[#E91E63] shrink-0 mt-0.5"/><span>{item.finalLocation}</span></div>
                                                    {item.otherDetail && item.finalSubCategory !== item.otherDetail && (
                                                        <div className="flex items-start gap-2 text-xs text-gray-800 bg-slate-50 p-2 rounded border border-gray-100">
                                                            <div className="shrink-0 mt-0.5">{item.category === 'sleeping' ? <Tent size={14} className="text-purple-500"/> : <Info size={14} className="text-gray-400"/>}</div>
                                                            <div><span className="font-bold text-gray-500 ml-1">{item.category === 'sleeping' ? 'מקום הלינה:' : 'פרטים:'}</span><span className="font-bold">{item.otherDetail}</span></div>
                                                        </div>
                                                    )}
                                                    {item.details && <div className="text-xs text-gray-500 leading-relaxed pl-2 border-r-2 border-gray-100 pr-2">{item.details}</div>}
                                                </div>
                                                {item.requiresLicense && (
                                                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                                                        {item.licenseFile ? <a href={item.licenseFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100"><ShieldCheck size={12}/> רישוי עסק</a> : <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"><AlertTriangle size={12}/> חסר רישוי</span>}
                                                        {item.insuranceFile ? <a href={item.insuranceFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100"><ShieldCheck size={12}/> ביטוח</a> : <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"><AlertTriangle size={12}/> חסר ביטוח</span>}
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

                {/* --- Sidebar --- */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Briefcase size={18} className="text-[#00BCD4] shrink-0"/>{boxTitle}</h3>
                        <div className="flex flex-col gap-0 text-sm">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-t-xl border-b border-white">
                                <User size={16} className="text-gray-400"/>
                                <div><span className="block font-black text-[#00BCD4] text-lg">{trip.coordinator_name}</span><span className="text-xs font-bold text-gray-500">{subRoleDisplay}</span></div>
                            </div>
                            
                            {(!isPublic && profile?.official_name) && (<div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white"><CreditCard size={16} className="text-gray-400"/><div><span className="text-[10px] text-gray-400 block font-bold">שם מלא (ת.ז)</span><span className="block font-bold text-gray-700">{profile.official_name} {profile.last_name}</span></div></div>)}
                            {(!isPublic && profile?.identity_number) && (<div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white"><Hash size={16} className="text-gray-400"/><div><span className="text-[10px] text-gray-400 block font-bold">תעודת זהות</span><span className="block font-bold text-gray-800">{profile.identity_number}</span></div></div>)}
                            
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-white"><Phone size={16} className="text-gray-400"/><div><span className="text-[10px] text-gray-400 block font-bold">טלפון</span><span className="block font-bold text-gray-800">{d.phone || profile?.phone || '-'}</span></div></div>
                            
                            {!isPublic && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-b-xl overflow-hidden"><Mail size={16} className="text-gray-400 shrink-0"/><div className="overflow-hidden"><span className="text-[10px] text-gray-400 block font-bold">אימייל</span><span className="block font-bold text-gray-800 truncate">{profile?.email || '-'}</span></div></div>
                            )}
                        </div>

                        {showSecondaryStaffCard && (
                            <div className="mt-4 pt-4 border-t border-gray-100 group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] font-bold text-purple-600 uppercase">{secondStaffTitle}</div>
                                    {isEditable && !isPublic && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={onEditStaff} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-500" title="עריכה"><Edit2 size={12}/></button>
                                            <button onClick={onDeleteStaff} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-500" title="מחיקה"><Trash2 size={12}/></button>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-sm">
                                    <div className="font-bold text-purple-900 mb-1 flex justify-between">{d.secondaryStaffObj.name}<span className="text-[10px] bg-white/50 px-2 py-0.5 rounded text-purple-500">{d.secondaryStaffObj.role}</span></div>
                                    <div className="mt-2 text-xs text-purple-600 flex flex-col gap-1">
                                        {!isPublic && <div className="flex items-center gap-1"><Hash size={10}/> {d.secondaryStaffObj.idNumber}</div>}
                                        <div className="flex items-center gap-1"><Phone size={10}/> {d.secondaryStaffObj.phone}</div>
                                        {!isPublic && <div className="flex items-center gap-1"><Mail size={10}/> {d.secondaryStaffObj.email}</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {showAddStaffForm && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="animate-fadeIn bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-500">{addStaffBtnLabel}</span><button onClick={() => setIsAddingStaff && setIsAddingStaff(false)}><X size={14} className="text-gray-400"/></button></div>
                                    <div className="space-y-2">
                                        <input type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder={namePlaceholder} value={newStaffData.name} onChange={e => setNewStaffData && setNewStaffData({...newStaffData, name: e.target.value})}/>
                                        <input type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder="תפקיד בארגון" value={newStaffData.role} onChange={e => setNewStaffData && setNewStaffData({...newStaffData, role: e.target.value})}/>
                                        <input type="text" className="w-full p-2 text-xs border rounded-lg bg-white" placeholder="תעודת זהות" value={newStaffData.idNumber} onChange={e => setNewStaffData && setNewStaffData({...newStaffData, idNumber: e.target.value})}/>
                                        <input type="tel" dir="rtl" className="w-full p-2 text-xs border rounded-lg bg-white text-right" placeholder="טלפון" value={newStaffData.phone} onChange={e => setNewStaffData && setNewStaffData({...newStaffData, phone: e.target.value})}/>
                                        <input type="email" className="w-full p-2 text-xs border rounded-lg bg-white text-right" placeholder="אימייל" value={newStaffData.email} onChange={e => setNewStaffData && setNewStaffData({...newStaffData, email: e.target.value})}/>
                                        <button onClick={onSaveStaff} disabled={isVerifying} className="w-full bg-[#00BCD4] text-white text-xs font-bold py-2 rounded-lg hover:bg-cyan-600 transition-colors mt-1 disabled:opacity-50">{isVerifying ? 'בודק במערכת...' : 'אימות ושמירה'}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {showAddButton && (
                             <div className="mt-4 pt-4 border-t border-gray-100">
                                <button onClick={() => setIsAddingStaff && setIsAddingStaff(true)} className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:text-[#00BCD4] flex items-center justify-center gap-1"><Plus size={14}/> {addStaffBtnLabel}</button>
                             </div>
                        )}
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Paperclip size={18} className="text-[#E91E63]"/>קבצים ומסמכים</h3>
                        {missingDocsCount > 0 ? (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 items-start"><AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0"/><div><span className="block text-sm font-bold text-red-700">חסרים מסמכים!</span><span className="text-xs text-red-600 block mt-1">יש להשלים {missingDocsCount} אישורים.</span></div></div>
                        ) : (
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 items-center"><CheckCircle size={20} className="text-green-600 shrink-0"/><div><span className="block text-sm font-bold text-green-700">הכל תקין</span><span className="text-xs text-green-600">כל האישורים הנדרשים הועלו.</span></div></div>
                        )}
                    </div>

                    {d.generalComments && (
                        <div className="bg-yellow-50 rounded-3xl p-6 border border-yellow-100">
                            <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><FileText size={18}/> הערות ובקשות</h3>
                            <p className="text-sm text-yellow-700 leading-relaxed whitespace-pre-wrap">{d.generalComments}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {isEditable && onEditTrip && (
                            <button 
                                onClick={onEditTrip}
                                className="w-full py-4 bg-[#00BCD4] hover:bg-cyan-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Edit2 size={18} />
                                עריכת הטיול
                            </button>
                        )}
                        
                        {/* הוספת כפתור הביטול כאן */}
                        {isEditable && onCancelTrip && !isPast && !isCancelled && (
                            <button 
                                onClick={onCancelTrip}
                                className="w-full py-4 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                ביטול פעילות
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};