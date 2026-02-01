"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation' // שים לב לשינוי כאן
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { 
  Loader2, ArrowRight, MapPin, Calendar, User, FileText, 
  CheckCircle, XCircle, AlertTriangle, Send, Link as LinkIcon, Shield, FileCheck, Clock 
} from 'lucide-react'
import Link from 'next/link'

export default function TripActionPage() {
  // בגרסאות חדשות של נקסט, עדיף להשתמש ב-useParams ישירות או ב-React.use()
  // כדי לשמור על פשטות, נשתמש ב-useParams הסטנדרטי שעובד ברוב המקרים
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // ניהול טופס דחייה/הערה
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchTrip = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setTrip(data);
      setLoading(false);
    };
    fetchTrip();
  }, [id]);

  // פונקציית האישור/דחייה
  const handleAction = async () => {
    if (!actionType) return;
    if (actionType === 'reject' && !adminNote) return alert('חובה לכתוב סיבת דחייה');

    setProcessing(true);

    try {
        const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
        
        // 1. עדכון סטטוס הטיול
        const { error: tripError } = await supabase
            .from('trips')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (tripError) throw tripError;

        // 2. שליחת התראה לרכז (Notification)
        const title = actionType === 'approve' ? 'הטיול שלך אושר! 🎉' : 'הטיול לא אושר ⚠️';
        const message = actionType === 'approve' 
            ? `שמחים לבשר כי הטיול "${trip.name}" אושר. ${adminNote ? `\nהערות המטה: ${adminNote}` : ''}`
            : `הטיול "${trip.name}" לא אושר. סיבה: ${adminNote}`;

        await supabase.from('notifications').insert([{
            user_id: trip.user_id, // שולחים למי שיצר את הטיול
            title: title,
            message: message,
            type: actionType === 'approve' ? 'success' : 'error',
            link: `/dashboard/my-trips` // קישור לצפייה בטיול
        }]);

        alert('הפעולה בוצעה בהצלחה והודעה נשלחה לרכז.');
        router.push('/manager/approvals'); // חזרה לטבלה

    } catch (error: any) {
        alert('שגיאה: ' + error.message);
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;
  if (!trip) return <div className="p-10 text-center">טיול לא נמצא</div>;

  const details = trip.details || {};
  const timeline = details.timeline || [];

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn pb-32">
        
        {/* כפתור חזרה */}
        <Link href="/manager/approvals" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 font-bold w-fit transition-colors">
            <ArrowRight size={20}/> חזרה לרשימה
        </Link>

        {/* כותרת ראשית */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div>
                <h1 className="text-3xl font-black text-gray-800">{trip.name}</h1>
                <div className="flex items-center gap-2 text-gray-500 mt-2 text-sm">
                    <User size={16}/> הוגש ע"י: <span className="font-bold text-gray-700">{trip.coordinator_name}</span> 
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{trip.branch}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{new Date(trip.created_at).toLocaleDateString('he-IL')}</span>
                </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold border flex items-center gap-2
                ${trip.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                  trip.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {trip.status === 'pending' ? <Clock size={16}/> : trip.status === 'approved' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                {trip.status === 'pending' ? 'ממתין לבדיקה' : trip.status === 'approved' ? 'אושר' : 'נדחה'}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* צד ימין: פרטי הטיול והלו"ז */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* נתונים יבשים */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-[#00BCD4]"/> פרטי הבקשה
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1">תאריכים</label>
                            <div className="font-bold text-gray-800">{new Date(trip.start_date).toLocaleDateString('he-IL')} <span className="text-gray-300">|</span> {details.startTime || '08:00'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1">סוג פעילות</label>
                            <div className="font-bold text-gray-800">{details.tripType}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1">משתתפים</label>
                            <div className="font-bold text-gray-800">{details.totalTravelers} <span className="text-xs text-gray-500 font-medium">(חניכים: {details.chanichimCount})</span></div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1">שכבות גיל</label>
                            <div className="font-bold text-gray-800">{details.gradeFrom} - {details.gradeTo}</div>
                        </div>
                    </div>
                    
                    {details.generalComments && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                             <label className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-2"><AlertTriangle size={12}/> דגשים מהרכז:</label>
                             <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-xl border border-yellow-100 leading-relaxed">
                                 {details.generalComments}
                             </p>
                        </div>
                    )}
                </div>

                {/* לו"ז וקבצים - התיקון הגדול נמצא כאן */}
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">לו"ז וקבצים מצורפים</h3>
                        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-gray-200">{timeline.length} פעילויות</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {timeline.map((item: any, idx: number) => {
                            // בדיקה האם יש קבצים (תיקון הלוגיקה שלך)
                            const hasLicense = !!item.licenseFile;
                            const hasInsurance = !!item.insuranceFile;
                            const needsLicense = item.requiresLicense;

                            return (
                                <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[#00BCD4]/10 text-[#00BCD4] font-bold px-3 py-1 rounded-lg text-sm min-w-[60px] text-center mt-1 border border-[#00BCD4]/20">
                                            {item.date ? item.date.split('-')[2] + '/' + item.date.split('-')[1] : '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                        {item.finalSubCategory}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1"><MapPin size={14} className="text-[#E91E63]"/> {item.finalLocation}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span>{item.category}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* תצוגת סטטוס מסמכים */}
                                                {needsLicense && (
                                                    <div className="flex gap-2">
                                                        {hasLicense ? (
                                                            <a href={item.licenseFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-200 hover:bg-green-100 transition-colors">
                                                                <FileCheck size={14}/> רישיון עסק
                                                            </a>
                                                        ) : (
                                                            <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200">
                                                                <XCircle size={14}/> חסר רישיון
                                                            </span>
                                                        )}

                                                        {hasInsurance ? (
                                                            <a href={item.insuranceFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-colors">
                                                                <Shield size={14}/> ביטוח
                                                            </a>
                                                        ) : (
                                                            <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200">
                                                                <XCircle size={14}/> חסר ביטוח
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {item.details && <div className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100">{item.details}</div>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* צד שמאל: פעולות ניהול */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl sticky top-24">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">פעולות מנהל</h3>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={() => setActionType('approve')}
                            className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${actionType === 'approve' 
                                ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200 ring-offset-2' 
                                : 'border-gray-100 text-gray-500 hover:border-green-200 hover:text-green-600 hover:bg-green-50/50'}`}
                        >
                            <CheckCircle size={20}/> אשר את הטיול
                        </button>
                        
                        <button 
                            onClick={() => setActionType('reject')}
                            className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${actionType === 'reject' 
                                ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-2' 
                                : 'border-gray-100 text-gray-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50/50'}`}
                        >
                            <XCircle size={20}/> דחה / החזר לתיקון
                        </button>
                    </div>

                    {/* אזור כתיבת הערות */}
                    {actionType && (
                        <div className="mt-6 animate-fadeIn">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">
                                {actionType === 'approve' ? 'הערות סיכום (ישלחו לרכז)' : 'פרט את סיבת הדחייה (חובה)'}
                            </label>
                            <textarea 
                                className={`w-full p-3 rounded-xl border text-sm min-h-[120px] outline-none transition-all resize-none
                                ${actionType === 'approve' ? 'border-green-200 focus:border-green-500' : 'border-red-200 focus:border-red-500'}`}
                                placeholder={actionType === 'approve' ? "למשל: תהנו! נא לשלוח תמונות." : "למשל: חסר ביטוח ליום השני..."}
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                                autoFocus
                            ></textarea>

                            <Button 
                                onClick={handleAction} 
                                isLoading={processing}
                                className={`w-full mt-4 shadow-lg h-[50px] ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                                icon={<Send size={18}/>}
                            >
                                {actionType === 'approve' ? 'שלח אישור סופי' : 'שלח דחייה לרכז'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}