"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { 
  Calendar, MapPin, AlertTriangle, Save, CheckCircle, FileUp, 
  Flag, ChevronDown, ChevronUp, Lock, Unlock, Check, Trash2, Loader2, Link as LinkIcon,
  Home, Info, ArrowRight, FileEdit, HelpCircle, MessageSquare, User, Phone, CreditCard, Mail, Hash, Plus, X, Briefcase, UserPlus, Settings, Edit2
} from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

import { 
    ISRAEL_CITIES, GRADES, STAFF_AGES, TRIP_LOGIC, 
    TRIP_TYPES_CONFIG, CATEGORIES, getColorHex 
} from '@/lib/constants'
import { getHebrewDateString } from '@/lib/dateUtils'

// --- קומפוננטת Input פנימית ---
const CustomInput = ({ label, icon, error, readOnly, ...props }: any) => (
    <div className="w-full">
        {label && <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">{label}</label>}
        <div className="relative">
            {icon && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 pointer-events-none">
                    {React.cloneElement(icon, { size: 14 })}
                </div>
            )}
            <input 
                readOnly={readOnly}
                {...props}
                className={`w-full h-[48px] rounded-lg border outline-none font-bold text-xs transition-all
                ${icon ? 'pr-9' : 'pr-3'} pl-3
                ${readOnly 
                    ? 'bg-gray-100 text-gray-500 border-transparent cursor-not-allowed' 
                    : error 
                        ? 'border-red-200 bg-red-50 text-red-600 placeholder-red-300' 
                        : 'bg-white border-gray-200 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] text-[#263238]'
                } ${props.className || ''}`}
            />
        </div>
        {error && <p className="text-[10px] text-red-500 font-bold mt-1 mr-1">{error}</p>}
    </div>
);

function NewTripContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); 
  const [userGender, setUserGender] = useState<'male' | 'female' | 'mixed'>('mixed');
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [tempOtherType, setTempOtherType] = useState('');

  // --- ניהול מודל ---
  const [modalState, setModalState] = useState<{
      show: boolean;
      message: string;
      type: 'error' | 'success' | 'confirm' | 'info';
      onConfirm?: () => void;
  }>({ show: false, message: '', type: 'error' });
  
  const showModal = (type: 'error' | 'success' | 'confirm' | 'info', msg: string, onConfirm?: () => void) => {
      setModalState({ show: true, message: msg, type, onConfirm });
  };

  const handleModalClose = () => {
      setModalState(prev => ({ ...prev, show: false }));
      if (modalState.type === 'success' && modalState.message.includes('הצלחה')) {
          window.location.href = '/dashboard';
      }
      // אם זה info (המעבר לפרופיל), נבצע את המעבר בסגירה
      if (modalState.type === 'info' && modalState.onConfirm) {
          modalState.onConfirm();
      }
  };

  const handleModalConfirm = () => {
      if (modalState.onConfirm) modalState.onConfirm();
      setModalState(prev => ({ ...prev, show: false }));
  };

  // --- State לקבצים ונעילת שורות ---
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null); 
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isRowsLocked, setIsRowsLocked] = useState(false);
  
  // --- State להצעות מיקום וקטגוריות ---
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);

  // Refs לתאריכים
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  // --- State ראשי של הטיול ---
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
      generalComments: '',
      
      coordName: '',
      coordId: '',
      coordPhone: '',
      coordEmail: '',
      coordDob: '',

      secondaryStaffObj: null as any 
  });

  // --- State לטופס הוספת אחראי נוסף ---
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [isVerifyingStaff, setIsVerifyingStaff] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
      name: '',
      role: '',
      idNumber: '',
      dob: '',
      phone: '',
      email: ''
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

  const checkGender = (dept: string) => {
      if (!dept) return 'mixed';
      if (['הפנסאים', 'התמים', 'בני חב"ד'].some(d => dept.includes(d))) return 'male';
      if (['בת מלך', 'בנות חב"ד', 'בנות חב״ד'].some(d => dept.includes(d))) return 'female';
      return 'mixed';
  };

  const t = (key: string) => {
      const dict: any = {
          'save_draft': { male: 'שמור כטיוטה', female: 'שמרי כטיוטה', mixed: 'שמור/שמרי כטיוטה' },
          'submit': { male: 'שלח בקשה', female: 'שלחי בקשה', mixed: 'שליחת בקשה' },
          'select_type': { male: 'בחר סוג פעילות', female: 'בחרי סוג פעילות', mixed: 'בחירת סוג פעילות' },
      };
      return dict[key]?.[userGender] || key;
  };

  useEffect(() => {
    const checkUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
            setUser(data.user);
            setUserGender(checkGender(data.user.user_metadata?.department));
            
            if (!editId) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                if (profile) {
                    setGeneralInfo(prev => ({
                        ...prev,
                        coordName: `${profile.official_name} ${profile.last_name}`,
                        coordId: profile.identity_number || '',
                        coordPhone: profile.phone || '',
                        coordEmail: profile.email || '',
                        coordDob: profile.birth_date || ''
                    }));
                }
            }
        } else {
            window.location.href = '/';
        }
    };
    checkUser();
  }, [editId]);

  useEffect(() => {
      const fetchTrip = async () => {
          if (!editId) return;
          setLoading(true);
          const { data, error } = await supabase.from('trips').select('*').eq('id', editId).single();
          if (data && !error) {
              const d = data.details || {};
              setGeneralInfo({
                  name: data.name,
                  tripType: d.tripType,
                  tripTypeOther: d.tripTypeOther,
                  startDate: data.start_date,
                  startTime: d.startTime,
                  endDate: d.endDate,
                  endTime: d.endTime,
                  gradeFrom: d.gradeFrom,
                  gradeTo: d.gradeTo,
                  chanichimCount: d.chanichimCount,
                  totalTravelers: d.totalTravelers,
                  staffAges: d.staffAges || [],
                  staffOther: d.staffOther,
                  generalComments: d.generalComments,
                  coordName: d.coordName || '',
                  coordId: d.coordId || '',
                  coordPhone: d.coordPhone || '',
                  coordEmail: d.coordEmail || '',
                  coordDob: d.coordDob || '',
                  secondaryStaffObj: d.secondaryStaffObj || null
              });
              setTimeline(d.timeline || []);
              setStep(1); 
          }
          setLoading(false);
      };
      fetchTrip();
  }, [editId]);

  useEffect(() => { 
    setStartHebrewDate(getHebrewDateString(generalInfo.startDate));
    setEndHebrewDate(getHebrewDateString(generalInfo.endDate));
    if (generalInfo.startDate && !currentLine.date) setCurrentLine(prev => ({ ...prev, date: generalInfo.startDate }));
    
    if (generalInfo.startDate) {
        const dateObj = new Date(generalInfo.startDate);
        const now = new Date();
        const diffTime = dateObj.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 3600);
        if (diffHours < 48 && diffTime > -86400000) setIsUrgentError(true);
        else setIsUrgentError(false);
    } else setIsUrgentError(false);
  }, [generalInfo.startDate, generalInfo.endDate]);

  const getNextDate = (d: string) => { if(!d) return ''; const x=new Date(d); x.setDate(x.getDate()+1); return x.toISOString().split('T')[0]; };
  const toggleStaffAge = (age: string) => setGeneralInfo(prev => ({ ...prev, staffAges: prev.staffAges.includes(age) ? prev.staffAges.filter(a => a !== age) : [...prev.staffAges, age] }));
  const isLicenseRequired = (cat: string, sub: string) => CATEGORIES[cat]?.options.find((o: any) => o.label === sub)?.license || false;

  const handleTypeSelect = (typeId: string) => {
      if (typeId === "אחר") setIsOtherSelected(true);
      else { setGeneralInfo(prev => ({ ...prev, tripType: typeId, tripTypeOther: '' })); setStep(1); window.scrollTo(0,0); }
  };

  const submitOtherType = () => {
      if (!tempOtherType.trim()) return showModal('error', 'נא לפרט את סוג הפעילות');
      setGeneralInfo(prev => ({ ...prev, tripType: 'אחר', tripTypeOther: tempOtherType }));
      setStep(1); window.scrollTo(0,0);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value;
      if (generalInfo.startDate && newEnd < generalInfo.startDate) {
          showModal('error', 'תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.');
          setGeneralInfo(prev => ({ ...prev, endDate: '' }));
      } else setGeneralInfo(prev => ({ ...prev, endDate: newEnd }));
  };

  const handleSaveStaff = async () => {
      if (!newStaffData.name || !newStaffData.role || !newStaffData.idNumber || !newStaffData.dob || !newStaffData.phone || !newStaffData.email) {
          return showModal('error', 'יש למלא את כל השדות של האחראי.');
      }
      setIsVerifyingStaff(true);
      try {
          const { data: existingUser, error } = await supabase.from('profiles').select('id, official_name, last_name').eq('identity_number', newStaffData.idNumber).single();
          if (error || !existingUser) {
              setIsVerifyingStaff(false);
              return showModal('error', 'שגיאה: תעודת הזהות אינה קיימת במערכת.\nניתן להוסיף כאחראי רק משתמש רשום.');
          }
          setGeneralInfo(prev => ({
              ...prev,
              secondaryStaffObj: {
                  ...newStaffData,
                  userId: existingUser.id,
                  verifiedName: `${existingUser.official_name} ${existingUser.last_name}`
              }
          }));
          setShowAddStaffForm(false);
          setNewStaffData({ name: '', role: '', idNumber: '', dob: '', phone: '', email: '' });
      } catch (err) {
          showModal('error', 'אירעה שגיאה באימות הנתונים.');
      } finally {
          setIsVerifyingStaff(false);
      }
  };

  const handleRemoveStaff = () => {
      setGeneralInfo(prev => ({ ...prev, secondaryStaffObj: null }));
  };

  const handleAddLine = () => {
    if (!currentLine.category) return showModal('error', 'נא לבחור קטגוריה');
    if (!currentLine.subCategory) return showModal('error', 'נא לבחור פעילות');
    if (currentLine.locationType !== 'branch' && !currentLine.locationValue) return showModal('error', 'נא להזין מיקום');
    if (currentLine.subCategory === 'אחר' && !currentLine.otherDetail) return showModal('error', 'נא לפרט בשדה "אחר"');
    if (currentLine.subCategory === 'לינת מבנה' && !currentLine.otherDetail) return showModal('error', 'חובה להזין כתובת/שם מקום ללינה');

    let nextDate = currentLine.date;
    let didDateChange = false;

    if (currentLine.category === 'sleeping') {
        const calculatedNextDate = getNextDate(currentLine.date);
        if (new Date(calculatedNextDate) > new Date(generalInfo.endDate)) {
            return showModal('error', `לא ניתן להוסיף לינה בתאריך זה.\nהטיול מוגדר להסתיים ב-${generalInfo.endDate.split('-').reverse().join('/')}.\nיש לעדכן את תאריכי הטיול בפרטים הכלליים למעלה.`);
        }
        nextDate = calculatedNextDate;
        didDateChange = true;
    }

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
    if (didDateChange) showModal('info', 'הוספת לינה: התאריך בשורה הבאה עודכן אוטומטית ליום המחרת.');
    
    setCurrentLine({ 
        date: nextDate, locationType: 'custom', locationValue: '', category: '', subCategory: '', 
        otherDetail: '', details: '', licenseFile: null, insuranceFile: null
    });
  };

  const handleRemoveLine = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setTimeline(timeline.filter(item => item.id !== id)); };

  const handleUpload = async (file: File, type: 'license' | 'insurance', itemId?: string) => {
    if(!file) return;
    if (itemId) setUploadingFileId(`${itemId}_${type}`);
    else { if(type === 'license') setIsUploadingLicense(true); else setIsUploadingInsurance(true); }

    try {
        const fileExt = file.name.split('.').pop();
        const storageName = `${user.id}/${Date.now()}_${type}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('trip-files').upload(storageName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('trip-files').getPublicUrl(storageName);
        const fileObj = { url: publicUrl, name: file.name };
        
        if (itemId) setTimeline(prev => prev.map(item => item.id === itemId ? { ...item, [type === 'license' ? 'licenseFile' : 'insuranceFile']: fileObj } : item));
        else setCurrentLine(prev => ({ ...prev, [type === 'license' ? 'licenseFile' : 'insuranceFile']: fileObj }));
    } catch (e: any) { showModal('error', 'שגיאה בהעלאה: ' + e.message); } 
    finally { 
        if (itemId) setUploadingFileId(null); 
        else { if(type === 'license') setIsUploadingLicense(false); else setIsUploadingInsurance(false); } 
    }
  };

  const handleExistingLineDualUpload = async (event: any, itemId: string, type: 'license' | 'insurance') => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    handleUpload(file, type, itemId);
  };

  const handleLockToggle = () => {
      const config = TRIP_LOGIC[generalInfo.tripType] || TRIP_LOGIC['אחר'];
      const minRows = config.minRows || 2;
      if (!isRowsLocked && timeline.length < minRows) return showModal('error', `לא ניתן לסיים הוספת שורות. בסוג פעילות זה נדרשות לפחות ${minRows} שורות בלו"ז.`);
      setIsRowsLocked(!isRowsLocked);
  };

  const executeSubmission = async (status: 'pending' | 'draft') => {
    setLoading(true);
    try {
        const tripData = {
            user_id: user.id,
            coordinator_name: generalInfo.coordName,
            branch: user.user_metadata.branch, 
            department: user.user_metadata.department,
            name: generalInfo.name || (status === 'draft' ? 'טיוטה ללא שם' : ''), 
            start_date: generalInfo.startDate || new Date().toISOString(), 
            status: status, 
            details: { ...generalInfo, timeline }
        };

        let error;
        let newTripId = editId;

        if (editId) {
            const { error: err } = await supabase.from('trips').update(tripData).eq('id', editId);
            error = err;
        } else {
            const { data, error: err } = await supabase.from('trips').insert([tripData]).select().single();
            error = err;
            if (data) newTripId = data.id;
        }

        if (error) throw error;
        
        if (status === 'draft') return newTripId; // מחזיר ID לשימוש במעבר לפרופיל
        else showModal('success', 'הטיול נשלח בהצלחה! תוך 48 שעות תתקבל תשובה.');

    } catch(e: any) { 
        showModal('error', 'שגיאה: ' + e.message); 
        throw e;
    } finally { 
        setLoading(false); 
    }
  };

  const handleSubmit = async () => {
    if (isUrgentError) return;
    
    if (!generalInfo.coordName || !generalInfo.coordId) {
        return showModal('error', 'חסרים פרטי אחראי טיול (יש לוודא שהפרופיל האישי מעודכן).');
    }

    if (!generalInfo.tripType || !generalInfo.name || !generalInfo.startDate || !generalInfo.endDate || !generalInfo.chanichimCount || !generalInfo.totalTravelers) {
        return showModal('error', 'נא למלא את כל שדות החובה בפרטים הכלליים');
    }
    if (timeline.length === 0) return showModal('error', 'יש להוסיף לפחות שורה אחת בפירוט הטיול');
    
    const config = TRIP_LOGIC[generalInfo.tripType] || TRIP_LOGIC['אחר'];
    const minRows = config.minRows || 2;
    if (timeline.length < minRows) return showModal('error', `נדרשות לפחות ${minRows} שורות בלו"ז.`);
    
    if (timeline.some(item => item.requiresLicense && (!item.licenseFile || !item.insuranceFile))) {
        showModal('confirm', 'יש פעילויות הדורשות אישורים שחסרים להן מסמכים. לשלוח בכל זאת?', () => executeSubmission('pending'));
        return;
    }
    executeSubmission('pending');
  };

  const handleSaveDraft = async () => {
      if (!generalInfo.tripType) return showModal('error', 'כדי לשמור טיוטה חובה לבחור לפחות את סוג הטיול');
      const res = await executeSubmission('draft');
      if (res) showModal('success', 'הטיוטה נשמרה בהצלחה!');
  };

  // --- פונקציה חדשה: מעבר לעריכת פרופיל ---
  const handleGoToProfile = async () => {
      if (!generalInfo.tripType) {
          return showModal('error', 'כדי לשמור טיוטה ולעבור לפרופיל, בחר קודם סוג פעילות.');
      }
      
      const newId = await executeSubmission('draft');
      if (newId) {
          showModal('info', 'הטיול נשמר כטיוטה.\nמעביר אותך לעדכון פרטים בפרופיל...', () => {
              router.push(`/dashboard/profile?returnUrl=/dashboard/new-trip?id=${newId}`);
          });
      }
  };

  const currentLineNeedsLicense = isLicenseRequired(currentLine.category, currentLine.subCategory);
  const currentLogic = TRIP_LOGIC[generalInfo.tripType] || TRIP_LOGIC['אחר'];

  const getStaffTitle = (type: 'title' | 'additional') => {
      const isTrip = generalInfo.tripType === 'טיול מחוץ לסניף';
      const base = isTrip ? 'טיול' : 'הפעילות';
      const isFemale = userGender === 'female';

      if (type === 'title') {
          if (isTrip) return 'אחראי/ת הטיול'; 
          return isFemale ? 'אחראית הפעילות' : 'אחראי הפעילות';
      }
      
      if (type === 'additional') {
          return isFemale ? 'אחראית נוספת' : 'אחראי נוסף';
      }
      return '';
  };

  return (
    <>
      <Header title={step === 0 ? t('select_type') : (editId ? "עריכת טיול" : "הגשת טיול חדש")} />

      {modalState.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
              <div className={`bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-t-4 ${
                  modalState.type === 'success' ? 'border-[#8BC34A]' : 
                  modalState.type === 'confirm' ? 'border-[#FFC107]' : 
                  modalState.type === 'info' ? 'border-[#00BCD4]' : 'border-[#E91E63]'
              }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      modalState.type === 'success' ? 'bg-green-50 text-[#8BC34A]' : 
                      modalState.type === 'confirm' ? 'bg-yellow-50 text-[#FFC107]' : 
                      modalState.type === 'info' ? 'bg-cyan-50 text-[#00BCD4]' : 'bg-red-50 text-[#E91E63]'
                  }`}>
                      {modalState.type === 'success' ? <CheckCircle size={32} /> : 
                       modalState.type === 'confirm' ? <HelpCircle size={32} /> : 
                       modalState.type === 'info' ? <Info size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  <h3 className="font-black text-xl mb-2 text-gray-800">
                      {modalState.type === 'success' ? 'איזה יופי!' : 
                       modalState.type === 'confirm' ? 'רגע אחד...' : 
                       modalState.type === 'info' ? 'שים לב' : 'שגיאה'}
                  </h3>
                  <p className="text-gray-600 mb-6 text-sm font-medium leading-relaxed whitespace-pre-line">{modalState.message}</p>
                  <div className="flex gap-3">
                      {modalState.type === 'confirm' ? (
                          <>
                              <button onClick={handleModalClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-colors">לא, אני רוצה לתקן</button>
                              <button onClick={handleModalConfirm} className="flex-1 bg-[#FFC107] hover:bg-yellow-500 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-yellow-100">כן, שלח בכל זאת</button>
                          </>
                      ) : (
                          <button onClick={handleModalClose} className={`text-white px-6 py-3 rounded-xl font-bold w-full transition-colors ${
                              modalState.type === 'success' ? 'bg-[#8BC34A] hover:bg-[#7CB342]' : 
                              modalState.type === 'info' ? 'bg-[#00BCD4] hover:bg-[#00ACC1]' : 'bg-[#E91E63] hover:bg-pink-600'
                          }`}>
                              {modalState.type === 'success' ? 'מעולה, תודה' : 'הבנתי'}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 md:p-8 animate-fadeIn pb-32 max-w-[100vw] overflow-x-hidden">
        
        {step === 0 && (
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-gray-800 mb-2">איזו פעילות מתכננים?</h2>
                    <p className="text-gray-500">בחרו את סוג הפעילות להתחלת התהליך</p>
                </div>
                <div className="flex flex-col gap-3">
                    {TRIP_TYPES_CONFIG.map(type => {
                        const Icon = type.icon;
                        if (type.id === "אחר" && isOtherSelected) {
                            return (
                                <div key="other-input" className="bg-gray-50 p-4 rounded-2xl border border-gray-200 animate-fadeIn shadow-inner">
                                    <div className="flex gap-2">
                                        <CustomInput 
                                            value={tempOtherType}
                                            onChange={(e: any) => setTempOtherType(e.target.value)}
                                            placeholder="נא לפרט..." 
                                            autoFocus
                                        />
                                        <button onClick={submitOtherType} className="bg-[#E91E63] text-white px-4 rounded-xl font-bold text-sm shadow-sm hover:bg-pink-600 transition-colors">המשך</button>
                                    </div>
                                    <button onClick={() => setIsOtherSelected(false)} className="text-xs text-gray-400 mt-2 hover:text-gray-600 underline">ביטול וחזרה</button>
                                </div>
                            );
                        }
                        return (
                            <button key={type.id} onClick={() => handleTypeSelect(type.id)} className={`w-full p-4 rounded-2xl border ${type.border} ${type.bg} shadow-sm hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 hover:scale-[1.02]`}>
                                <Icon size={24} className={type.text} />
                                <div className={`text-base font-black ${type.text}`}>{type.label}</div>
                            </button>
                        )
                    })}
                </div>
            </div>
        )}

        {step === 1 && (
            <>
                <button onClick={() => setStep(0)} className="flex items-center gap-1 text-gray-400 hover:text-[#00BCD4] mb-4 text-xs font-bold transition-colors">
                    <ArrowRight size={16} /> חזרה לבחירת סוג
                </button>

                <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${TRIP_TYPES_CONFIG.find(t => t.id === generalInfo.tripType)?.bg || 'bg-gray-50'}`}>
                            {React.createElement(TRIP_TYPES_CONFIG.find(t => t.id === generalInfo.tripType)?.icon || Flag, { size: 20, className: TRIP_TYPES_CONFIG.find(t => t.id === generalInfo.tripType)?.text })}
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold">סוג פעילות נבחר</div>
                            <div className="font-black text-gray-800 text-lg leading-tight">{generalInfo.tripType === 'אחר' ? generalInfo.tripTypeOther : generalInfo.tripType}</div>
                        </div>
                    </div>
                    <button onClick={() => setStep(0)} className="text-xs font-bold text-[#00BCD4] bg-cyan-50 px-3 py-1.5 rounded-lg hover:bg-cyan-100 transition-colors">שנה</button>
                </div>

                {/* --- פרטים כלליים --- */}
                <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-visible relative z-20 mb-8 animate-fadeIn">
                  <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm gap-2 rounded-t-3xl">
                        <Flag size={20} />
                        <span>פרטים כלליים</span>
                  </div>
                  
                  <div className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-12 flex flex-col md:flex-row gap-4 w-full">
                            <div className="flex-1 w-full">
                                  <CustomInput 
                                      label={currentLogic.nameLabel}
                                      value={generalInfo.name} 
                                      onChange={(e: any) => setGeneralInfo({...generalInfo, name: e.target.value})} 
                                      placeholder={currentLogic.namePlaceholder} 
                                      autoFocus 
                                  />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">התחלה</label>
                                    <div className="bg-white rounded-lg border border-gray-200 flex items-center h-[48px] focus-within:border-[#E91E63] focus-within:ring-1 focus-within:ring-[#E91E63] transition-colors overflow-hidden cursor-pointer" onClick={() => startDateRef.current?.showPicker()}>
                                         <div className="flex-1 px-3 border-l border-gray-100 relative h-full flex flex-col justify-center">
                                             <input ref={startDateRef} type="date" className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none z-10 relative" 
                                                 value={generalInfo.startDate} onChange={(e) => setGeneralInfo({...generalInfo, startDate: e.target.value})} onClick={(e) => e.stopPropagation()} />
                                             <div className="text-[9px] text-[#00BCD4] font-bold leading-none mt-0.5 truncate">{startHebrewDate || '-'}</div>
                                         </div>
                                         <div className="w-20 h-full flex items-center justify-center bg-gray-50 relative z-20 hover:bg-gray-100 transition-colors" onClick={(e) => { e.stopPropagation(); startTimeRef.current?.showPicker(); }}>
                                             <input ref={startTimeRef} type="time" step="900" className="w-full h-full bg-transparent text-xs font-bold text-gray-800 outline-none text-center cursor-pointer" 
                                                 value={generalInfo.startTime} onChange={(e) => setGeneralInfo({...generalInfo, startTime: e.target.value})} />
                                         </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">סיום</label>
                                    <div className="bg-white rounded-lg border border-gray-200 flex items-center h-[48px] focus-within:border-[#E91E63] focus-within:ring-1 focus-within:ring-[#E91E63] transition-colors overflow-hidden cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                                         <div className="flex-1 px-3 border-l border-gray-100 relative h-full flex flex-col justify-center">
                                             <input ref={endDateRef} type="date" className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none z-10 relative" 
                                                 value={generalInfo.endDate} onChange={handleEndDateChange} onClick={(e) => e.stopPropagation()}/>
                                             <div className="text-[9px] text-[#00BCD4] font-bold leading-none mt-0.5 truncate">{endHebrewDate || '-'}</div>
                                         </div>
                                         <div className="w-20 h-full flex items-center justify-center bg-gray-50 relative z-20 hover:bg-gray-100 transition-colors" onClick={(e) => { e.stopPropagation(); endTimeRef.current?.showPicker(); }}>
                                             <input ref={endTimeRef} type="time" step="900" className="w-full h-full bg-transparent text-xs font-bold text-gray-800 outline-none text-center cursor-pointer" 
                                                 value={generalInfo.endTime} onChange={(e) => setGeneralInfo({...generalInfo, endTime: e.target.value})} />
                                         </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3 w-full">
                            <label className="text-xs font-bold text-gray-500 block mb-1.5">שכבות גיל</label>
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 h-[48px] focus-within:border-[#E91E63] focus-within:ring-1 focus-within:ring-[#E91E63] transition-colors">
                                <select className="bg-transparent text-xs p-1 outline-none font-bold w-full cursor-pointer h-full text-gray-700" value={generalInfo.gradeFrom} onChange={(e) => setGeneralInfo({...generalInfo, gradeFrom: e.target.value})}>
                                    <option value="">מכיתה...</option>{GRADES.map(g => <option key={g} value={g}>כיתה {g}</option>)}
                                </select>
                                <span className="text-gray-300">-</span>
                                <select className="bg-transparent text-xs p-1 outline-none font-bold w-full cursor-pointer h-full text-gray-700" value={generalInfo.gradeTo} onChange={(e) => setGeneralInfo({...generalInfo, gradeTo: e.target.value})}>
                                    <option value="">עד כיתה...</option>{GRADES.map(g => <option key={g} value={g}>כיתה {g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2 w-full">
                            <CustomInput 
                                label="ס'ה כמות חניכים"
                                type="number" 
                                value={generalInfo.chanichimCount} 
                                onChange={(e: any) => setGeneralInfo({...generalInfo, chanichimCount: e.target.value})} 
                            />
                        </div>

                        <div className="md:col-span-5 w-full bg-white rounded-xl border border-gray-200 p-2 flex flex-col justify-center group hover:border-[#E91E63] transition-all min-h-[74px]">
    <div className="flex items-center gap-2 px-1 mb-1">
        <label className="text-xs font-bold text-gray-500 group-hover:text-[#E91E63] transition-colors">
            {currentLogic.staffLabel}
        </label>
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
        <div className="mt-2 w-full animate-fadeIn border-t border-gray-100 pt-2">
            <input 
                type="text" 
                placeholder="נא לפרט כאן..." 
                className="w-full p-2 text-xs border border-gray-200 focus:border-[#E91E63] outline-none bg-gray-50 rounded-lg" 
                value={generalInfo.staffOther} 
                onChange={(e) => setGeneralInfo({...generalInfo, staffOther: e.target.value})} 
                autoFocus 
            />
        </div>
    )}
</div>

                        <div className="md:col-span-2 w-full">
                            <CustomInput 
                                label="ס'ה משתתפים"
                                type="number" 
                                className="bg-[#E0F7FA] font-bold text-[#00BCD4]"
                                placeholder="חניכים + צוות" 
                                value={generalInfo.totalTravelers} 
                                onChange={(e: any) => setGeneralInfo({...generalInfo, totalTravelers: e.target.value})} 
                            />
                        </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-visible relative z-10 mb-8 animate-fadeIn">
                   {/* ... Timeline (Schedule) Section ... */}
                   <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm justify-between rounded-t-3xl">
                       <div className="flex items-center gap-2"><MapPin size={20}/> <span>{currentLogic.timelineTitle}</span></div>
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
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                                    {/* ... Timeline Item Header ... */}
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`p-3 rounded-xl text-white shadow-sm`} style={{backgroundColor: colorClass}}><CatIcon size={20} /></div>
                                        <div className="text-xs font-bold w-24 text-gray-500 bg-gray-50 border px-2 py-1.5 rounded-lg text-center flex flex-col justify-center">
                                            <span className="text-[10px] text-gray-400">תאריך</span>
                                            {item.date ? `${item.date.split('-')[2]}/${item.date.split('-')[1]}` : '-'}
                                        </div>
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
                                    <div className="hidden md:block text-gray-300 group-hover:text-[#E91E63] transition-colors">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                                </div>

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
                                                         {isUploadingInsurance ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16}/>}
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
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                <div className="md:col-span-1 w-full">
                                    <label className="text-[10px] font-bold text-gray-400 mb-1 block">תאריך</label>
                                    <div className="w-full text-xs p-2 rounded-xl border border-gray-100 bg-gray-100 text-gray-500 h-[48px] flex items-center justify-center font-bold select-none cursor-default whitespace-nowrap overflow-hidden text-ellipsis">
                                        {currentLine.date ? `${currentLine.date.split('-')[2]}/${currentLine.date.split('-')[1]}/${currentLine.date.split('-')[0]}` : '-'}
                                    </div>
                                </div>
                                <div className="md:col-span-2 relative w-full">
                                    <CustomInput 
                                        label="מיקום"
                                        placeholder="הזן מיקום"
                                        value={currentLine.locationValue}
                                        readOnly={currentLine.locationType === 'branch'}
                                        onFocus={() => { if (currentLine.locationType !== 'branch') setShowLocationSuggestions(true); }}
                                        onChange={(e: any) => { setCurrentLine({...currentLine, locationValue: e.target.value, locationType: 'custom'}); setShowLocationSuggestions(true); }}
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
                                <div className="md:col-span-5 flex flex-col md:flex-row gap-2 w-full">
                                    <div className="flex-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">התרחשות</label>
                                        <div className="w-full text-xs p-2 rounded-lg border border-gray-200 hover:border-[#E91E63] bg-white cursor-pointer h-[60px] flex items-center justify-between px-3 transition-all" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}>
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
                                        <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">פירוט ההתרחשות</label>
                                        {currentLine.subCategory === 'אחר' ? (
                                            <div className="relative"><CustomInput placeholder="פרט..." autoFocus value={currentLine.otherDetail} onChange={(e: any) => setCurrentLine({...currentLine, otherDetail: e.target.value})} /><div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 cursor-pointer font-bold" onClick={() => setCurrentLine({...currentLine, subCategory: ''})}>X</div></div>
                                        ) : (
                                            <><div className={`w-full text-xs p-2 rounded-lg border border-gray-200 h-[60px] flex items-center justify-between px-3 transition-all ${!currentLine.category ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-[#E91E63] bg-white cursor-pointer'}`} onClick={() => { if(currentLine.category) setShowSubCategoryDropdown(!showSubCategoryDropdown) }}><span className={`font-bold ${currentLine.subCategory ? 'text-gray-800' : 'text-gray-400'}`}>{currentLine.subCategory || (currentLine.category ? 'בחר פירוט...' : '-')}</span><ChevronDown size={16} className="text-gray-400" /></div>
                                            {showSubCategoryDropdown && currentLine.category && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-48 overflow-y-auto">{CATEGORIES[currentLine.category]?.options.map((opt: any) => (<div key={opt.label} className="p-3 text-xs text-gray-700 hover:bg-pink-50 hover:text-[#E91E63] cursor-pointer border-b border-gray-50 font-bold transition-colors" onClick={() => { setCurrentLine({...currentLine, subCategory: opt.label}); setShowSubCategoryDropdown(false); }}>{opt.label}</div>))}</div>
                                            )}
                                            {showSubCategoryDropdown && <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setShowSubCategoryDropdown(false)}></div>}</>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-4 flex gap-2 items-end w-full">
                                    {currentLine.subCategory === 'לינת מבנה' ? (
                                        <div className="flex-grow flex flex-col md:flex-row gap-2">
                                            <div className="flex-1"><CustomInput label="שם המקום/כתובת (חובה)" placeholder="שם המקום/כתובת" value={currentLine.otherDetail} onChange={(e: any) => setCurrentLine({...currentLine, otherDetail: e.target.value})} /></div>
                                            <div className="flex-1"><CustomInput label="פרטים נוספים" placeholder="הערות..." value={currentLine.details} onChange={(e: any) => setCurrentLine({...currentLine, details: e.target.value})} /></div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow relative w-full">
                                            <div className="flex justify-between items-end mb-1.5"><label className="text-[10px] font-bold text-gray-400 block">{currentLine.category === 'hiking' ? 'פירוט המסלול' : 'פרטים נוספים'}</label>{currentLine.category === 'hiking' && (<a href="https://mokedteva.co.il/InfoCenter/TrackWizard" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#E91E63] flex items-center gap-1 hover:underline"><LinkIcon size={10} />לכניסה לאשף המסלולים של מוקד טבע</a>)}</div>
                                            <CustomInput placeholder={currentLine.category === 'hiking' ? 'מס\' המסלול וכו\'' : 'פרטים נוספים...'} value={currentLine.details} onChange={(e: any) => setCurrentLine({...currentLine, details: e.target.value})} />
                                        </div>
                                    )}
                                    <div className="w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={handleAddLine} className="bg-[#8BC34A] hover:bg-[#7CB342] text-white h-[60px] w-full md:w-[60px] rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0 mb-[1px]" title="לאישור השורה ופתיחת שורה חדשה">
                                            <Check size={28} strokeWidth={3} />
                                            <span className="md:hidden mr-2 font-bold">הוסף שורה ללו"ז</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
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

                {/* --- אזור הוספת אחראי (הוזז לפה) --- */}
                <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-visible relative z-10 mb-8 animate-fadeIn">
                    <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm gap-2 rounded-t-3xl">
                       <UserPlus size={20} />
                       <span>{getStaffTitle('title')}</span>
                    </div>
                    <div className="p-6">
                        
                        {/* פרטי האחראי הראשי (קריאה בלבד + לינק לעריכה) */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                {/* בוטל הכיתוב "אחראי ראשי" לבקשתך */}
                                <div className="text-xs text-gray-400 font-bold">הפרטים נשאבים מהפרופיל האישי</div>
                                <button 
                                    onClick={handleGoToProfile} 
                                    className="text-[10px] font-bold text-[#E91E63] hover:underline flex items-center gap-1"
                                >
                                    <Edit2 size={12}/> לעדכון פרטים בפרופיל
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <CustomInput label="שם מלא (כפי שמופיע בת.ז)" value={generalInfo.coordName} readOnly icon={<User size={14}/>} />
                                <CustomInput label="תעודת זהות" value={generalInfo.coordId} readOnly icon={<CreditCard size={14}/>} />
                                <CustomInput label="תאריך לידה" type="date" value={generalInfo.coordDob} readOnly />
                                <CustomInput label="טלפון" type="tel" value={generalInfo.coordPhone} readOnly icon={<Phone size={14}/>} />
                                <CustomInput label="אימייל" type="email" value={generalInfo.coordEmail} readOnly icon={<Mail size={14}/>} className="text-left" dir="ltr" />
                            </div>
                        </div>

                        {/* קו מפריד */}
                        <div className="h-px bg-gray-100 my-6"></div>

                        {/* אחראי נוסף */}
                        {generalInfo.secondaryStaffObj ? (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold text-lg">
                                        {generalInfo.secondaryStaffObj.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{generalInfo.secondaryStaffObj.name} <span className="text-xs font-normal text-gray-500">({generalInfo.secondaryStaffObj.role})</span></div>
                                        <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                                            <span>{generalInfo.secondaryStaffObj.phone}</span> • 
                                            <span>{generalInfo.secondaryStaffObj.idNumber}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleRemoveStaff} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="הסר אחראי">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ) : (
                            !showAddStaffForm ? (
                                <button onClick={() => setShowAddStaffForm(true)} className="w-full py-4 border border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-[#E91E63] hover:text-[#E91E63] hover:bg-pink-50 transition-all flex items-center justify-center gap-2 group text-sm">
                                    <Plus size={18}/> {getStaffTitle('additional')} (אופציונלי)
                                </button>
                            ) : (
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 animate-fadeIn">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-gray-500">פרטי {getStaffTitle('additional')} (כל השדות חובה)</span>
                                        <button onClick={() => setShowAddStaffForm(false)}><X size={18} className="text-gray-400"/></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                                        <CustomInput label="שם מלא" icon={<User size={14}/>} value={newStaffData.name} onChange={(e: any) => setNewStaffData({...newStaffData, name: e.target.value})} />
                                        <CustomInput label="תפקיד בארגון" icon={<Briefcase size={14}/>} value={newStaffData.role} onChange={(e: any) => setNewStaffData({...newStaffData, role: e.target.value})} />
                                        <CustomInput label="תעודת זהות" icon={<CreditCard size={14}/>} value={newStaffData.idNumber} onChange={(e: any) => setNewStaffData({...newStaffData, idNumber: e.target.value})} />
                                        <CustomInput label="תאריך לידה" type="date" value={newStaffData.dob} onChange={(e: any) => setNewStaffData({...newStaffData, dob: e.target.value})} />
                                        <CustomInput label="טלפון" icon={<Phone size={14}/>} type="tel" value={newStaffData.phone} onChange={(e: any) => setNewStaffData({...newStaffData, phone: e.target.value})} />
                                        <CustomInput label="אימייל" icon={<Mail size={14}/>} type="email" value={newStaffData.email} onChange={(e: any) => setNewStaffData({...newStaffData, email: e.target.value})} className="text-left" dir="ltr"/>
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleSaveStaff} disabled={isVerifyingStaff} className="bg-[#E91E63] text-white px-6 py-3 rounded-lg font-bold hover:bg-pink-600 transition-colors shadow-md text-xs flex items-center gap-2 h-[48px]">
                                            {isVerifyingStaff ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                                            {isVerifyingStaff ? 'בודק...' : 'שמור אחראי'}
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-24 animate-fadeIn">
                    <div className="bg-[#00BCD4] text-white h-12 flex items-center px-6 font-bold text-lg shadow-sm gap-2">
                       <MessageSquare size={20} />
                       <span>הערות</span>
                    </div>
                    <div className="p-6">
                         <label className="block text-sm font-bold text-gray-700 mb-2">משהו שחשוב לך שנדע</label>
                         <textarea className="w-full p-4 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] min-h-[100px] resize-y" placeholder="דגשים מיוחדים, בקשות וכו'..." value={generalInfo.generalComments} onChange={(e) => setGeneralInfo({...generalInfo, generalComments: e.target.value})}></textarea>
                    </div>
                </section>
                
                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 md:right-56 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40 transition-all">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-end gap-3">
                        {isUrgentError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"><AlertTriangle size={16}/> תאריך היציאה קרוב מדי!</div>}
                        <button onClick={handleSaveDraft} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3.5 rounded-2xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1">
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <FileEdit size={20} />}
                            <span>{t('save_draft')}</span>
                        </button>
                        <button onClick={handleSubmit} disabled={loading || isUrgentError} className={`bg-[#8BC34A] hover:bg-[#7CB342] text-white px-8 py-3.5 rounded-2xl font-black text-lg shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 ${loading || isUrgentError ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                            {loading ? 'שולח...' : (<><span>{t('submit')}</span><Save size={20} /></>)}
                        </button>
                    </div>
                </div>
            </>
        )}
      </div>
      <style jsx>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.3s ease-out; }`}</style>
    </>
  )
}

// 2. Export the wrapper
export default function NewTripPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>}>
       <NewTripContent />
    </Suspense>
  )
}