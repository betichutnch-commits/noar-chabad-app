"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Loader2, HelpCircle, Bug, Reply, Send, X, User, CheckCircle } from 'lucide-react'

// ייבוא Hook ו-Zod
import { useUser } from '@/hooks/useUser'
import { managerReplySchema } from '@/lib/schemas'

const SUPER_ADMIN_EMAIL = 'avremihalperin@gmail.com';

export default function ManagerInbox() {
  // 1. שימוש ב-Hook
  const { user, loading: userLoading } = useUser('/');

  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  
  // מודל גלובלי
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm: undefined });

  // ניהול תגובה
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // 2. טעינת הודעות
  useEffect(() => {
    const fetchMessages = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('contact_messages')
            .select('*, user:user_id ( email, raw_user_meta_data )') 
            .order('created_at', { ascending: false });
        
        if (data) setMessages(data);
        setMessagesLoading(false);
    };

    if (!userLoading && user) {
        fetchMessages();
    }
  }, [user, userLoading]);

  // חישוב הרשאות (מבוסס על ה-User מה-Hook)
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || user?.user_metadata?.contact_email === SUPER_ADMIN_EMAIL;

  const refreshMessages = async () => {
      const { data } = await supabase
          .from('contact_messages')
          .select('*, user:user_id ( email, raw_user_meta_data )') 
          .order('created_at', { ascending: false });
      if (data) setMessages(data);
  };

  const markAsTreated = async (id: string) => {
      await supabase.from('contact_messages').update({ status: 'treated' }).eq('id', id);
      refreshMessages();
  };

  const sendReply = async (originalMsg: any) => {
      // 3. ולידציה עם Zod
      const validation = managerReplySchema.safeParse({ replyText });
      if (!validation.success) {
          showModal('error', 'שגיאה', validation.error.issues[0].message);
          return;
      }

      setSendingReply(true);

      try {
          // שליחת התראה למשתמש
          await supabase.from('notifications').insert([{
              user_id: originalMsg.user_id,
              title: `תשובה לפנייתך: ${originalMsg.subject}`,
              message: `מטה בטיחות ענה:\n"${replyText}"`,
              type: 'info',
              link: '/dashboard/inbox' // מפנה לדואר הנכנס של המשתמש
          }]);

          // עדכון הודעה מקורית עם התשובה ושינוי סטטוס
          await supabase.from('contact_messages').update({ 
              status: 'treated',
              admin_reply: replyText 
          }).eq('id', originalMsg.id);
          
          await refreshMessages();
          
          setReplyingTo(null);
          setReplyText('');
          showModal('success', 'נשלח', 'התשובה נשלחה בהצלחה והמשתמש קיבל התראה.');

      } catch (e) {
          showModal('error', 'שגיאה', 'שגיאה בשליחה');
      } finally {
          setSendingReply(false);
      }
  };

  if (userLoading || messagesLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <ManagerHeader title="דואר נכנס והודעות" />
      
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
      />

      <div className="p-4 md:p-8 animate-fadeIn max-w-[100vw] overflow-x-hidden pb-32">
          
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right hidden md:table">
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
                            // סינון באגים אם לא סופר-אדמין
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
                                        <td className="p-5 text-sm text-gray-600 max-w-xs truncate cursor-pointer" title={msg.message} onClick={() => showModal('info', 'תוכן ההודעה', msg.message)}>
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
                                                    <Button variant="primary" onClick={() => setReplyingTo(msg.id)} className="h-8 px-4 text-xs" icon={<Reply size={14}/>}>ענה</Button>
                                                    <Button variant="ghost" onClick={() => markAsTreated(msg.id)} className="h-8 px-2 text-green-600 hover:bg-green-50"><CheckCircle size={18}/></Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
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

              {/* מובייל קארדס */}
              <div className="md:hidden space-y-4 p-4">
                  {messages.map((msg) => {
                       const isBug = msg.subject?.includes('תקלה') || msg.subject?.includes('באג');
                       if (isBug && !isSuperAdmin) return null;
                       const isReplying = replyingTo === msg.id;
                       const senderName = msg.user?.raw_user_meta_data?.full_name || 'משתמש לא ידוע';

                       return (
                           <div key={msg.id} className={`bg-white p-5 rounded-2xl border shadow-sm ${isReplying ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-200'}`}>
                               <div className="flex justify-between items-start mb-3">
                                   <div className="flex items-start gap-2">
                                       {isBug ? <Bug size={18} className="text-red-500 mt-1"/> : <HelpCircle size={18} className="text-blue-500 mt-1"/>}
                                       <div>
                                           <h3 className="font-bold text-gray-800 text-sm leading-tight">{msg.subject}</h3>
                                           <div className="flex items-center gap-2 mt-1">
                                               <span className="text-xs text-gray-500 flex items-center gap-1"><User size={12}/> {senderName}</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                               <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-4 border border-gray-100">{msg.message}</div>
                               {msg.status !== 'treated' && !isReplying && (
                                   <div className="flex gap-2">
                                       <Button onClick={() => setReplyingTo(msg.id)} className="flex-1 h-10 text-sm" icon={<Reply size={16}/>}>השב</Button>
                                       <Button variant="secondary" onClick={() => markAsTreated(msg.id)} className="h-10 w-12 flex justify-center"><CheckCircle size={18}/></Button>
                                   </div>
                               )}
                               {isReplying && (
                                   <div className="animate-fadeIn mt-2 pt-2 border-t border-blue-100">
                                       <textarea className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none bg-blue-50/30" placeholder="הקלד תשובה..." rows={3} value={replyText} onChange={e => setReplyText(e.target.value)}></textarea>
                                       <div className="flex gap-2 mt-3">
                                           <Button variant="secondary" onClick={() => setReplyingTo(null)} className="bg-gray-100 text-gray-500 h-10 px-0 w-12 flex items-center justify-center"><X size={18}/></Button>
                                           <Button onClick={() => sendReply(msg)} isLoading={sendingReply} icon={<Send size={16}/>} className="bg-blue-600 h-10 text-sm flex-1">שלח</Button>
                                       </div>
                                   </div>
                               )}
                           </div>
                       )
                  })}
              </div>
          </div>
      </div>
    </>
  )
}