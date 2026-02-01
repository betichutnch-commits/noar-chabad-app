"use client"

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Calendar, MapPin, Bus, Tent, Utensils, Ticket, 
  AlertTriangle, Save, CheckCircle, FileUp, 
  Flag, ChevronDown, ChevronUp, Lock, Unlock, HelpCircle, 
  Check, Trash2, Loader2, Link as LinkIcon,
  Home, Navigation, MessageSquare 
} from 'lucide-react'

// --- קבועים ורשימות ---
const ISRAEL_CITIES = ["ירושלים", "תל אביב", "חיפה", "רחובות", "כפר חב״ד", "צפת", "אילת", "טבריה", "נתניה", "אשדוד", "באר שבע", "לוד", "קריית מלאכי", "נחלת הר חב״ד", "נוף הגליל"].sort();
const GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב'];
const STAFF_AGES = ['גיל 13-18 (מד"צים)', 'מעל גיל 18', 'הורים מלווים', 'אחר'];

const TRIP_TYPES = [
    "טיול מחוץ לסניף", 
    "כנס/אירוע מחוץ לסניף", 
    "פעילות לא שגרתית בסניף", 
    "יציאה רגלית באזור הסניף", 
    "אחר"
];

const CATEGORIES: any = { 
  transport: { 
    label: 'התניידות', icon: Bus, color: 'blue', 
    options: [
      { label: 'הליכה ביום', license: false }, { label: 'הליכה בלילה', license: false }, 
      { label: 'נסיעה מאורגנת', license: false }, { label: 'תחבורה ציבורית', license: false }, 
      { label: 'רכבת', license: false }, { label: 'רכבים פרטיים', license: false }, 
      { label: 'אופניים', license: true }, { label: 'ג׳יפים', license: true }, { label: 'אחר', license: false }
    ] 
  }, 
  hiking: { 
    label: 'מסלול בטבע', icon: Navigation, color: 'emerald', 
    options: [
      { label: 'מסלול יום', license: false }, { label: 'מסלול לילה', license: false }, 
      { label: 'טיול ג׳יפים', license: true }, { label: 'אחר', license: false }
    ] 
  }, 
  attraction: { 
    label: 'אטרקציה', icon: Ticket, color: 'pink', 
    options: [
      { label: 'פארק מים', license: true }, { label: 'קיאקים/רפטינג', license: true }, 
      { label: 'שייט', license: true }, { label: 'בריכה', license: true }, 
      { label: 'גלישה/סאפ', license: true }, { label: 'פארק חבלים', license: true }, 
      { label: 'קיר טיפוס', license: true }, { label: 'טרקטורונים', license: true }, 
      { label: 'פיינטבול', license: true }, { label: 'לונה פארק', license: true }, 
      { label: 'קארטינג', license: true }, { label: 'מתקנים מתנפחים', license: true }, 
      { label: 'איי ג\'אמפ', license: true }, { label: 'לייזר טאג', license: true }, 
      { label: 'שייט טורנדו', license: true },
      { label: 'מוזיאון', license: false }, { label: 'מרכז מבקרים', license: false }, 
      { label: 'אתר מורשת', license: false }, { label: 'קבר צדיק', license: false }, { label: 'אחר', license: false }
    ] 
  }, 
  food: { 
    label: 'אוכל', icon: Utensils, color: 'yellow', 
    options: [
      { label: 'הכנה עצמית', license: false }, { label: 'אוכל קנוי', license: false }, 
      { label: 'מארזים סגורים קנויים', license: false }, { label: 'אוכל ביתי מבושל', license: false },
      { label: 'קייטרינג', license: false }, { label: 'על האש', license: false }, { label: 'אחר', license: false }
    ] 
  }, 
  settlement: { 
    label: 'פעילות ביישוב/מבנה', icon: Home, color: 'indigo', 
    options: [
      { label: 'פעילות בסניף', license: false },
      { label: 'אירוע באולם', license: false }, 
      { label: 'פעילות בבית כנסת', license: false }, 
      { label: 'פעילות בבית חב״ד', license: false }, 
      { label: 'פעילות במתנ״ס', license: false }, 
      { label: 'פעילות בבית פרטי', license: false }, 
      { label: 'פעילות בשטח פתוח', license: false }, 
      { label: 'פעילות בשטח מגודר תחת כיפת השמיים', license: false },
      { label: 'פארק/גינה', license: false }, { label: 'כנס', license: false }, { label: 'אחר', license: false }
    ] 
  },
  sleeping: { 
    label: 'לינה', icon: Tent, color: 'purple', 
    options: [
      { label: 'לינת מבנה', license: false }, { label: 'לינת שטח', license: true }, { label: 'אחר', license: false }
    ] 
  }, 
  other: { 
    label: 'אחר', icon: HelpCircle, color: 'gray', 
    options: [
      { label: 'פעילות כללית', license: false }, { label: 'טקס / התכנסות', license: false }, 
      { label: 'זמן חופשי', license: false }, { label: 'אחר', license: false }
    ] 
  } 
};

// פונקציית עזר לצבעים
const getColorHex = (colorName: string) => {
  const map: any = {
    blue: '#00BCD4', emerald: '#8BC34A', pink: '#E91E63', yellow: '#FFC107',
    indigo: '#3F51B5', purple: '#9C27B0', gray: '#9E9E9E', cyan: '#00BCD4', green: '#8BC34A'
  };
  return map[colorName] || '#00BCD4';
};

export default function NewTripPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // --- ניהול מודל מתקדם ---
  const [modalState, setModalState] = useState<{
      show: boolean;
      message: string;
      type: 'error' | 'success' | 'confirm';
      onConfirm?: () => void;
  }>({ show: false, message: '', type: 'error' });
  
  const showModal = (type: 'error' | 'success' | 'confirm', msg: string, onConfirm?: () => void) => {
      setModalState({ show: true, message: msg, type, onConfirm });
  };

  const handleModalClose = () => {
      setModalState(prev => ({ ...prev, show: false }));
      if (modalState.type === 'success') {
          window.location.href = '/dashboard';
      }
  };

  const handleModalConfirm = () => {
      if (modalState.onConfirm) {
          modalState.onConfirm();
      }
      setModalState(prev => ({ ...prev, show: false }));
  };

  // משתנים
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null); 
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isRowsLocked, setIsRowsLocked] = useState(false);
  const [showDateToast, setShowDateToast] = useState(false);
  
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);

  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  const [generalInfo, setGeneralInfo] = useState({ 
      name: '', 
      tripType: '', 
      tripTypeOther: '',
      startDate: '', 
      startTime: '08:00', 
      endDate: '', 
      endTime: '18:00', 
      gradeFrom: 'א', 
      gradeTo: 'ח', 
      chanichimCount: '', 
      totalTravelers: '', 
      staffAges: [] as string[], 
      staffOther: '', 
      generalComments: '' 
  });

  const [timeline, setTimeline] = useState<any[]>([]);
  
  const [currentLine, setCurrentLine] = useState({ 
    date: '', locationType: 'custom', locationValue: '', category: '', subCategory: '', 
    otherDetail: '', details: '', 
    licenseFile: null as {url: string, name: string} | null,
    insuranceFile: null as {url: string, name: string} | null
  });

  const [startHebrewDate, setStartHebrewDate] = useState('');
  const [endHebrewDate, setEndHebrewDate] = useState('');
  const [isUrgentError, setIsUrgentError] = useState(false);

  const getHebrewDateString = (dateString: string) => {
      if (!dateString) return '';
      try {
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('he-IL', { calendar: 'hebrew', day: 'numeric', month: 'long', weekday: 'long' }).format(date);
      } catch (e) { return ''; }
  };

  useEffect(() => {
    const checkUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setUser(data.user);
        else window.location.href = '/';
    };
    checkUser();
  }, []);

  useEffect(() => { 
    setStartHebrewDate(getHebrewDateString(generalInfo.startDate));
    setEndHebrewDate(getHebrewDateString(generalInfo.endDate));

    if (generalInfo.startDate && !currentLine.date) {
        setCurrentLine(prev => ({ ...prev, date: generalInfo.startDate }));
    }

    if (generalInfo.startDate) {
        const dateObj = new Date(generalInfo.startDate);
        const now = new Date();
        const diffTime = dateObj.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 3600);

        if (diffHours < 48 && diffTime > -86400000) {
            setIsUrgentError(true);
        } else {
            setIsUrgentError(false);
        }
    } else {
        setIsUrgentError(false);
    }
  }, [generalInfo.startDate, generalInfo.endDate]);

  const getNextDate = (d: string) => { if(!d) return ''; const x=new Date(d); x.setDate(x.getDate()+1); return x.toISOString().split('T')[0]; };
  const toggleStaffAge = (age: string) => setGeneralInfo(prev => ({ ...prev, staffAges: prev.staffAges.includes(age) ? prev.staffAges.filter(a => a !== age) : [...prev.staffAges, age] }));
  const isLicenseRequired = (cat: string, sub: string) => CATEGORIES[cat]?.options.find((o: any) => o.label === sub)?.license || false;

  const handleAddLine = () => {
    if (!currentLine.category) return showModal('error', 'נא לבחור קטגוריה');
    if (!currentLine.subCategory) return showModal('error', 'נא לבחור פעילות');
    if (currentLine.locationType !== 'branch' && !currentLine.locationValue) return showModal('error', 'נא להזין מיקום');
    if (currentLine.subCategory === 'אחר' && !currentLine.otherDetail) return showModal('error', 'נא לפרט בשדה "אחר"');
    if (currentLine.subCategory === 'לינת מבנה' && !currentLine.otherDetail) return showModal('error', 'חובה להזין כתובת/שם מקום ללינה');

    const needsLicense = isLicenseRequired(currentLine.category, currentLine.subCategory);
    
    const newLine = {
      id: Math.random().toString(36).substr(2, 9),
      ...currentLine,
      finalLocation: currentLine.locationType === 'branch' ? 'בסניף הקבוע' : currentLine.locationValue,
      finalSubCategory: currentLine.subCategory === 'אחר' ? currentLine.otherDetail : currentLine.subCategory,
      requiresLicense: needsLicense,
      licenseFile: currentLine.licenseFile,
      insuranceFile: currentLine.insuranceFile
    };
    
    setTimeline([...timeline, newLine]);
    setExpandedItem(null);

    let nextDate = currentLine.date;
    if (currentLine.category === 'sleeping') { 
        nextDate = getNextDate(currentLine.date); 
        setShowDateToast(true); 
        setTimeout(() => setShowDateToast(false), 3000); 
    }
    
    setCurrentLine({ 
        date: nextDate, locationType: 'custom', locationValue: '', category: '', subCategory: '', 
        otherDetail: '', details: '', licenseFile: null, insuranceFile: null
    });
  };

  const handleRemoveLine = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setTimeline(timeline.filter(item => item.id !== id)); };

  const handleUpload = async (file: File, type: 'license' | 'insurance', itemId?: string) => {
    if(!file) return;
    
    if (itemId) {
        setUploadingFileId(`${itemId}_${type}`);
    } else {
        if(type === 'license') setIsUploadingLicense(true);
        else setIsUploadingInsurance(true);
    }

    try {
        const fileExt = file.name.split('.').pop();
        const storageName = `${user.id}/${Date.now()}_${type}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('trip-files').upload(storageName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('trip-files').getPublicUrl(storageName);
        
        const fileObj = { url: publicUrl, name: file.name };
        
        if (itemId) {
            setTimeline(prev => prev.map(item => item.id === itemId ? { ...item, [type === 'license' ? 'licenseFile' : 'insuranceFile']: fileObj } : item));
        } else {
            setCurrentLine(prev => ({ ...prev, [type === 'license' ? 'licenseFile' : 'insuranceFile']: fileObj }));
        }
    } catch (e: any) { 
        showModal('error', 'שגיאה בהעלאה: ' + e.message); 
    } finally { 
        if (itemId) {
            setUploadingFileId(null); 
        } else { 
            if(type === 'license') setIsUploadingLicense(false); 
            else setIsUploadingInsurance(false); 
        } 
    }
  };

  const handleExistingLineDualUpload = async (event: any, itemId: string, type: 'license' | 'insurance') => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    handleUpload(file, type, itemId);
  };

  const handleLockToggle = () => {
      if (!isRowsLocked) {
          if (generalInfo.tripType !== "פעילות לא שגרתית בסניף" && timeline.length < 2) {
              return showModal('error', 'לא ניתן לסיים הוספת שורות. בסוג פעילות זה נדרשות לפחות 2 שורות בלו"ז.');
          }
      }
      setIsRowsLocked(!isRowsLocked);
  };

  const executeSubmission = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.from('trips').insert([{
            user_id: user.id, coordinator_name: user.user_metadata.full_name, branch: user.user_metadata.branch, department: user.user_metadata.department,
            name: generalInfo.name, start_date: generalInfo.startDate, status: 'pending', details: { ...generalInfo, timeline }
        }]);
        if (error) throw error;
        showModal('success', 'הטיול נשלח בהצלחה! תוך 48 שעות תתקבל תשובה.');
    } catch(e: any) { showModal('error', 'שגיאה: ' + e.message); } 
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (isUrgentError) return;
    if (!generalInfo.tripType || !generalInfo.name || !generalInfo.startDate || !generalInfo.endDate || !generalInfo.chanichimCount || !generalInfo.totalTravelers) return showModal('error', 'נא למלא את כל שדות החובה בפרטים הכלליים');
    if (timeline.length === 0) return showModal('error', 'יש להוסיף לפחות שורה אחת בפירוט הטיול');
    if (generalInfo.tripType !== "פעילות לא שגרתית בסניף" && timeline.length < 2) return showModal('error', 'נדרשות לפחות 2 שורות בלו"ז.');
    if (timeline.some(item => item.requiresLicense && (!item.licenseFile || !item.insuranceFile))) {
        showModal('confirm', 'יש פעילויות הדורשות אישורים שחסרים להן מסמכים. לשלוח בכל זאת?', executeSubmission);
        return;
    }
    executeSubmission();
  };

  const currentLineNeedsLicense = isLicenseRequired(currentLine.category, currentLine.subCategory);

  return (
    <>
      <Header title="הגשת טיול חדש" />

      {/* מודלים */}
      {modalState.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
              <div className={`bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-t-4 ${
                  modalState.type === 'success' ? 'border-[#8BC34A]' : 
                  modalState.type === 'confirm' ? 'border-[#FFC107]' : 'border-[#E91E63]'
              }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      modalState.type === 'success' ? 'bg-green-50 text-[#8BC34A]' : 
                      modalState.type === 'confirm' ? 'bg-yellow-50 text-[#FFC107]' : 'bg-red-50 text-[#E91E63]'
                  }`}>
                      {modalState.type === 'success' ? <CheckCircle size={32} /> : 
                       modalState.type === 'confirm' ? <HelpCircle size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  <h3 className="font-black text-xl mb-2 text-gray-800">{modalState.type === 'success' ? 'איזה יופי!' : modalState.type === 'confirm' ? 'רגע אחד...' : 'שים לב'}</h3>
                  <p className="text-gray-600 mb-6 text-sm font-medium leading-relaxed whitespace-pre-line">{modalState.message}</p>
                  <div className="flex gap-3">
                      {modalState.type === 'confirm' ? (
                          <>
                              <button onClick={handleModalClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-colors">לא, אני רוצה לתקן</button>
                              <button onClick={handleModalConfirm} className="flex-1 bg-[#FFC107] hover:bg-yellow-500 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-yellow-100">כן, שלח בכל זאת</button>
                          </>
                      ) : (
                          <button onClick={handleModalClose} className={`text-white px-6 py-3 rounded-xl font-bold w-full transition-colors ${modalState.type === 'success' ? 'bg-[#8BC34A] hover:bg-[#7CB342]' : 'bg-[#E91E63] hover:bg-pink-600'}`}>{modalState.type === 'success' ? 'מעולה, תודה' : 'הבנתי, אתקן'}</button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showDateToast && <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] bg-[#8BC34A] text-white px-8 py-4 rounded-full shadow-2xl animate-fadeIn flex items-center gap-3 border-2 border-white/20"><div className="bg-white/20 p-2 rounded-full"><Calendar size={24} /></div><div><p className="font-bold text-lg">שימו לב: התאריך עודכן ליום המחרת</p></div></div>}

      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden">
        
        {/* חלק א: פרטים כלליים */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-visible relative z-20 mb-8">
          <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm gap-2 rounded-t-3xl">
                <Flag size={20} />
                <span>פרטים כלליים</span>
          </div>
          
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                
                {/* 1. סוג הפעילות */}
                <div className="md:col-span-3 relative w-full">
                      <label className="text-xs font-bold text-gray-500 block mb-1">סוג הפעילות</label>
                      <div className="relative group">
                          <select className="w-full px-3 rounded-xl border border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none transition-all text-sm h-[60px] cursor-pointer appearance-none bg-white"
                             value={generalInfo.tripType} onChange={(e) => setGeneralInfo({...generalInfo, tripType: e.target.value})}>
                             <option value="">בחר סוג...</option>
                             {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown size={16}/></div>
                      </div>
                      {generalInfo.tripType === 'אחר' && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-pink-200 p-2 rounded-xl shadow-xl z-50 animate-fadeIn">
                              <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">פירוט:</label>
                              <input type="text" className="w-full px-2 py-1 text-xs border-b border-gray-300 focus:border-[#E91E63] outline-none bg-gray-50 rounded" 
                                 value={generalInfo.tripTypeOther} onChange={(e) => setGeneralInfo({...generalInfo, tripTypeOther: e.target.value})} autoFocus />
                          </div>
                      )}
                </div>

                {/* 2. שם הפעילות */}
                <div className="md:col-span-3 w-full">
                      <label className="text-xs font-bold text-gray-500 block mb-1">שם הפעילות</label>
                      <input type="text" className="w-full px-3 rounded-xl border border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none transition-all text-sm h-[60px]" 
                         value={generalInfo.name} onChange={(e) => setGeneralInfo({...generalInfo, name: e.target.value})} placeholder="לדוגמה: טיול לצפון" />
                </div>

                {/* 3. תאריכים ושעות */}
                <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {/* יציאה */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">התחלה</label>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 flex items-center h-[60px] focus-within:border-[#E91E63] focus-within:bg-white transition-colors overflow-hidden cursor-pointer" onClick={() => startDateRef.current?.showPicker()}>
                             <div className="flex-1 px-3 border-r border-gray-200 relative h-full flex flex-col justify-center">
                                 <input ref={startDateRef} type="date" className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none z-10 relative" 
                                     value={generalInfo.startDate} onChange={(e) => setGeneralInfo({...generalInfo, startDate: e.target.value})} onClick={(e) => e.stopPropagation()} />
                                 <div className="text-[10px] text-[#00BCD4] font-bold leading-none mt-0.5 truncate">{startHebrewDate || '-'}</div>
                             </div>
                             <div className="w-24 h-full flex items-center justify-center bg-gray-50/50 relative z-20 hover:bg-gray-100 transition-colors" onClick={(e) => { e.stopPropagation(); startTimeRef.current?.showPicker(); }}>
                                 <input ref={startTimeRef} type="time" step="900" className="w-full h-full bg-transparent text-sm font-bold text-gray-800 outline-none text-center cursor-pointer" 
                                     value={generalInfo.startTime} onChange={(e) => setGeneralInfo({...generalInfo, startTime: e.target.value})} />
                             </div>
                        </div>
                    </div>
                    {/* חזרה */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">סיום</label>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 flex items-center h-[60px] focus-within:border-[#E91E63] focus-within:bg-white transition-colors overflow-hidden cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                             <div className="flex-1 px-3 border-r border-gray-200 relative h-full flex flex-col justify-center">
                                 <input ref={endDateRef} type="date" className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none z-10 relative" 
                                     value={generalInfo.endDate} onChange={(e) => setGeneralInfo({...generalInfo, endDate: e.target.value})} onClick={(e) => e.stopPropagation()}/>
                                 <div className="text-[10px] text-[#00BCD4] font-bold leading-none mt-0.5 truncate">{endHebrewDate || '-'}</div>
                             </div>
                             <div className="w-24 h-full flex items-center justify-center bg-gray-50/50 relative z-20 hover:bg-gray-100 transition-colors" onClick={(e) => { e.stopPropagation(); endTimeRef.current?.showPicker(); }}>
                                 <input ref={endTimeRef} type="time" step="900" className="w-full h-full bg-transparent text-sm font-bold text-gray-800 outline-none text-center cursor-pointer" 
                                     value={generalInfo.endTime} onChange={(e) => setGeneralInfo({...generalInfo, endTime: e.target.value})} />
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {isUrgentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg flex items-center gap-2 text-xs font-bold animate-fadeIn mt-2">
                    <AlertTriangle size={14} className="shrink-0"/>
                    <div>שגיאה: לא ניתן להגיש טיול פחות מ-48 שעות לפני היציאה.</div>
                </div>
            )}

            <div className="h-px bg-gray-100"></div>

            {/* שורה שניה - כמות וצוות */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                
                <div className="md:col-span-3 w-full">
                    <label className="text-xs font-bold text-gray-500 block mb-1">שכבות גיל</label>
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 h-[60px] focus-within:border-[#E91E63] focus-within:bg-white transition-colors">
                        <select className="bg-transparent text-sm p-1 outline-none font-bold w-full cursor-pointer h-full text-gray-700" value={generalInfo.gradeFrom} onChange={(e) => setGeneralInfo({...generalInfo, gradeFrom: e.target.value})}>
                            <option value="">מכיתה...</option>{GRADES.map(g => <option key={g} value={g}>כיתה {g}</option>)}
                        </select>
                        <span className="text-gray-300">-</span>
                        <select className="bg-transparent text-sm p-1 outline-none font-bold w-full cursor-pointer h-full text-gray-700" value={generalInfo.gradeTo} onChange={(e) => setGeneralInfo({...generalInfo, gradeTo: e.target.value})}>
                            <option value="">עד כיתה...</option>{GRADES.map(g => <option key={g} value={g}>כיתה {g}</option>)}
                        </select>
                    </div>
                </div>

                <div className="md:col-span-2 w-full">
                    <label className="text-xs font-bold text-gray-500 block mb-1">ס"ה כמות חניכים</label>
                    <input type="number" className="w-full px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#E91E63] focus:bg-white h-[60px] transition-colors" value={generalInfo.chanichimCount} onChange={(e) => setGeneralInfo({...generalInfo, chanichimCount: e.target.value})} />
                </div>

                <div className="md:col-span-5 w-full relative bg-white rounded-xl border border-gray-100 p-2 min-h-[74px] flex flex-col justify-center group hover:border-pink-200 transition-colors">
                    <div className="flex items-center gap-2 px-1 mb-1">
                        <label className="text-xs font-bold text-gray-500 group-hover:text-[#E91E63] transition-colors">צוות משתתף בטיול</label>
                        <span className="text-[10px] text-gray-400 font-normal">(ניתן לבחור מס' אפשרויות)</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 items-center">
                        {STAFF_AGES.map(age => (
                            <button key={age} onClick={() => toggleStaffAge(age)} 
                                className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1
                                ${generalInfo.staffAges.includes(age) ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-sm' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-100'}`}>
                                {generalInfo.staffAges.includes(age) && <Check size={8}/>}
                                {age}
                            </button>
                        ))} 
                    </div>

                    {generalInfo.staffAges.includes('אחר') && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-pink-200 p-2 rounded-xl shadow-lg z-50 animate-fadeIn">
                            <input type="text" placeholder="נא לפרט כאן..." className="w-full p-2 text-xs border-b border-gray-300 focus:border-[#E91E63] outline-none bg-gray-50 rounded" value={generalInfo.staffOther} onChange={(e) => setGeneralInfo({...generalInfo, staffOther: e.target.value})} autoFocus />
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 w-full">
                    <label className="text-xs font-bold text-gray-500 block mb-1">ס"ה משתתפים</label>
                    <input type="number" className="w-full px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#E91E63] bg-[#E0F7FA] font-bold text-[#00BCD4] h-[60px] transition-colors" placeholder="חניכים + צוות" value={generalInfo.totalTravelers} onChange={(e) => setGeneralInfo({...generalInfo, totalTravelers: e.target.value})} />
                </div>

            </div>
          </div>
        </section>

        {/* === חלק ב': פירוט הטיול === */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-visible relative z-10 mb-8">
           <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm justify-between rounded-t-3xl">
               <div className="flex items-center gap-2"><MapPin size={20}/> <span>פירוט הפעילות / טיול</span></div>
               <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{timeline.length} שורות</span>
           </div>
           
           <div className="p-6 space-y-4 bg-gray-50 rounded-b-3xl">
              {timeline.map((item) => {
                  const catConfig = CATEGORIES[item.category];
                  const CatIcon = catConfig?.icon || Flag;
                  const isExpanded = expandedItem === item.id;
                  const colorClass = getColorHex(catConfig?.color);
                  const isMissingLicense = item.requiresLicense && (!item.licenseFile || !item.insuranceFile);

                  return (
                    <div key={item.id} className={`border rounded-xl overflow-hidden bg-white transition-all group shadow-sm hover:shadow-md ${isMissingLicense ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200 hover:border-[#E91E63]'}`}>
                        
                        {/* שורה סגורה */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`p-3 rounded-xl text-white shadow-sm`} style={{backgroundColor: colorClass}}><CatIcon size={20} /></div>
                                <div className="text-xs font-bold w-24 text-gray-500 bg-gray-50 border px-2 py-1.5 rounded-lg text-center flex flex-col justify-center">
                                    <span className="text-[10px] text-gray-400">תאריך</span>
                                    {item.date ? `${item.date.split('-')[2]}/${item.date.split('-')[1]}` : '-'}
                                </div>
                                {/* חץ למובייל */}
                                <div className="md:hidden text-gray-300 ml-auto">
                                    {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>

                            <div className="flex-1 w-full pl-8 md:pl-0">
                                <div className="text-sm font-black text-gray-800">{item.finalSubCategory}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} className="text-[#E91E63]"/> {item.finalLocation}</div>
                            </div>
                            
                            {item.requiresLicense && (
                             <div className={`text-xs px-3 py-1 rounded-full border items-center gap-1.5 font-bold flex w-fit
                                ${(item.licenseFile && item.insuranceFile) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {(item.licenseFile && item.insuranceFile) ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                                <span>{(item.licenseFile && item.insuranceFile) ? 'יש אישורים' : 'חסרים אישורים'}</span>
                             </div>
                            )}
                            
                            {/* חץ למחשב */}
                            <div className="hidden md:block text-gray-300 group-hover:text-[#E91E63] transition-colors">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                        </div>

                        {/* שורה פתוחה */}
                        {isExpanded && (
                            <div className="p-5 border-t border-gray-100 bg-white animate-fadeIn">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-4">
                                <div><span className="block text-xs font-bold text-gray-400 mb-1">מיקום מדויק</span><div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">{item.finalLocation}</div></div>
                                <div><span className="block text-xs font-bold text-gray-400 mb-1">פרטים נוספים</span><div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm min-h-[46px]">{item.details || '-'}</div></div>
                              </div>
                              
                              {item.requiresLicense && (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-orange-900 text-xs font-bold mb-3">
                                         <AlertTriangle size={16} className="text-orange-600"/>
                                         <span>מסמכים מצורפים לפעילות זו:</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                         <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${item.licenseFile ? 'bg-green-50 border-green-200' : 'bg-white border-orange-200'}`}>
                                             <div className="text-xs truncate flex-1">
                                                 <span className="block font-bold text-gray-500 mb-0.5">רישוי עסק:</span>
                                                 {item.licenseFile ? <a href={item.licenseFile.url} target="_blank" rel="noreferrer" className="text-green-700 font-bold hover:underline flex items-center gap-1"><LinkIcon size={12}/> {item.licenseFile.name}</a> : <span className="text-red-500 font-bold">חסר קובץ!</span>}
                                             </div>
                                             <label className="cursor-pointer p-2 bg-white border border-gray-200 rounded-lg hover:border-[#E91E63] text-gray-400 hover:text-[#E91E63] transition-colors shadow-sm">
                                                 {uploadingFileId === `${item.id}_license` ? <Loader2 size={16} className="animate-spin"/> : <FileUp size={16}/>}
                                                 <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleExistingLineDualUpload(e, item.id, 'license')} disabled={!!uploadingFileId} />
                                             </label>
                                         </div>

                                         <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${item.insuranceFile ? 'bg-green-50 border-green-200' : 'bg-white border-orange-200'}`}>
                                             <div className="text-xs truncate flex-1">
                                                 <span className="block font-bold text-gray-500 mb-0.5">ביטוח:</span>
                                                 {item.insuranceFile ? <a href={item.insuranceFile.url} target="_blank" rel="noreferrer" className="text-green-700 font-bold hover:underline flex items-center gap-1"><LinkIcon size={12}/> {item.insuranceFile.name}</a> : <span className="text-red-500 font-bold">חסר קובץ!</span>}
                                             </div>
                                             <label className="cursor-pointer p-2 bg-white border border-gray-200 rounded-lg hover:border-[#E91E63] text-gray-400 hover:text-[#E91E63] transition-colors shadow-sm">
                                                 {uploadingFileId === `${item.id}_insurance` ? <Loader2 size={16} className="animate-spin"/> : <FileUp size={16}/>}
                                                 <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleExistingLineDualUpload(e, item.id, 'insurance')} disabled={!!uploadingFileId} />
                                             </label>
                                         </div>
                                    </div>
                                </div>
                              )}
                              
                              <div className="mt-4 flex justify-end"><button onClick={(e) => handleRemoveLine(item.id, e)} className="text-[#E91E63] text-xs font-bold flex items-center gap-1 hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-pink-100"><Trash2 size={16} /> הסר שורה</button></div>
                            </div>
                        )}
                    </div>
                  )
              })}

              {!isRowsLocked && (
                <div className="bg-white p-5 rounded-2xl border-2 border-[#E91E63] border-dashed shadow-sm animate-fadeIn mt-4 relative">
                    <div className="absolute -top-3 right-4 bg-white px-2 text-xs font-bold text-[#E91E63]">הוספת שורה חדשה</div>
                    
                    {/* המהפך: גריד אנכי בטלפון */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        
                        {/* 1. תאריך */}
                        <div className="md:col-span-1 w-full">
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">תאריך</label>
                            <div className="w-full text-xs p-2 rounded-xl border border-gray-100 bg-gray-100 text-gray-500 h-[48px] flex items-center justify-center font-bold select-none cursor-default whitespace-nowrap overflow-hidden text-ellipsis">
                                {currentLine.date ? `${currentLine.date.split('-')[2]}/${currentLine.date.split('-')[1]}/${currentLine.date.split('-')[0]}` : '-'}
                            </div>
                        </div>
                        
                        {/* 2. מיקום */}
                        <div className="md:col-span-2 relative w-full">
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">מיקום</label>
                            <div className="relative">
                                <input type="text" className={`w-full text-sm p-3 rounded-xl border outline-none h-[48px] transition-colors ${currentLine.locationType === 'branch' ? 'bg-pink-50 border-pink-200 text-[#E91E63] font-bold cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:border-[#E91E63] focus:bg-white'}`} placeholder="הזן מיקום" value={currentLine.locationValue} readOnly={currentLine.locationType === 'branch'} 
                                    onFocus={() => { if (currentLine.locationType !== 'branch') setShowLocationSuggestions(true); }}
                                    onChange={e => { setCurrentLine({...currentLine, locationValue: e.target.value, locationType: 'custom'}); setShowLocationSuggestions(true); }}
                                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                />
                                {currentLine.locationType === 'branch' && (
                                    <div onClick={() => setCurrentLine({...currentLine, locationValue: '', locationType: 'custom'})} className="absolute top-full right-0 mt-1 text-[10px] text-red-400 font-bold cursor-pointer hover:text-red-600 hover:underline z-10 w-full text-center">לחץ להזנת מיקום אחר</div>
                                )}
                                {showLocationSuggestions && currentLine.locationType !== 'branch' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                        <div className="p-2 text-xs font-bold text-[#E91E63] hover:bg-pink-50 cursor-pointer border-b border-gray-100 flex items-center gap-2" onClick={() => setCurrentLine({...currentLine, locationValue: 'בסניף הקבוע', locationType: 'branch'})}><Home size={14} />הסניף הקבוע</div>
                                        {currentLine.locationValue.length >= 1 && ISRAEL_CITIES.filter(city => city.includes(currentLine.locationValue) && city !== currentLine.locationValue).map(city => (<div key={city} className="p-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50" onClick={() => setCurrentLine({...currentLine, locationValue: city, locationType: 'city'})}>{city}</div>))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. התרחשות + פירוט */}
                        <div className="md:col-span-5 flex flex-col md:flex-row gap-2 w-full">
                            <div className="flex-1 relative">
                                <label className="text-[10px] font-bold text-gray-400 mb-1 block">התרחשות</label>
                                <div className="w-full text-xs p-2 rounded-xl border border-gray-200 hover:border-[#E91E63] bg-gray-50 hover:bg-white cursor-pointer h-[48px] flex items-center justify-between px-3 transition-all" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}>
                                    <span className={`font-bold ${currentLine.category ? 'text-gray-800' : 'text-gray-400'}`}>{CATEGORIES[currentLine.category]?.label || 'בחר...'}</span><ChevronDown size={16} className="text-gray-400" />
                                </div>
                                {showCategoryDropdown && (
                                    <div className="absolute top-full right-0 w-48 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden">
                                        {Object.entries(CATEGORIES).map(([key, val]: any, index) => {
                                            const Icon = val.icon; const colors = ['text-[#00BCD4]', 'text-[#8BC34A]', 'text-[#E91E63]']; const bgs = ['hover:bg-cyan-50', 'hover:bg-green-50', 'hover:bg-pink-50'];
                                            return (<div key={key} className={`p-3 text-xs text-gray-700 ${bgs[index % 3]} cursor-pointer border-b border-gray-50 flex items-center gap-3 transition-colors`} onClick={() => { setCurrentLine({...currentLine, category: key, subCategory: '', otherDetail: ''}); setShowCategoryDropdown(false); }}><Icon size={16} className={colors[index % 3]} /><span className="font-bold">{val.label}</span></div>)
                                        })}
                                    </div>
                                )}
                                {showCategoryDropdown && <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setShowCategoryDropdown(false)}></div>}
                            </div>
                            <div className="flex-[1.5] relative">
                                <label className="text-[10px] font-bold text-gray-400 mb-1 block">פירוט ההתרחשות</label>
                                {currentLine.subCategory === 'אחר' ? (
                                    <div className="relative"><input type="text" className="w-full text-xs p-2 rounded-xl border border-gray-200 focus:border-[#E91E63] outline-none bg-white h-[48px]" placeholder="פרט..." autoFocus value={currentLine.otherDetail} onChange={e => setCurrentLine({...currentLine, otherDetail: e.target.value})} /><div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 cursor-pointer font-bold" onClick={() => setCurrentLine({...currentLine, subCategory: ''})}>X</div></div>
                                ) : (
                                    <><div className={`w-full text-xs p-2 rounded-xl border border-gray-200 h-[48px] flex items-center justify-between px-3 transition-all ${!currentLine.category ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-[#E91E63] bg-gray-50 hover:bg-white cursor-pointer'}`} onClick={() => { if(currentLine.category) setShowSubCategoryDropdown(!showSubCategoryDropdown) }}><span className={`font-bold ${currentLine.subCategory ? 'text-gray-800' : 'text-gray-400'}`}>{currentLine.subCategory || (currentLine.category ? 'בחר פירוט...' : '-')}</span><ChevronDown size={16} className="text-gray-400" /></div>
                                    {showSubCategoryDropdown && currentLine.category && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-48 overflow-y-auto">{CATEGORIES[currentLine.category]?.options.map((opt: any) => (<div key={opt.label} className="p-3 text-xs text-gray-700 hover:bg-pink-50 hover:text-[#E91E63] cursor-pointer border-b border-gray-50 font-bold transition-colors" onClick={() => { setCurrentLine({...currentLine, subCategory: opt.label}); setShowSubCategoryDropdown(false); }}>{opt.label}</div>))}</div>
                                    )}
                                    {showSubCategoryDropdown && <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setShowSubCategoryDropdown(false)}></div>}</>
                                )}
                            </div>
                        </div>

                        {/* 4. פרטים וכפתור הוספה */}
                        <div className="md:col-span-4 flex gap-2 items-end w-full">
                            {currentLine.subCategory === 'לינת מבנה' ? (
                                <div className="flex-grow flex flex-col md:flex-row gap-2">
                                    <div className="flex-1"><label className="text-[10px] font-bold text-red-400 mb-1 block">שם המקום/כתובת (חובה)</label><input type="text" className="w-full text-xs p-3 rounded-xl border border-red-200 bg-red-50 focus:border-red-400 focus:bg-white outline-none h-[48px]" placeholder="שם המקום/כתובת" value={currentLine.otherDetail} onChange={e => setCurrentLine({...currentLine, otherDetail: e.target.value})} /></div>
                                    <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 mb-1 block">פרטים נוספים</label><input type="text" className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#E91E63] outline-none bg-gray-50 focus:bg-white h-[48px]" placeholder="הערות..." value={currentLine.details} onChange={e => setCurrentLine({...currentLine, details: e.target.value})} /></div>
                                </div>
                            ) : (
                                <div className="flex-grow relative w-full">
                                    <div className="flex justify-between items-end mb-1"><label className="text-[10px] font-bold text-gray-400 block">{currentLine.category === 'hiking' ? 'פירוט המסלול' : 'פרטים נוספים'}</label>{currentLine.category === 'hiking' && (<a href="https://mokedteva.co.il/InfoCenter/TrackWizard" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#E91E63] flex items-center gap-1 hover:underline"><LinkIcon size={10} />לכניסה לאשף המסלולים של מוקד טבע</a>)}</div>
                                    <input type="text" className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#E91E63] outline-none bg-gray-50 focus:bg-white h-[48px]" placeholder={currentLine.category === 'hiking' ? 'מס\' המסלול וכו\'' : 'פרטים נוספים...'} value={currentLine.details} onChange={e => setCurrentLine({...currentLine, details: e.target.value})} />
                                </div>
                            )}
                            <div className="w-full md:w-auto mt-2 md:mt-0">
                                <button onClick={handleAddLine} className="bg-[#8BC34A] hover:bg-[#7CB342] text-white h-[48px] w-full md:w-[48px] rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0 mb-[1px]" title="לאישור השורה ופתיחת שורה חדשה">
                                    <Check size={28} strokeWidth={3} />
                                    <span className="md:hidden mr-2 font-bold">הוסף שורה ללו"ז</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* אזור העלאת קבצים החדש */}
                    {currentLineNeedsLicense && (
                        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col gap-3 animate-fadeIn">
                            <div className="flex items-center gap-2 text-orange-900 text-xs font-bold">
                                <AlertTriangle size={18} className="text-orange-600"/>
                                <span>פעילות זו דורשת אישורים. חובה להעלות את שני המסמכים הבאים:</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className={`flex-1 cursor-pointer bg-white border px-4 py-3 rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center justify-center gap-2 shadow-sm ${currentLine.licenseFile ? 'border-green-300 text-green-700 bg-green-50' : 'border-orange-200 text-orange-700 hover:bg-orange-100'}`}>
                                    {isUploadingLicense ? <Loader2 size={16} className="animate-spin" /> : currentLine.licenseFile ? <CheckCircle size={16}/> : <FileUp size={16} />} 
                                    {isUploadingLicense ? 'מעלה...' : currentLine.licenseFile ? `רישוי: ${currentLine.licenseFile?.name}` : 'העלאת רישוי עסק (חובה)'}
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e.target.files![0], 'license')} disabled={isUploadingLicense} />
                                </label>
                                <label className={`flex-1 cursor-pointer bg-white border px-4 py-3 rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center justify-center gap-2 shadow-sm ${currentLine.insuranceFile ? 'border-green-300 text-green-700 bg-green-50' : 'border-orange-200 text-orange-700 hover:bg-orange-100'}`}>
                                    {isUploadingInsurance ? <Loader2 size={16} className="animate-spin" /> : currentLine.insuranceFile ? <CheckCircle size={16}/> : <FileUp size={16} />} 
                                    {isUploadingInsurance ? 'מעלה...' : currentLine.insuranceFile ? `ביטוח: ${currentLine.insuranceFile?.name}` : 'העלאת ביטוח (חובה)'}
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e.target.files![0], 'insurance')} disabled={isUploadingInsurance} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
              )}
              
              <div className="flex justify-center pt-4 pb-20">
                  <button onClick={handleLockToggle} className={`text-xs flex items-center gap-2 px-6 py-2 rounded-full border transition-all font-bold ${isRowsLocked ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-[#E91E63] border-[#E91E63] hover:bg-[#E91E63] hover:text-white'}`}>
                      {isRowsLocked ? <><Lock size={14}/> מצב צפייה (לחץ לעריכה)</> : <><Unlock size={14}/> סיום הוספת שורות</>}
                  </button>
              </div>
           </div>
        </section>

        {/* === חלק ג': הערות וסיום === */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-24">
            <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm gap-2">
               <MessageSquare size={20} />
               <span>הערות</span>
            </div>
            
            <div className="p-6">
                 <label className="block text-sm font-bold text-gray-700 mb-2">משהו שחשוב לך שנדע</label>
                 <textarea className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] min-h-[100px] resize-y" placeholder="דגשים מיוחדים, בקשות וכו'..." value={generalInfo.generalComments} onChange={(e) => setGeneralInfo({...generalInfo, generalComments: e.target.value})}></textarea>
            </div>
        </section>
      </div>
      
      {/* Footer Actions - דביק למטה במובייל */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40 transition-all md:pr-64">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-end gap-4">
              {isUrgentError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"><AlertTriangle size={16}/> תאריך היציאה קרוב מדי!</div>}
              <button onClick={handleSubmit} disabled={loading || isUrgentError} className={`bg-[#8BC34A] hover:bg-[#7CB342] text-white px-8 py-3.5 rounded-2xl font-black text-lg shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 ${loading || isUrgentError ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                  {loading ? 'שולח...' : (<><span>סיום ושליחת בקשה</span><Save size={20} /></>)}
              </button>
          </div>
      </div>

      <style jsx>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.3s ease-out; }`}</style>
    </>
  )
}