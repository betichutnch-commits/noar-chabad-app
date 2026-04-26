"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { 
  Bell, CheckCircle, AlertTriangle, Info, X, MailOpen, Trash2, Send, 
  ChevronDown, ChevronUp, Loader2, MessageCircle, HelpCircle, Wrench, ImageIcon
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { parseMessageContent, isBugCategory, normalizeMessageStatus } from '@/lib/inbox';
import Image from 'next/image';

// רכיב לתצוגת תמונה מאובטחת
const SecureImage = ({ path }: { path: string }) => {
    // אם הנתיב הוא URL מלא (תמיכה לאחור), נשתמש בו כמו שהוא
    const imagePath = path.startsWith('http') ? path : path;
    const signedUrl = useSignedUrl(imagePath);

    if (!signedUrl) return <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs gap-1"><Loader2 size={12} className="animate-spin"/> טוען תמונה...</div>;

    return (
        <a href={signedUrl} target="_blank" rel="noreferrer">
            <Image src={signedUrl} alt="Screenshot" width={1200} height={800} className="max-h-48 w-auto rounded-lg border border-gray-200 shadow-sm hover:opacity-90 transition-opacity" unoptimized/>
        </a>
    );
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
        day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

const parseMessageSubject = (originalSubject: string) => {
    let type = 'general';
    let cleanSubject = originalSubject || '';

    if (cleanSubject.includes('תקלה')) {
        type = 'bug';
        cleanSubject = cleanSubject.replace(/\[\s*תקלה\s*\]/g, '').trim();
    } else if (cleanSubject.includes('פניה') || cleanSubject.includes('פנייה')) {
        type = 'general';
        cleanSubject = cleanSubject.replace(/\[\s*פניה\s*\]/g, '').replace(/\[\s*פנייה\s*\]/g, '').trim();
    }

    cleanSubject = cleanSubject.replace(/^[:\-\s]+/, '');
    return { type, cleanSubject };
};

// פונקציה לפירוק התוכן (טקסט + תמונה)
export default function InboxPage() {
  const { user, loading: userLoading } = useUser('/');

  type NotificationItem = {
    id: string;
    is_read?: boolean;
    type?: string;
    title?: string;
    created_at?: string;
    message?: string;
    link?: string;
  };
  type SentMessageItem = {
    id: string;
    subject?: string;
    category?: string | null;
    message?: string;
    status?: string;
    created_at?: string;
    admin_response?: string | null;
  };

  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]); 
  const [sentMessages, setSentMessages] = useState<SentMessageItem[]>([]);

  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;

        try {
            // התראות
            const { data: incomingData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            setNotifications(incomingData || []);

            // הודעות יוצאות
            const { data: outgoingData } = await supabase
                .from('contact_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            setSentMessages(outgoingData || []);
        } catch (error) {
            console.error('Error fetching inbox data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    if (!userLoading && user) {
        fetchData();
    }
  }, [user, userLoading]);

  const markAsRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setModal({
          isOpen: true,
          type: 'confirm',
          title: 'מחיקת הודעה',
          message: 'האם למחוק הודעה זו?',
          onConfirm: async () => {
             setNotifications(prev => prev.filter(n => n.id !== id));
             await supabase.from('notifications').delete().eq('id', id);
             setModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const toggleExpand = (id: string, isRead: boolean = true) => {
      if (expandedId === id) {
          setExpandedId(null);
      } else {
          setExpandedId(id);
          if (activeTab === 'incoming' && !isRead) {
              markAsRead(id);
          }
      }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <CheckCircle size={20} className="text-green-500" />;
          case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
          case 'error': return <X size={20} className="text-red-500" />;
          default: return <Info size={20} className="text-[#00BCD4]" />;
      }
  };

  const getStatusBadge = (status: string) => {
      const s = (status || 'new').toLowerCase();
      const styles: Record<string, string> = {
          new: "bg-blue-50 text-blue-600 border-blue-200",
          treated: "bg-green-50 text-green-600 border-green-200",
          in_progress: "bg-orange-50 text-orange-600 border-orange-200",
          closed: "bg-gray-100 text-gray-600 border-gray-200"
      };
      const labels: Record<string, string> = { new: 'נשלח', in_progress: 'בטיפול', closed: 'סגור', treated: 'טופל' };
      return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${styles[s] || styles.new}`}>
              {labels[s] || 'נשלח'}
          </span>
      );
  };

  if (userLoading || dataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <Header title="הודעות ועדכונים" />
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm} 
      />

      <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn pb-32">
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-fit mb-6 mx-auto md:mx-0">
            <button 
                onClick={() => { setActiveTab('incoming'); setExpandedId(null); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${activeTab === 'incoming' ? 'bg-white text-[#00BCD4] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Bell size={16}/>
                דואר נכנס
                {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="bg-[#E91E63] text-white text-[10px] px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                        {notifications.filter(n => !n.is_read).length}
                    </span>
                )}
            </button>
            <button 
                onClick={() => { setActiveTab('outgoing'); setExpandedId(null); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${activeTab === 'outgoing' ? 'bg-white text-[#00BCD4] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Send size={16}/>
                פניות ששלחתי
            </button>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            
            {activeTab === 'incoming' && (
                notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <MailOpen size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-lg">אין הודעות חדשות</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((note) => {
                            const isExpanded = expandedId === note.id;
                            return (
                                <div key={note.id} className={`transition-all hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
                                    <div 
                                        onClick={() => toggleExpand(note.id, note.is_read)}
                                        className={`p-4 flex items-center gap-4 cursor-pointer ${!note.is_read ? 'bg-cyan-50/30' : ''}`}
                                    >
                                        <div className="shrink-0">{getIcon(note.type || 'info')}</div>
                                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
                                            <div className={`md:col-span-8 text-sm truncate ${!note.is_read ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                                                {note.title}
                                            </div>
                                            <div className="md:col-span-4 text-xs text-gray-400 flex items-center justify-end gap-2">
                                                <span>{formatDate(note.created_at || '')}</span>
                                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-6 pt-2 pl-12 border-t border-gray-100 animate-fadeIn">
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.message}</p>
                                            <div className="mt-4 flex items-center gap-3">
                                                {note.link && (
                                                    <a href={note.link} className="text-xs font-bold text-white bg-[#00BCD4] px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors">לפרטים נוספים</a>
                                                )}
                                                <button onClick={(e) => deleteNotification(note.id, e)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                                                    <Trash2 size={14}/> מחק הודעה
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {activeTab === 'outgoing' && (
                sentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Send size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-lg">לא נשלחו פניות עדיין</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sentMessages.map((msg) => {
                            const isExpanded = expandedId === msg.id;
                            const { cleanSubject } = parseMessageSubject(msg.subject || '');
                            const isBug = isBugCategory({ category: (msg.category as string) || null, subject: String(msg.subject || '') });
                            const content = parseMessageContent(String(msg.message || ''));

                            return (
                                <div key={msg.id} className={`transition-all hover:bg-gray-50 relative overflow-hidden ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
                                    
                                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm z-10
                                        ${isBug ? 'bg-[#E91E63]' : 'bg-[#00BCD4]'}`}
                                    >
                                        {isBug ? <Wrench size={12}/> : <HelpCircle size={12}/>}
                                        {isBug ? 'דיווח תקלה' : 'פנייה כללית'}
                                    </div>

                                    <div 
                                        onClick={() => toggleExpand(msg.id)}
                                        className="p-4 flex items-start gap-3 cursor-pointer"
                                    >
                                        <div className="shrink-0 w-16 mt-6">
                                            {getStatusBadge(msg.status || 'new')}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-4 items-center mt-6">
                                            <div className="md:col-span-8 text-sm font-bold text-gray-800 truncate">
                                                {cleanSubject}
                                            </div>
                                            <div className="md:col-span-4 text-xs text-gray-400 flex items-center justify-end gap-2">
                                                <span>{formatDate(msg.created_at || '')}</span>
                                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-4 pb-6 pt-2 pl-4 md:pl-12 border-t border-gray-100 animate-fadeIn space-y-4">
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 relative">
                                                <div className="text-xs font-bold text-gray-400 mb-1">הודעה שלך:</div>
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.text}</p>
                                                {content.imagePath && (
                                                    <div className="mt-3">
                                                        <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10}/> צילום מסך:</div>
                                                        <SecureImage path={content.imagePath} />
                                                    </div>
                                                )}
                                            </div>

                                            {msg.admin_response && (
                                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                                    <div className="flex items-center gap-2 text-green-800 text-xs font-bold mb-2">
                                                        <MessageCircle size={14}/> תשובת המערכת:
                                                    </div>
                                                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.admin_response}</p>
                                                </div>
                                            )}
                                            
                                            {!msg.admin_response && normalizeMessageStatus(String(msg.status || 'new')) !== 'closed' && normalizeMessageStatus(String(msg.status || 'new')) !== 'treated' && (
                                                <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                                    <Loader2 size={12} className="animate-spin"/>
                                                    הפנייה בטיפול, טרם התקבלה תשובה.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
      </div>
    </>
  )
}