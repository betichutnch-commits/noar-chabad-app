"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { 
  Bell, CheckCircle, AlertTriangle, Info, X, MailOpen, Send, 
  ChevronDown, ChevronUp, Loader2, MessageCircle, ImageIcon
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { parseMessageContent, isBugCategory, normalizeMessageStatus, getInboxStatusLabel, parseMessageSubject } from '@/lib/inbox';
import Image from 'next/image';

// רכיב לתצוגת תמונה מאובטחת
const SecureImage = ({ path, onClick }: { path: string; onClick: () => void }) => {
    // אם הנתיב הוא URL מלא (תמיכה לאחור), נשתמש בו כמו שהוא
    const imagePath = path.startsWith('http') ? path : path;
    const signedUrl = useSignedUrl(imagePath);

    if (!signedUrl) return <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs gap-1"><Loader2 size={12} className="animate-spin"/> טוען תמונה...</div>;

    return (
        <button type="button" onClick={onClick} className="cursor-zoom-in">
            <Image src={signedUrl} alt="Screenshot" width={1200} height={800} className="max-h-48 w-auto rounded-lg border border-gray-200 shadow-sm hover:opacity-90 transition-opacity" unoptimized/>
        </button>
    );
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
        day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

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
  const [selectedIncomingId, setSelectedIncomingId] = useState<string | null>(null);
  const [selectedOutgoingId, setSelectedOutgoingId] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]); 
  const [sentMessages, setSentMessages] = useState<SentMessageItem[]>([]);
  const [imageLightbox, setImageLightbox] = useState({
      isOpen: false,
      imagePaths: [] as string[],
      currentIndex: 0,
  });

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

  const handleSelectIncoming = (note: NotificationItem) => {
    setSelectedIncomingId(note.id);
    if (!note.is_read) {
      void markAsRead(note.id);
    }
  };

  const handleSelectOutgoing = (msg: SentMessageItem) => {
    setSelectedOutgoingId(msg.id);
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <CheckCircle size={20} className="text-green-500" />;
          case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
          case 'error': return <X size={20} className="text-red-500" />;
          default: return <Info size={20} className="text-brand-cyan" />;
      }
  };

  const getStatusBadge = (status: string) => {
      const s = normalizeMessageStatus(status);
      const styles: Record<string, string> = {
          new: "bg-blue-50 text-blue-600 border-blue-200",
          treated: "bg-green-50 text-green-600 border-green-200",
          in_progress: "bg-orange-50 text-orange-600 border-orange-200",
          closed: "bg-gray-100 text-gray-600 border-gray-200"
      };
      return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${styles[s] || styles.new}`}>
              {getInboxStatusLabel(s)}
          </span>
      );
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`dashboard_inbox_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setNotifications(data || []));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_messages',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from('contact_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setSentMessages(data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const outgoingImagePaths = sentMessages
    .map((msg) => parseMessageContent(String(msg.message || '')).imagePath)
    .filter((path): path is string => Boolean(path));

  const openOutgoingImage = (imagePath: string) => {
    const imageIndex = outgoingImagePaths.indexOf(imagePath);
    setImageLightbox({
      isOpen: true,
      imagePaths: outgoingImagePaths,
      currentIndex: imageIndex >= 0 ? imageIndex : 0,
    });
  };

  useEffect(() => {
    if (activeTab === 'incoming') {
      if (!selectedIncomingId && notifications.length > 0) {
        setSelectedIncomingId(notifications[0].id || null);
      }
    } else if (!selectedOutgoingId && sentMessages.length > 0) {
      setSelectedOutgoingId(sentMessages[0].id || null);
    }
  }, [activeTab, notifications, sentMessages, selectedIncomingId, selectedOutgoingId]);

  if (userLoading || dataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>;

  const selectedIncoming = notifications.find((n) => n.id === selectedIncomingId) || null;
  const selectedOutgoing = sentMessages.find((m) => m.id === selectedOutgoingId) || null;
  const selectedOutgoingContent = selectedOutgoing
    ? parseMessageContent(String(selectedOutgoing.message || ''))
    : null;

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
      <ImageLightbox
        isOpen={imageLightbox.isOpen}
        imagePaths={imageLightbox.imagePaths}
        currentIndex={imageLightbox.currentIndex}
        onClose={() => setImageLightbox((prev) => ({ ...prev, isOpen: false }))}
        onChangeIndex={(index) => setImageLightbox((prev) => ({ ...prev, currentIndex: index }))}
      />

      <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn pb-32">
        
        <div className="flex bg-surface-muted p-1.5 rounded-2xl w-full md:w-fit mb-6 mx-auto md:mx-0">
            <button 
                onClick={() => { setActiveTab('incoming'); setExpandedId(null); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${activeTab === 'incoming' ? 'bg-surface-card text-brand-cyan shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
                <Bell size={16}/>
                דואר נכנס
                {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="bg-brand-pink text-white text-[10px] px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                        {notifications.filter(n => !n.is_read).length}
                    </span>
                )}
            </button>
            <button 
                onClick={() => { setActiveTab('outgoing'); setExpandedId(null); }}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${activeTab === 'outgoing' ? 'bg-surface-card text-brand-cyan shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
                <Send size={16}/>
                פניות ששלחתי
            </button>
        </div>

        <div className="bg-surface-card rounded-[24px] shadow-sm border border-border-subtle overflow-hidden min-h-[400px]">
            {activeTab === 'incoming' && (
                notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <MailOpen size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-lg">אין הודעות חדשות</p>
                    </div>
                ) : (
                    <>
                      <div className="md:hidden divide-y divide-gray-100">
                        {notifications.map((note) => {
                          const isExpanded = expandedId === note.id;
                          return (
                            <div key={note.id} className={`transition-all hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
                              <button
                                type="button"
                                onClick={() => toggleExpand(note.id, note.is_read)}
                                className={`w-full text-right p-4 flex items-center gap-4 cursor-pointer ${!note.is_read ? 'bg-cyan-50/30' : ''}`}
                                aria-expanded={isExpanded}
                                aria-label={`פתיחת הודעה: ${note.title || 'ללא כותרת'}`}
                              >
                                <div className="shrink-0">{getIcon(note.type || 'info')}</div>
                                <div className="flex-1 min-w-0 grid grid-cols-1 gap-2 items-center">
                                  <div className={`text-sm truncate ${!note.is_read ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{note.title}</div>
                                  <div className="text-xs text-gray-400 flex items-center justify-end gap-2">
                                    <span>{formatDate(note.created_at || '')}</span>
                                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                  </div>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-6 pt-2 pl-12 border-t border-gray-100 animate-fadeIn">
                                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{note.message}</p>
                                  {note.link && (
                                    <div className="mt-4">
                                      <a href={note.link} className="text-xs font-bold text-white bg-brand-cyan px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors">לפרטים נוספים</a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:grid md:grid-cols-3 min-h-[520px]">
                        <div className="col-span-1 border-l border-border-subtle overflow-y-auto">
                          {notifications.map((note) => {
                            const isSelected = selectedIncoming?.id === note.id;
                            return (
                              <button
                                key={note.id}
                                type="button"
                                onClick={() => handleSelectIncoming(note)}
                                className={`w-full text-right p-4 border-b border-border-subtle transition-colors ${isSelected ? 'bg-cyan-50 border-r-4 border-r-brand-cyan' : 'bg-white hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0">{getIcon(note.type || 'info')}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-sm truncate ${!note.is_read ? 'font-black text-gray-900' : 'text-gray-700'}`}>{note.title}</div>
                                    <div className="text-[11px] text-gray-400 mt-1">{formatDate(note.created_at || '')}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="col-span-2 p-6 overflow-y-auto">
                          {selectedIncoming ? (
                            <div className="space-y-4">
                              <h3 className="text-xl font-black text-gray-800">{selectedIncoming.title || 'ללא כותרת'}</h3>
                              <div className="text-xs text-gray-400">{formatDate(selectedIncoming.created_at || '')}</div>
                              <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{selectedIncoming.message}</div>
                              {selectedIncoming.link && (
                                <a href={selectedIncoming.link} className="inline-block text-xs font-bold text-white bg-brand-cyan px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors">
                                  לפרטים נוספים
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-300 font-bold">בחר הודעה להצגה</div>
                          )}
                        </div>
                      </div>
                    </>
                )
            )}

            {activeTab === 'outgoing' && (
                sentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Send size={48} className="opacity-20 mb-4"/>
                        <p className="font-bold text-lg">לא נשלחו פניות עדיין</p>
                    </div>
                ) : (
                    <>
                      <div className="md:hidden divide-y divide-gray-100">
                        {sentMessages.map((msg) => {
                          const isExpanded = expandedId === msg.id;
                          const { cleanSubject } = parseMessageSubject(msg.subject || '');
                          const isBug = isBugCategory({ category: (msg.category as string) || null, subject: String(msg.subject || '') });
                          const content = parseMessageContent(String(msg.message || ''));
                          return (
                            <div key={msg.id} className={`transition-all hover:bg-gray-50 relative overflow-hidden ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}>
                              <button
                                type="button"
                                onClick={() => toggleExpand(msg.id)}
                                className="w-full text-right p-4 flex items-start gap-3 cursor-pointer"
                                aria-expanded={isExpanded}
                              >
                                <div className="shrink-0 w-16">{getStatusBadge(msg.status || 'new')}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-gray-800 truncate">{cleanSubject}</div>
                                  <div className="flex flex-col items-start gap-1 mt-1">
                                    <div className="text-xs text-gray-400">{formatDate(msg.created_at || '')}</div>
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${isBug ? 'text-red-600 bg-red-50' : 'text-cyan-700 bg-cyan-50'}`}>
                                      {isBug ? <AlertTriangle size={12}/> : <Info size={12}/>}
                                    </span>
                                  </div>
                                </div>
                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-6 pt-2 border-t border-gray-100 animate-fadeIn space-y-4">
                                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                                    <div className="text-xs font-bold text-gray-400 mb-1">הודעה שלך:</div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.text}</p>
                                    {content.imagePath && (
                                      <div className="mt-3">
                                        <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10}/> צילום מסך:</div>
                                        <SecureImage path={content.imagePath} onClick={() => openOutgoingImage(content.imagePath!)} />
                                      </div>
                                    )}
                                  </div>
                                  {msg.admin_response && (
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                      <div className="flex items-center gap-2 text-green-800 text-xs font-bold mb-2"><MessageCircle size={14}/> תשובת המערכת:</div>
                                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.admin_response}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:grid md:grid-cols-3 min-h-[520px]">
                        <div className="col-span-1 border-l border-border-subtle overflow-y-auto">
                          {sentMessages.map((msg) => {
                            const { cleanSubject } = parseMessageSubject(msg.subject || '');
                            const isSelected = selectedOutgoing?.id === msg.id;
                            const isBug = isBugCategory({ category: (msg.category as string) || null, subject: String(msg.subject || '') });
                            return (
                              <button
                                key={msg.id}
                                type="button"
                                onClick={() => handleSelectOutgoing(msg)}
                                className={`w-full text-right p-4 border-b border-border-subtle transition-colors ${isSelected ? 'bg-cyan-50 border-r-4 border-r-brand-cyan' : 'bg-white hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-bold text-gray-800 truncate">{cleanSubject}</div>
                                  {getStatusBadge(msg.status || 'new')}
                                </div>
                                <div className="flex flex-col items-start gap-1 mt-1">
                                  <div className="text-[11px] text-gray-400">{formatDate(msg.created_at || '')}</div>
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${isBug ? 'text-red-600 bg-red-50' : 'text-cyan-700 bg-cyan-50'}`}>
                                    {isBug ? <AlertTriangle size={12}/> : <Info size={12}/>}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="col-span-2 p-6 overflow-y-auto">
                          {selectedOutgoing && selectedOutgoingContent ? (
                            <div className="space-y-4">
                              <h3 className="text-xl font-black text-gray-800">{parseMessageSubject(selectedOutgoing.subject || '').cleanSubject}</h3>
                              <div className="text-xs text-gray-400">{formatDate(selectedOutgoing.created_at || '')}</div>
                              <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <div className="text-xs font-bold text-gray-400 mb-1">הודעה שלך:</div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedOutgoingContent.text}</p>
                                {selectedOutgoingContent.imagePath && (
                                  <div className="mt-3">
                                    <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10}/> צילום מסך:</div>
                                    <SecureImage path={selectedOutgoingContent.imagePath} onClick={() => openOutgoingImage(selectedOutgoingContent.imagePath!)} />
                                  </div>
                                )}
                              </div>
                              {selectedOutgoing.admin_response && (
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                  <div className="flex items-center gap-2 text-green-800 text-xs font-bold mb-2"><MessageCircle size={14}/> תשובת המערכת:</div>
                                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedOutgoing.admin_response}</p>
                                </div>
                              )}
                              {!selectedOutgoing.admin_response &&
                                normalizeMessageStatus(String(selectedOutgoing.status || 'new')) !== 'closed' &&
                                normalizeMessageStatus(String(selectedOutgoing.status || 'new')) !== 'treated' && (
                                <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                  <Loader2 size={12} className="animate-spin"/>
                                  הפנייה בטיפול, טרם התקבלה תשובה.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-300 font-bold">בחר פנייה להצגה</div>
                          )}
                        </div>
                      </div>
                    </>
                )
            )}
        </div>
      </div>
    </>
  )
}