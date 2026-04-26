"use client"

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ManagerHeader } from '@/components/layout/ManagerHeader';
import { 
  Mail, CheckCircle, Search, AlertTriangle, 
  User, Loader2, MessageCircle, ImageIcon, Send, Building2, Briefcase
} from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl'; // Import חובה
import { parseMessageContent, isOpenMessageStatus } from '@/lib/inbox';
import Image from 'next/image';

// --- רכיב עזר לתמונה מאובטחת ---
const SecureImage = ({ path }: { path: string }) => {
    // אם נשמר URL מלא (תמיכה לאחור)
    const imagePath = path.startsWith('http') ? path : path;
    const signedUrl = useSignedUrl(imagePath);

    if (!signedUrl) return <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs gap-1"><Loader2 size={12} className="animate-spin"/> טוען תמונה...</div>;

    return (
        <a href={signedUrl} target="_blank" rel="noreferrer">
            <Image src={signedUrl} alt="Screenshot" width={1200} height={800} className="max-h-40 w-auto rounded-lg border border-gray-200 hover:opacity-90 transition-opacity" unoptimized/>
        </a>
    );
};

// ... שאר הממשקים והפונקציות (ללא שינוי)
interface Message {
  id: string;
  created_at: string;
  subject: string;
  message: string;
  status: string; 
  category: string;
  user_id: string;
  admin_response?: string;
  replied_at?: string;
  profiles?: {
    full_name: string;
    phone: string;
    avatar_url: string;
    email?: string;
    role?: string;
    department?: string;
  };
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'treated'>('new');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ... fetchMessages, useEffect, handleSendReply, markAsTreated (כמו בקוד ששלחת, ללא שינוי)
  // אני מעתיק אותם כאן כדי שיהיה קובץ מלא

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles')
            .select('is_tech_admin')
            .eq('id', user.id)
            .single();
        
        const techAdmin = profile?.is_tech_admin || false;
        const { data: rawMsgs, error: msgError } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (msgError) throw msgError;
        
        if (!rawMsgs || rawMsgs.length === 0) {
            setMessages([]);
            setLoading(false);
            return;
        }

        let filteredMsgs = rawMsgs.filter(msg => {
            let s = (msg.status || 'new').toLowerCase().trim();
            if (s === 'pending') s = 'new'; 

            return filter === 'new' ? isOpenMessageStatus(s) : !isOpenMessageStatus(s);
        });

        if (!techAdmin) {
            filteredMsgs = filteredMsgs.filter(msg => {
                const c = (msg.category || 'general').toLowerCase().trim();
                return c !== 'bug';
            });
        }

        const userIds = Array.from(new Set(filteredMsgs.map(m => m.user_id).filter(Boolean)));
        
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone, avatar_url, email, role, department')
            .in('id', userIds);

        const combined = filteredMsgs.map(msg => {
            const userProfile = profiles?.find(p => p.id === msg.user_id);
            return {
                ...msg,
                profiles: userProfile || { full_name: 'משתמש לא נמצא', phone: '', avatar_url: '', role: 'משתמש', department: '-' }
            };
        });

        setMessages(combined as Message[]);
        
        if (selectedMsg) {
            const exists = combined.find(m => m.id === selectedMsg.id);
            if (!exists) setSelectedMsg(null);
            else setSelectedMsg(exists as Message);
        }

    } catch (error) {
        console.error("Error fetching inbox:", error);
    } finally {
        setLoading(false);
    }
  }, [filter, selectedMsg]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel('inbox_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
            fetchMessages();
        })
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const handleSendReply = async () => {
      if (!selectedMsg || !responseText.trim()) return;
      
      setSendingReply(true);
      try {
          const { error: msgError } = await supabase
            .from('contact_messages')
            .update({
                admin_response: responseText,
                replied_at: new Date().toISOString(),
                status: 'treated'
            })
            .eq('id', selectedMsg.id);

          if (msgError) throw msgError;

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
                user_id: selectedMsg.user_id,
                title: 'התקבלה תשובה לפנייתך',
                message: `המנהל השיב לפנייתך בנושא: "${selectedMsg.subject}". לחץ לצפייה.`,
                type: 'success',
                is_read: false,
                link: '/inbox'
            });

          if (notifError) console.error("Error creating notification:", notifError);

          setResponseText("");
          
          if (filter === 'new') {
              setMessages(prev => prev.filter(m => m.id !== selectedMsg.id));
              setSelectedMsg(null);
          } else {
              await fetchMessages();
          }
          
      } catch (err) {
          console.error("Error sending reply:", err);
          alert("שגיאה בשליחת התשובה");
      } finally {
          setSendingReply(false);
      }
  };

  const markAsTreated = async (id: string) => {
    const res = await fetch(`/api/contact-messages/${id}/treated`, { method: 'POST' });
    if (res.ok) {
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMsg(null);
    } else {
      alert('שגיאה בעדכון סטטוס הפנייה');
    }
  };

  const content = selectedMsg ? parseMessageContent(selectedMsg.message) : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ManagerHeader title="דואר נכנס ופניות" />

      <main className="max-w-6xl mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* טאבים */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center w-full md:w-auto">
                <button 
                  onClick={() => { setFilter('new'); setSelectedMsg(null); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'new' ? 'bg-[#E91E63] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Mail size={16}/> ממתינים לטיפול
                </button>
                <button 
                  onClick={() => { setFilter('treated'); setSelectedMsg(null); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'treated' ? 'bg-[#00BCD4] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CheckCircle size={16}/> ארכיון וטופלו
                </button>
            </div>
            <div className="text-sm text-gray-400 font-medium">
                מציג <span className="font-bold text-gray-800">{messages.length}</span> פניות
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
            
            {/* רשימה */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Search size={14}/> רשימת פניות
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="animate-spin text-[#00BCD4] mx-auto"/></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center p-6">
                            <CheckCircle size={32} className="text-gray-200 mb-2"/>
                            <p className="text-sm font-bold">התיבה ריקה</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isBug = (msg.category || '').toLowerCase() === 'bug';
                            const isSelected = selectedMsg?.id === msg.id;
                            
                            return (
                                <div 
                                    key={msg.id}
                                    onClick={() => setSelectedMsg(msg)}
                                    className={`p-4 rounded-2xl cursor-pointer border transition-all hover:shadow-md group relative flex flex-col gap-2
                                    ${isSelected ? 'bg-cyan-50 border-[#00BCD4] ring-1 ring-[#00BCD4]/30' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            {isBug ? (
                                                <span className="bg-red-100 text-red-600 p-1.5 rounded-lg shrink-0"><AlertTriangle size={14}/></span>
                                            ) : (
                                                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg shrink-0"><Mail size={14}/></span>
                                            )}
                                            <div>
                                                <span className="text-sm font-bold text-gray-800 block leading-tight">
                                                    {msg.profiles?.full_name || 'לא ידוע'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                            {new Date(msg.created_at).toLocaleDateString('he-IL')}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mr-9">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium truncate max-w-[80px]">
                                            {msg.profiles?.role === 'coordinator' ? 'רכז' : (msg.profiles?.role || 'משתמש')}
                                        </span>
                                        {msg.profiles?.department && (
                                            <span className="flex items-center gap-1 text-gray-400 truncate max-w-[100px]">
                                                <Building2 size={10}/> {msg.profiles.department}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className={`text-xs font-bold line-clamp-1 mr-9 ${isSelected ? 'text-[#00BCD4]' : 'text-gray-600'}`}>
                                        {msg.subject}
                                    </h4>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* תצוגה ראשית */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-lg flex flex-col relative overflow-hidden h-full">
                {selectedMsg && content ? (
                    <>
                        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start shrink-0">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-200 overflow-hidden border border-white shadow-sm shrink-0">
                                    {selectedMsg.profiles?.avatar_url ? (
                                        <Image src={selectedMsg.profiles.avatar_url} alt="Avatar" fill className="object-cover" unoptimized/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{selectedMsg.profiles?.full_name?.[0]}</div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 leading-tight mb-1">{selectedMsg.subject}</h2>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 font-bold text-gray-700">
                                            <User size={12}/> {selectedMsg.profiles?.full_name}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                                            <Briefcase size={12}/> {selectedMsg.profiles?.role === 'coordinator' ? 'רכז' : (selectedMsg.profiles?.role || 'ללא תפקיד')}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                                            <Building2 size={12}/> {selectedMsg.profiles?.department || 'כללי'}
                                        </span>
                                        {(selectedMsg.category || '').toLowerCase() === 'bug' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">תקלה טכנית</span>}
                                    </div>
                                </div>
                            </div>
                            
                            {filter === 'new' && !selectedMsg.admin_response && (
                                <button 
                                    onClick={() => markAsTreated(selectedMsg.id)}
                                    className="bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-green-200 shrink-0"
                                >
                                    <CheckCircle size={16}/> סמן כטופל
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar p-6 flex flex-col gap-6">
                            <div className="bg-gray-50 p-4 rounded-2xl rounded-tr-none border border-gray-100 self-start max-w-[90%]">
                                <div className="text-xs font-bold text-gray-400 mb-1 flex justify-between gap-4">
                                    <span>{selectedMsg.profiles?.full_name}</span>
                                    <span>{new Date(selectedMsg.created_at).toLocaleString('he-IL')}</span>
                                </div>
                                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                                    {content.text}
                                </div>
                                
                                {/* כאן התיקון הקריטי: תצוגה מאובטחת של צילום המסך */}
                                {content.imagePath && (
                                    <div className="mt-4">
                                        <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10}/> צילום מסך:</div>
                                        <SecureImage path={content.imagePath} />
                                    </div>
                                )}
                            </div>

                            {selectedMsg.admin_response && (
                                <div className="bg-cyan-50 p-4 rounded-2xl rounded-tl-none border border-cyan-100 self-end max-w-[90%] animate-fadeIn">
                                    <div className="text-xs font-bold text-cyan-700 mb-1 flex justify-between gap-4">
                                        <span>תשובת מנהל</span>
                                        <span>{selectedMsg.replied_at ? new Date(selectedMsg.replied_at).toLocaleString('he-IL') : ''}</span>
                                    </div>
                                    <div className="text-gray-800 text-sm whitespace-pre-wrap">
                                        {selectedMsg.admin_response}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                            {!selectedMsg.admin_response ? (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-500">שלח תשובה לרכז (תישלח התראה לנייד שלו):</label>
                                    <div className="flex gap-2">
                                        <textarea 
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder="כתוב כאן את התשובה... (לחיצה על שלח תעביר את ההודעה לארכיון)"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/20 resize-none h-20"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={handleSendReply}
                                                disabled={sendingReply || !responseText.trim()}
                                                className="h-full px-6 bg-[#00BCD4] text-white rounded-xl font-bold text-sm hover:bg-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                            >
                                                {sendingReply ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                <span>שלח</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-start gap-3 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                                        <a href={`mailto:${selectedMsg.profiles?.email || ''}`} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800"><Mail size={12}/> שלח במייל</a>
                                        {selectedMsg.profiles?.phone && (
                                            <a href={`https://wa.me/${selectedMsg.profiles.phone.replace(/\D/g,'')}`} target="_blank" className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700"><MessageCircle size={12}/> שלח בווצאפ</a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-2 text-gray-400 text-sm font-medium bg-gray-50 rounded-xl">
                                    <CheckCircle size={16} className="ml-2 text-green-500"/>
                                    הפנייה טופלה ונשלחה תשובה
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <Mail size={64} className="mb-4 opacity-20"/>
                        <p className="text-lg font-bold">בחר הודעה לצפייה בפרטים</p>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
}