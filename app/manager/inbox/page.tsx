"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { Loader2, AlertTriangle, HelpCircle, CheckCircle, Bug, Reply, Send, X } from 'lucide-react'

export default function ManagerInbox() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // ניהול תגובה
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    const init = async () => {
        // 1. בדיקת מנהל על
        const { data: { user } } = await supabase.auth.getUser();
        
        // הוסף את השורה הזו בתחילת הפונקציה (לפני ה-if):
        const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

        // ושנה את תנאי ה-if לשורה הזו:
        if (user?.email === SUPER_ADMIN_EMAIL) {
              setIsSuperAdmin(true);
        }

        // 2. שליפת הודעות
        fetchMessages();
    };
    init();
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('contact_messages')
      .select('*, user:user_id ( email, raw_user_meta_data )') 
      .order('created_at', { ascending: false });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  const markAsTreated = async (id: string) => {
      await supabase.from('contact_messages').update({ status: 'treated' }).eq('id', id);
      fetchMessages();
  };

  const sendReply = async (originalMsg: any) => {
      if (!replyText) return;
      setSendingReply(true);

      try {
          await supabase.from('notifications').insert([{
              user_id: originalMsg.user_id,
              title: `תשובה לפנייתך: ${originalMsg.subject}`,
              message: `מטה בטיחות ענה:\n"${replyText}"`,
              type: 'info',
              link: '/dashboard/contact'
          }]);

          await markAsTreated(originalMsg.id);
          
          setReplyingTo(null);
          setReplyText('');
          alert('התשובה נשלחה בהצלחה!');

      } catch (e) {
          alert('שגיאה בשליחה');
      } finally {
          setSendingReply(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
      <ManagerHeader title="דואר נכנס והודעות" />

      <div className="p-8 animate-fadeIn max-w-6xl mx-auto pb-32">
          
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase border-b border-gray-100">
                        <tr>
                            <th className="p-5">נושא</th>
                            <th className="p-5">מאת</th>
                            <th className="p-5">תוכן</th>
                            <th className="p-5">סטטוס</th>
                            <th className="p-5 text-left">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {messages.map((msg) => {
                            const isBug = msg.subject?.includes('תקלה') || msg.subject?.includes('באג');
                            
                            // *** כאן הסינון החכם: ***
                            // אם זה באג, ואני לא מנהל על -> אל תציג את השורה הזו בכלל
                            if (isBug && !isSuperAdmin) return null;

                            const isReplying = replyingTo === msg.id;
                            const senderName = msg.user?.raw_user_meta_data?.full_name || 'משתמש לא ידוע';

                            return (
                                <React.Fragment key={msg.id}>
                                    <tr className={`transition-colors ${isReplying ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-5 font-bold text-gray-800 flex items-center gap-2">
                                            {isBug ? <Bug size={16} className="text-red-500"/> : <HelpCircle size={16} className="text-blue-500"/>}
                                            {msg.subject}
                                        </td>
                                        <td className="p-5 text-sm text-gray-600">
                                            <div className="font-bold">{senderName}</div>
                                            <div className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString('he-IL')}</div>
                                        </td>
                                        <td className="p-5 text-sm text-gray-600 max-w-xs truncate cursor-pointer" title={msg.message} onClick={() => alert(msg.message)}>
                                            {msg.message}
                                        </td>
                                        <td className="p-5">
                                            {msg.status === 'treated' 
                                                ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">טופל</span>
                                                : <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">חדש</span>
                                            }
                                        </td>
                                        <td className="p-5 text-left flex justify-end gap-2">
                                            {msg.status !== 'treated' && !isReplying && (
                                                <>
                                                    <button onClick={() => setReplyingTo(msg.id)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1">
                                                        <Reply size={16}/> ענה
                                                    </button>
                                                    <button onClick={() => markAsTreated(msg.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg text-xs font-bold border border-transparent hover:border-green-200 transition-all">
                                                        <CheckCircle size={16}/>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                    
                                    {/* שורת תגובה נפתחת */}
                                    {isReplying && (
                                        <tr className="bg-blue-50/50 animate-fadeIn">
                                            <td colSpan={5} className="p-5">
                                                <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm max-w-2xl mr-auto">
                                                    <p className="text-xs font-bold text-blue-600 mb-2">תגובה ל: {senderName}</p>
                                                    <textarea 
                                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                                        placeholder="כתוב את תשובתך כאן..."
                                                        rows={3}
                                                        value={replyText}
                                                        onChange={e => setReplyText(e.target.value)}
                                                    ></textarea>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <Button variant="secondary" onClick={() => setReplyingTo(null)} className="bg-gray-200 text-gray-600 h-8 px-4"><X size={14}/></Button>
                                                        <Button onClick={() => sendReply(msg)} isLoading={sendingReply} icon={<Send size={14}/>} className="bg-blue-600 h-8 px-6 text-xs">שלח תשובה וסגור</Button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
              </div>
          </div>
      </div>
    </>
  )
}