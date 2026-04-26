"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, Clock, AlertTriangle, FileEdit, 
  MapPin, ArrowRight, Trash2, ChevronLeft
} from 'lucide-react';
import { CATEGORY_STYLES } from '@/lib/constants';
import { formatHebrewDateRange } from '@/lib/dateUtils';
import type { TripRecord } from '@/lib/types';

interface TripCardProps {
    trip: TripRecord & { details?: Record<string, unknown>; department?: string | null };
    onDeleteDraft?: (id: string) => void;
    onCancelTrip?: (id: string) => void;
}

const getStatusConfig = (status: string) => {
    const config: Record<string, { text: string; bg: string; textCol: string; icon: React.ElementType }> = {
        approved: { text: 'מאושר', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircle },
        pending: { text: 'ממתין', bg: 'bg-amber-100', textCol: 'text-amber-700', icon: Clock },
        rejected: { text: 'לא אושר', bg: 'bg-red-100', textCol: 'text-red-700', icon: AlertTriangle },
        draft: { text: 'טיוטה', bg: 'bg-gray-100', textCol: 'text-gray-600', icon: FileEdit },
        cancelled: { text: 'בוטל', bg: 'bg-stone-100', textCol: 'text-stone-500', icon: Trash2 }
    };
    return config[status] || config.pending;
};

const getRibbonColor = (type: string) => {
    if (!type) return 'bg-slate-400'; 
    if (type === "טיול מחוץ לסניף") return 'bg-brand-cyan'; 
    if (type === "כנס/אירוע מחוץ לסניף") return 'bg-purple-400';
    if (type === "פעילות לא שגרתית בסניף") return 'bg-brand-green';
    if (type === "יציאה רגלית באזור הסניף") return 'bg-amber-400';
    return 'bg-slate-400';
};

// לוגיקה לתצוגת דסקטופ (ריבוע צד שמאל)
const getSmartDateDisplay = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr || startStr);
    
    const sDay = start.getDate();
    const sMonth = start.getMonth() + 1;
    const sYear = start.getFullYear();
    
    const eDay = end.getDate();
    const eMonth = end.getMonth() + 1;
    const eYear = end.getFullYear();

    if (start.getTime() === end.getTime()) {
        return { top: `${sDay}`, bottom: `${sMonth < 10 ? '0'+sMonth : sMonth}/${sYear}` };
    }
    if (sMonth === eMonth && sYear === eYear) {
        return { top: `${sDay}-${eDay}`, bottom: `${sMonth < 10 ? '0'+sMonth : sMonth}/${sYear}` };
    }
    return { top: `${sDay}/${sMonth}-${eDay}/${eMonth}`, bottom: `${sYear}` };
};

// --- פונקציה חדשה לתצוגת מובייל תקנית (DD/MM/YYYY) ---
const getMobileDateString = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr || startStr);

    const sDay = start.getDate();
    const sMonth = (start.getMonth() + 1).toString().padStart(2, '0');
    const sYear = start.getFullYear();

    const eDay = end.getDate();
    const eMonth = (end.getMonth() + 1).toString().padStart(2, '0');
    const eYear = end.getFullYear();

    // אותו יום
    if (start.getTime() === end.getTime()) {
        return `${sDay}/${sMonth}/${sYear}`;
    }
    // אותו חודש ואותה שנה: 18-19/02/2026
    if (sMonth === eMonth && sYear === eYear) {
        return `${sDay}-${eDay}/${sMonth}/${sYear}`;
    }
    // אותה שנה, חודשים שונים
    if (sYear === eYear) {
        return `${sDay}/${sMonth} - ${eDay}/${eMonth}/${sYear}`;
    }
    // שנים שונות
    return `${sDay}/${sMonth}/${sYear.toString().slice(-2)} - ${eDay}/${eMonth}/${eYear.toString().slice(-2)}`;
};

export const TripCard = ({ trip, onDeleteDraft, onCancelTrip }: TripCardProps) => {
    const router = useRouter();
    const d = (trip.details || {}) as Record<string, unknown>;
    const timeline = (d.timeline as Array<Record<string, unknown>> | undefined) || [];
    const status = getStatusConfig(trip.status);
    const StatusIcon = status.icon;
    const isDraft = trip.status === 'draft';
    const isPast = new Date(trip.start_date) < new Date(new Date().setHours(0,0,0,0));
    const isCancelled = trip.status === 'cancelled';
    
    const endDate = typeof d.endDate === 'string' ? d.endDate : trip.start_date || '';
    const smartDate = getSmartDateDisplay(trip.start_date || '', endDate);
    const mobileDateString = getMobileDateString(trip.start_date || '', endDate);
    const dateRangeHeb = formatHebrewDateRange(trip.start_date || '', endDate);

    const deptName = trip.department || ''; 
    const isFemale = deptName.includes('בת מלך') || deptName.includes('בנות חב"ד') || deptName.includes('בנות חב״ד');
    const participantsLabel = isFemale ? 'משתתפות' : 'משתתפים';

    const handleCardClick = () => {
        router.push(`/dashboard/trip/${trip.id}`);
    };

    return (
        <div 
            onClick={handleCardClick}
            className={`bg-surface-card border border-border-subtle rounded-2xl md:rounded-l-2xl md:rounded-r-none shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col md:flex-row min-h-[140px] cursor-pointer
            ${isDraft ? 'border-dashed bg-gray-50/50' : ''}
            ${isPast || isCancelled ? 'opacity-75 grayscale-[0.1]' : ''}
        `}>
            
            {/* === MOBILE ONLY: Header === */}
            <div className="md:hidden flex flex-col w-full">
                <div className={`w-full py-1.5 px-3 flex items-center justify-center text-white text-xs font-bold ${getRibbonColor(typeof d.tripType === 'string' ? d.tripType : '')}`}>
                    {typeof d.tripType === 'string' ? d.tripType : ''}
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-gray-100">
                      {/* סטטוס מימין */}
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${status.bg} ${status.textCol}`}>
                         <StatusIcon size={12}/> {status.text}
                      </div>
                      
                      {/* תאריך משמאל - מסודר ונקי */}
                      <div className="text-left flex flex-col items-end gap-0.5">
                          <span className="text-sm font-black text-gray-800 leading-none">
                              {mobileDateString}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                              {dateRangeHeb}
                          </span>
                      </div>
                </div>
            </div>

            {/* === DESKTOP ONLY: Left Side Elements === */}
            <div className={`hidden md:flex absolute top-0 left-0 px-3 py-1.5 items-center gap-1.5 text-xs font-bold rounded-br-xl z-20 ${status.bg} ${status.textCol}`}>
                <StatusIcon size={14}/>
                {status.text}
            </div>

            <div className={`hidden md:flex w-9 shrink-0 items-center justify-center text-white text-[11px] font-bold z-10 ${getRibbonColor(typeof d.tripType === 'string' ? d.tripType : '')}`}>
                <span className="rotate-90 whitespace-nowrap tracking-wider drop-shadow-sm">{typeof d.tripType === 'string' ? d.tripType : ''}</span>
            </div>

            <div className="hidden md:flex w-32 shrink-0 flex-col justify-center items-center text-center p-2 border-l border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50/50">
                <div className="transform transition-transform duration-300 hover:-translate-y-1 cursor-default">
                    <div className="text-2xl font-black text-gray-800 leading-none dir-ltr tracking-tight">
                        {smartDate.top}
                    </div>
                    <div className="text-sm font-bold text-gray-500 dir-ltr mt-1">
                        {smartDate.bottom}
                    </div>
                    <div className="w-8 h-[2px] bg-gray-100 mx-auto my-2 rounded-full"></div>
                    <div className="text-[10px] text-gray-400 font-bold leading-tight px-1">
                        {dateRangeHeb}
                    </div>
                </div>
            </div>

            {/* === גוף הכרטיס === */}
            <div className="flex-1 p-4 pb-2 md:p-4 flex flex-col justify-center min-w-0 overflow-hidden relative">
                
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-4 mt-1 md:mt-0">
                    <h3 className="text-lg md:text-xl font-black text-gray-800 truncate leading-none" title={trip.name}>
                        {trip.name || 'ללא שם'}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 whitespace-nowrap">
                            {(typeof d.totalTravelers === 'string' || typeof d.totalTravelers === 'number') ? d.totalTravelers : 0} {participantsLabel}
                        </span>
                        {(typeof d.gradeFrom === 'string' || typeof d.gradeTo === 'string') && (
                            <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 whitespace-nowrap">
                                כיתות {String(d.gradeFrom || '')}-{String(d.gradeTo || '')}
                            </span>
                        )}
                    </div>
                </div>

                {/* רכבת */}
                <div className="relative w-full">
                    <div className="absolute left-0 top-0 bottom-4 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>

                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1 md:px-0 w-full items-stretch">
                        {timeline.length === 0 ? (
                            <div className="text-xs text-gray-400 italic p-2 w-full">טרם הוזן לו״ז</div>
                        ) : (
                            timeline.map((item, i: number) => {
                                const category = typeof item.category === 'string' ? item.category : 'other';
                                const catStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
                                const Icon = catStyle.icon;
                                
                                let titleText = typeof item.finalSubCategory === 'string' ? item.finalSubCategory : catStyle.label;
                                let subText = typeof item.finalLocation === 'string' ? item.finalLocation : '';

                                if (category === 'sleeping') {
                                    if (item.subCategory === 'לינת מבנה' || titleText === 'לינת מבנה') {
                                        titleText = 'לינת מבנה';
                                        const placeName = typeof item.otherDetail === 'string' ? item.otherDetail : '';
                                        const placeCity = typeof item.finalLocation === 'string' ? item.finalLocation : '';
                                        if (placeName && placeCity) subText = `${placeName} - ${placeCity}`;
                                        else subText = placeName || placeCity;
                                    } else {
                                         titleText = typeof item.subCategory === 'string' ? item.subCategory : 'לינה';
                                         subText = typeof item.finalLocation === 'string' ? item.finalLocation : '';
                                    }
                                }
                                
                                return (
                                    <div key={i} className="flex items-center shrink-0 group relative">
                                        <div className={`w-24 md:w-26 shrink-0 border rounded-xl p-1.5 flex flex-col gap-1 transition-all hover:shadow-md ${catStyle.pastelBg} ${catStyle.border}`}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center bg-white shadow-sm ${catStyle.darkText} shrink-0`}>
                                                    <Icon size={10} />
                                                </div>
                                                <span className={`text-[9px] md:text-[10px] font-black leading-tight truncate ${catStyle.darkText}`}>{catStyle.label}</span>
                                            </div>
                                            <div className="pr-0.5">
                                                <div className="text-[10px] md:text-[11px] font-bold text-gray-800 leading-tight truncate" title={titleText}>
                                                    {titleText || '-'}
                                                </div>
                                                {subText && (
                                                    <div className="text-[9px] text-gray-500 truncate flex items-center gap-0.5 mt-0.5" title={subText}>
                                                        <MapPin size={8} className="shrink-0"/>
                                                        {subText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {i < timeline.length - 1 && (
                                            <div className="shrink-0 px-0.5 text-gray-300 group-hover:text-brand-cyan transition-colors -ml-0.5 z-10 relative">
                                                <ChevronLeft size={16} strokeWidth={2} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* === כפתורים === */}
            <div className="flex flex-row md:flex-col justify-end p-3 gap-2 w-full md:w-32 shrink-0 bg-surface-card border-t md:border-t-0 border-gray-100">
                {isDraft ? (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/new-trip?id=${trip.id}`); }} 
                            className="w-full py-2 bg-brand-cyan text-white rounded-lg text-xs font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                            <FileEdit size={14}/> עריכה
                        </button>
                        {onDeleteDraft && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteDraft(trip.id); }} className="w-full py-2 bg-white border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-1">
                                <Trash2 size={14}/> מחק
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/trip/${trip.id}`); }}
                            className="w-full py-2 bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                        >
                            <ArrowRight size={14}/> לפרטים 
                        </button>

                        {onCancelTrip && !isPast && !isCancelled && (
                            <button onClick={(e) => { e.stopPropagation(); onCancelTrip(trip.id); }} className="w-full py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                                <Trash2 size={14}/> לביטול
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};