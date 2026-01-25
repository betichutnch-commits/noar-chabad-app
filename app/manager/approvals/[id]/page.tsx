"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { 
  Loader2, ArrowRight, MapPin, Calendar, User, FileText, CheckCircle, XCircle, AlertTriangle, Send
} from 'lucide-react'
import Link from 'next/link'

export default function TripActionPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // ניהול טופס דחייה/הערה
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
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
            ? `שמחים לבשר כי הטיול "${trip.name}" אושר. ${adminNote ? `הערות המטה: ${adminNote}` : ''}`
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

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
  if (!trip) return <div className="p-10">טיול לא נמצא</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fadeIn pb-32">
        
        {/* כפתור חזרה */}
        <Link href="/manager/approvals" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 font-bold w-fit">
            <ArrowRight size={20}/> חזרה לרשימה
        </Link>

        {/* כותרת ראשית */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black text-gray-800">{trip.name}</h1>
                <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <User size={16}/> הוגש ע"י: <b>{trip.coordinator_name}</b> ({trip.branch})
                </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold border 
                ${trip.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                  trip.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                סטטוס נוכחי: {trip.status === 'pending' ? 'ממתין לבדיקה' : trip.status === 'approved' ? 'אושר' : 'נדחה'}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* צד ימין: פרטי הטיול */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* קוביית פרטים */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-[#00BCD4]"/> פרטי הבקשה
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-400">תאריך יציאה</label>
                            <div className="font-medium">{new Date(trip.start_date).toLocaleDateString('he-IL')}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400">יעד / מיקום</label>
                            <div className="font-medium">{trip.details?.timeline?.[0]?.finalLocation || '-'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400">כמות משתתפים צפויה</label>
                            <div className="font-medium">{trip.details?.participantsCount || '-'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400">אחראי בשטח</label>
                            <div className="font-medium">{trip.details?.fieldContactName || '-'}</div>
                        </div>
                    </div>
                    
                    {/* תיאור */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                         <label className="text-xs font-bold text-gray-400">תיאור הפעילות ולו"ז</label>
                         <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-line">
                             {trip.details?.description || 'אין תיאור נוסף'}
                         </p>
                    </div>
                </div>

                {/* קבצים מצורפים */}
                {/* כאן אפשר להוסיף רשימת קבצים להורדה אם שמרנו אותם במערך ב-details */}
            </div>

            {/* צד שמאל: פעולות ניהול */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-md sticky top-10">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">ביצוע פעולה</h3>
                    
                    {/* אם הטיול טרם טופל או שרוצים לשנות החלטה */}
                    <div className="space-y-4">
                        <button 
                            onClick={() => setActionType('approve')}
                            className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${actionType === 'approve' 
                                ? 'border-green-500 bg-green-50 text-green-700' 
                                : 'border-gray-100 text-gray-500 hover:border-green-200 hover:text-green-600'}`}
                        >
                            <CheckCircle size={20}/> אשר טיול
                        </button>
                        
                        <button 
                            onClick={() => setActionType('reject')}
                            className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${actionType === 'reject' 
                                ? 'border-red-500 bg-red-50 text-red-700' 
                                : 'border-gray-100 text-gray-500 hover:border-red-200 hover:text-red-600'}`}
                        >
                            <XCircle size={20}/> דחה בקשה
                        </button>
                    </div>

                    {/* אזור הערות (מופיע רק כשבוחרים פעולה) */}
                    {actionType && (
                        <div className="mt-6 animate-fadeIn">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">
                                {actionType === 'approve' ? 'הערות נוספות לרכז (אופציונלי)' : 'סיבת הדחייה (חובה)'}
                            </label>
                            <textarea 
                                className="w-full p-3 rounded-xl border border-gray-300 text-sm min-h-[100px] outline-none focus:border-gray-800"
                                placeholder={actionType === 'approve' ? "למשל: תהנו! נא לשלוח תמונות." : "פרט מה חסר או למה הטיול נדחה..."}
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                            ></textarea>

                            <Button 
                                onClick={handleAction} 
                                isLoading={processing}
                                className={`w-full mt-4 shadow-lg ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                icon={<Send size={18}/>}
                            >
                                {actionType === 'approve' ? 'שלח אישור' : 'שלח דחייה'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}