"use client"

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ManagerHeader } from '@/components/layout/ManagerHeader';
import { 
  Mail, CheckCircle, Clock, Search, AlertTriangle, 
  User, Phone, Calendar, ChevronLeft, Filter, Loader2, MessageCircle
} from 'lucide-react';

// טיפוס נתונים להודעה
interface Message {
  id: string;
  created_at: string;
  subject: string;
  message: string;
  status: 'new' | 'treated';
  category: 'general' | 'bug';
  user_id: string;
  // נתונים שיגיעו מה-Join עם טבלת הפרופילים
  profiles?: {
    full_name: string;
    phone: string;
    avatar_url: string;
    email: string; // אם קיים בפרופיל
  };
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'treated'>('new');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [isTechAdmin, setIsTechAdmin] = useState(false);

  // טעינת נתונים
  // טעינת נתונים
  const fetchMessages = async () => {
    setLoading(true);
    console.log("מתחיל טעינת הודעות...");
    
    // 1. זיהוי המשתמש וההרשאות שלו
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles')
      .select('is_tech_admin')
      .eq('id', user.id)
      .single();
    
    const techAdmin = profile?.is_tech_admin || false;
    setIsTechAdmin(techAdmin);
    console.log("האם מנהל טכני?", techAdmin);

    // 2. בניית השאילתה - תיקון התחביר
    // שינינו מ-profiles:user_id ל-profiles בלבד, זה יותר בטוח
    let query = supabase
      .from('contact_messages')
      .select(`
        *,
        profiles (full_name, phone, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // 3. סינון לפי סטטוס (חדש/טופל)
    query = query.eq('status', filter);

    // 4. סינון אבטחה (אם לא טכני - אל תראה באגים)
    if (!techAdmin) {
      query = query.neq('category', 'bug');
    }

    const { data, error } = await query;
    
    if (error) {
        console.error("שגיאה בשליפת הודעות:", error);
    } else {
        console.log("הודעות שנמצאו:", data);
        setMessages(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [filter]); // רענון כשמחליפים טאב

  // פונקציה לסימון הודעה כטופלה
  const markAsTreated = async (id: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: 'treated' })
      .eq('id', id);

    if (!error) {
      // עדכון מהיר של הממשק (מחיקה מהרשימה)
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMsg(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ManagerHeader title="דואר נכנס ופניות" />

      <main className="max-w-6xl mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* --- טאבים ומסננים --- */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            
            <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center w-full md:w-auto">
                <button 
                  onClick={() => setFilter('new')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'new' ? 'bg-[#E91E63] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Mail size={16}/> ממתינים לטיפול
                </button>
                <button 
                  onClick={() => setFilter('treated')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'treated' ? 'bg-[#00BCD4] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CheckCircle size={16}/> ארכיון וטופלו
                </button>
            </div>

            <div className="text-sm text-gray-400 font-medium">
                מציג <span className="font-bold text-gray-800">{messages.length}</span> פניות
            </div>
        </div>

        {/* --- תוכן ראשי: רשימה + תצוגה מקדימה --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
            
            {/* צד ימין: רשימת הודעות */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Search size={14}/> רשימת פניות
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="animate-spin text-[#00BCD4] mx-auto"/></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center p-6">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle size={32} className="text-gray-300"/>
                            </div>
                            <p className="text-sm font-bold">הכל נקי!</p>
                            <p className="text-xs">אין הודעות בסטטוס הזה</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div 
                                key={msg.id}
                                onClick={() => setSelectedMsg(msg)}
                                className={`p-4 rounded-2xl cursor-pointer border transition-all hover:shadow-md group relative
                                ${selectedMsg?.id === msg.id ? 'bg-cyan-50 border-[#00BCD4] ring-1 ring-[#00BCD4]/30' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {msg.category === 'bug' ? (
                                            <span className="bg-red-100 text-red-600 p-1 rounded-lg"><AlertTriangle size={14}/></span>
                                        ) : (
                                            <span className="bg-blue-100 text-blue-600 p-1 rounded-lg"><Mail size={14}/></span>
                                        )}
                                        <span className="text-xs font-bold text-gray-800">
                                            {msg.profiles?.full_name || 'רכז לא מזוהה'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(msg.created_at).toLocaleDateString('he-IL')}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-700 line-clamp-1 mb-1 group-hover:text-[#00BCD4] transition-colors">
                                    {msg.subject}
                                </h4>
                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                    {msg.message}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* צד שמאל: תצוגה מלאה */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-lg flex flex-col relative overflow-hidden">
                {selectedMsg ? (
                    <>
                        {/* Header הודעה */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-200 overflow-hidden border border-white shadow-sm">
                                    {selectedMsg.profiles?.avatar_url ? (
                                        <img src={selectedMsg.profiles.avatar_url} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">{selectedMsg.profiles?.full_name?.[0]}</div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 leading-tight mb-1">
                                        {selectedMsg.subject}
                                    </h2>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                                            <User size={12}/> {selectedMsg.profiles?.full_name}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                                            <Phone size={12}/> {selectedMsg.profiles?.phone || 'לא זמין'}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                                            <Calendar size={12}/> {new Date(selectedMsg.created_at).toLocaleString('he-IL')}
                                        </span>
                                        {selectedMsg.category === 'bug' && (
                                            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                תקלה טכנית
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {filter === 'new' && (
                                <button 
                                    onClick={() => markAsTreated(selectedMsg.id)}
                                    className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-green-200"
                                >
                                    <CheckCircle size={16}/> סמן כטופל
                                </button>
                            )}
                        </div>

                        {/* תוכן ההודעה */}
                        <div className="flex-1 p-8 overflow-y-auto bg-white">
                            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {selectedMsg.message}
                            </div>
                        </div>

                        {/* Footer פעולות */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                            <a 
                                href={`mailto:?subject=תשובה לפנייתך: ${selectedMsg.subject}&body=שלום ${selectedMsg.profiles?.full_name},%0D%0A%0D%0Aבהמשך לפנייתך בנושא "${selectedMsg.subject}"...`}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-[#00BCD4] hover:border-[#00BCD4] rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <Mail size={16}/> השב במייל
                            </a>
                            {selectedMsg.profiles?.phone && (
                                <a 
                                    href={`https://wa.me/${selectedMsg.profiles.phone.replace(/\D/g,'')}?text=שלום ${selectedMsg.profiles.full_name}, אני פונה אליך לגבי הפנייה: ${selectedMsg.subject}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white hover:bg-[#128C7E] rounded-xl text-sm font-bold transition-all shadow-md"
                                >
                                    <MessageCircle size={16}/> השב בווצאפ
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <Mail size={64} className="mb-4 opacity-20"/>
                        <p className="text-lg font-bold">בחר הודעה לצפייה</p>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
}