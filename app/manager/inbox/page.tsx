"use client"

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ManagerHeader } from '@/components/layout/ManagerHeader';
import { Modal } from '@/components/ui/Modal';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { 
  Mail, CheckCircle, Search, AlertTriangle, 
  User, Loader2, MessageCircle, ImageIcon, Send
} from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl'; // Import חובה
import { parseMessageContent, isOpenMessageStatus, normalizeMessageStatus, parseMessageSubject } from '@/lib/inbox';
import { getUserRoleShortLabel } from '@/lib/auth';
import { DEPARTMENTS_CONFIG } from '@/lib/constants';
import Image from 'next/image';

// --- רכיב עזר לתמונה מאובטחת ---
const SecureImage = ({ path, onClick }: { path: string; onClick: () => void }) => {
    // אם נשמר URL מלא (תמיכה לאחור)
    const imagePath = path.startsWith('http') ? path : path;
    const signedUrl = useSignedUrl(imagePath);

    if (!signedUrl) return <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs gap-1"><Loader2 size={12} className="animate-spin"/> טוען תמונה...</div>;

    return (
        <button type="button" onClick={onClick} className="cursor-zoom-in">
            <Image src={signedUrl} alt="Screenshot" width={1200} height={800} className="max-h-40 w-auto rounded-lg border border-gray-200 hover:opacity-90 transition-opacity" unoptimized/>
        </button>
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
    nickname?: string;
    phone: string;
    avatar_url: string;
    email?: string;
    role?: string;
    department?: string;
  };
  displayRole?: string;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'treated'>('new');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'info' | 'confirm',
    title: '',
    message: '',
  });
  const [imageLightbox, setImageLightbox] = useState({
    isOpen: false,
    imagePaths: [] as string[],
    currentIndex: 0,
  });

  // ... fetchMessages, useEffect, handleSendReply, markAsTreated (כמו בקוד ששלחת, ללא שינוי)
  // אני מעתיק אותם כאן כדי שיהיה קובץ מלא

  const normalizeDepartmentKey = (department?: string) =>
    String(department || '')
      .trim()
      .replace(/״/g, '"')
      .replace(/\s+/g, ' ');

  const getDepartmentPillClass = (department?: string) => {
    const key = normalizeDepartmentKey(department);
    const base = 'text-[11px] font-bold whitespace-nowrap';
    if (!key) return `${base} text-gray-500`;
    const config = DEPARTMENTS_CONFIG[key];
    if (!config) return `${base} text-gray-600`;
    const textClass = config.color
      .split(' ')
      .find((cls) => cls.startsWith('text-'));
    return textClass ? `${base} ${textClass}` : `${base} text-gray-600`;
  };

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
            const s = normalizeMessageStatus(msg.status || 'new');
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
            .select('id, full_name, nickname, phone, avatar_url, email, role, department')
            .in('id', userIds);

        const { data: usersMeta } = await supabase
            .from('users_management_view')
            .select('id, raw_user_meta_data')
            .in('id', userIds);

        const displayNameById = new Map<string, string>();
        for (const row of usersMeta || []) {
          const meta = (row.raw_user_meta_data || {}) as Record<string, unknown>;
          const nickname = String(meta.nickname || meta.nick_name || '').trim();
          const fullName = String(meta.full_name || meta.name || meta.official_name || '').trim();
          if (nickname) {
            displayNameById.set(String(row.id), nickname);
          } else if (fullName) {
            displayNameById.set(String(row.id), fullName);
          }
        }

        const combined = filteredMsgs.map(msg => {
            const userProfile = profiles?.find(p => p.id === msg.user_id);
            const roleLabel = getUserRoleShortLabel(userProfile?.role, userProfile?.department);
            const displayName =
              displayNameById.get(String(msg.user_id)) ||
              String(userProfile?.nickname || '').trim() ||
              String(userProfile?.full_name || '').trim() ||
              'משתמש לא נמצא';
            return {
                ...msg,
                profiles: {
                  ...(userProfile || { phone: '', avatar_url: '', role: 'user', department: '-' }),
                  full_name: displayName,
                },
                displayRole: roleLabel,
            };
        });

        setMessages(combined as Message[]);
        
        setSelectedMsg((prev) => {
          if (!prev) return prev;
          const exists = combined.find((m) => m.id === prev.id) as Message | undefined;
          return exists || null;
        });

    } catch (error) {
        console.error("Error fetching inbox:", error);
    } finally {
        setLoading(false);
    }
  }, [filter]);

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
          const res = await fetch(`/api/contact-messages/${selectedMsg.id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: responseText }),
          });
          const payload = await res.json();
          if (!res.ok) {
            throw new Error(payload?.error || 'שגיאה בשליחת התשובה');
          }

          setResponseText("");
          
          if (filter === 'new') {
              setMessages(prev => prev.filter(m => m.id !== selectedMsg.id));
              setSelectedMsg(null);
          } else {
              await fetchMessages();
          }
          
      } catch (err) {
          console.error("Error sending reply:", err);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'שגיאה בשליחת התשובה',
            message: 'לא ניתן היה לשמור את התשובה כרגע. נסה/י שוב בעוד רגע.',
          });
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
      setModal({
        isOpen: true,
        type: 'error',
        title: 'שגיאה בעדכון סטטוס',
        message: 'לא ניתן היה לעדכן את סטטוס הפנייה כרגע.',
      });
    }
  };

  const content = selectedMsg ? parseMessageContent(selectedMsg.message) : null;
  const selectedParsedSubject = selectedMsg ? parseMessageSubject(selectedMsg.subject || '') : null;
  const messageImagePaths = messages
    .map((msg) => parseMessageContent(String(msg.message || '')).imagePath)
    .filter((path): path is string => Boolean(path));

  const openMessageImage = (imagePath: string) => {
    const imageIndex = messageImagePaths.indexOf(imagePath);
    setImageLightbox({
      isOpen: true,
      imagePaths: messageImagePaths,
      currentIndex: imageIndex >= 0 ? imageIndex : 0,
    });
  };

  return (
    <div className="min-h-screen bg-surface-base pb-12">
      <ManagerHeader title="דואר נכנס ופניות" />
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />
      <ImageLightbox
        isOpen={imageLightbox.isOpen}
        imagePaths={imageLightbox.imagePaths}
        currentIndex={imageLightbox.currentIndex}
        onClose={() => setImageLightbox((prev) => ({ ...prev, isOpen: false }))}
        onChangeIndex={(index) => setImageLightbox((prev) => ({ ...prev, currentIndex: index }))}
      />

      <main className="max-w-6xl mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* טאבים */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="bg-surface-card p-1 rounded-2xl border border-border-subtle shadow-sm flex items-center w-full md:w-auto">
                <button 
                  onClick={() => { setFilter('new'); setSelectedMsg(null); setMobileExpandedId(null); setResponseText(''); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'new' ? 'bg-brand-pink text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Mail size={16}/> ממתינים לטיפול
                </button>
                <button 
                  onClick={() => { setFilter('treated'); setSelectedMsg(null); setMobileExpandedId(null); setResponseText(''); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'treated' ? 'bg-brand-cyan text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CheckCircle size={16}/> ארכיון וטופלו
                </button>
            </div>
            <div className="text-sm text-text-muted font-medium">
                מציג <span className="font-bold text-text-primary">{messages.length}</span> פניות
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* רשימה */}
            <div className="lg:col-span-1 bg-surface-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden flex flex-col min-h-[72vh]">
                <div className="p-4 border-b border-border-subtle bg-surface-muted flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider">
                    <Search size={14}/> רשימת פניות
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="animate-spin text-brand-cyan mx-auto"/></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center p-6">
                            <CheckCircle size={32} className="text-gray-200 mb-2"/>
                            <p className="text-sm font-bold">התיבה ריקה</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isSelected = selectedMsg?.id === msg.id;
                            const parsedSubject = parseMessageSubject(msg.subject || '');
                            
                            return (
                              <React.Fragment key={msg.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMsg(msg);
                                      setMobileExpandedId(prev => (prev === msg.id ? null : msg.id));
                                    }}
                                    className={`w-full p-4 text-right border-b border-border-subtle transition-colors flex flex-col gap-2
                                    ${isSelected ? 'bg-cyan-50 border-r-4 border-r-brand-cyan' : 'bg-surface-card hover:bg-surface-muted/60'}`}
                                    aria-label={`פתיחת פנייה ${parsedSubject.cleanSubject}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="relative w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                                              {msg.profiles?.avatar_url ? (
                                                <Image
                                                  src={msg.profiles.avatar_url}
                                                  alt={msg.profiles?.full_name || 'תמונת פרופיל'}
                                                  fill
                                                  className="object-cover"
                                                  unoptimized
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-gray-500">
                                                  {(msg.profiles?.full_name || 'מ')?.[0]}
                                                </div>
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold text-gray-800 leading-tight truncate whitespace-nowrap overflow-hidden">
                                                    <span className="inline">{msg.profiles?.full_name || 'לא ידוע'}</span>
                                                    {msg.profiles?.department && (
                                                      <>
                                                        <span className="text-gray-300 mx-1">•</span>
                                                        <span className={`${getDepartmentPillClass(msg.profiles.department)} inline`}>{msg.profiles.department}</span>
                                                      </>
                                                    )}
                                                    <span className="text-gray-300 mx-1">•</span>
                                                    <span className="font-medium text-gray-600 text-xs inline">{msg.displayRole || 'משתמש'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                              {new Date(msg.created_at).toLocaleDateString('he-IL')}
                                          </span>
                                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${parsedSubject.type === 'bug' ? 'text-red-600 bg-red-50' : 'text-cyan-700 bg-cyan-50'}`}>
                                            {parsedSubject.type === 'bug' ? <AlertTriangle size={12}/> : <Mail size={12}/>}
                                          </span>
                                        </div>
                                    </div>

                                    <div className="mr-9 flex items-center gap-2 min-w-0">
                                      <h4 className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-brand-cyan' : 'text-gray-600'}`}>
                                          {parsedSubject.cleanSubject}
                                      </h4>
                                    </div>
                                </button>
                                {mobileExpandedId === msg.id && (
                                  <div className="lg:hidden p-4 border-b border-border-subtle bg-white space-y-3">
                                    {(() => {
                                      const mobileContent = parseMessageContent(String(msg.message || ''));
                                      return (
                                        <>
                                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="text-xs font-bold text-gray-400 mb-1 flex justify-between gap-4">
                                              <span className="truncate">
                                                {msg.profiles?.full_name || 'לא ידוע'}
                                                {msg.profiles?.department && (
                                                  <>
                                                    <span className="mx-1 text-gray-300">•</span>
                                                    <span className={getDepartmentPillClass(msg.profiles.department)}>{msg.profiles.department}</span>
                                                  </>
                                                )}
                                                <span className="mx-1 text-gray-300">•</span>
                                                <span className="font-medium text-gray-500">{msg.displayRole || 'משתמש'}</span>
                                              </span>
                                              <span>{new Date(msg.created_at).toLocaleString('he-IL')}</span>
                                            </div>
                                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                              {mobileContent.text}
                                            </div>
                                            {mobileContent.imagePath && (
                                              <div className="mt-3">
                                                <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                                                  <ImageIcon size={10}/> צילום מסך:
                                                </div>
                                                <SecureImage path={mobileContent.imagePath} onClick={() => openMessageImage(mobileContent.imagePath!)} />
                                              </div>
                                            )}
                                          </div>
                                          {msg.admin_response && (
                                            <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100">
                                              <div className="text-xs font-bold text-cyan-700 mb-1">תשובת מנהל</div>
                                              <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.admin_response}</div>
                                            </div>
                                          )}
                                          {!msg.admin_response && (
                                            <div className="space-y-2">
                                              {filter === 'new' && (
                                                <button
                                                  onClick={() => markAsTreated(msg.id)}
                                                  className="w-full bg-green-50 text-green-700 border border-green-200 rounded-xl py-2 text-xs font-bold"
                                                >
                                                  סמן כטופל
                                                </button>
                                              )}
                                              <textarea
                                                value={isSelected ? responseText : ''}
                                                onChange={(e) => {
                                                  setSelectedMsg(msg);
                                                  setResponseText(e.target.value);
                                                }}
                                                placeholder="כתוב כאן את התשובה..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-none h-24"
                                              />
                                              <button
                                                onClick={handleSendReply}
                                                disabled={sendingReply || !isSelected || !responseText.trim()}
                                                className="w-full bg-brand-cyan text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                                              >
                                                {sendingReply && isSelected ? 'שולח...' : 'שלח תשובה'}
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                        })
                    )}
                </div>
            </div>

            {/* תצוגה ראשית */}
            <div className="hidden lg:flex lg:col-span-2 bg-surface-card rounded-3xl border border-border-subtle shadow-lg flex-col relative overflow-hidden h-full">
                {selectedMsg && content ? (
                    <>
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start shrink-0">
                            <div className="flex gap-4">
                                <div className="relative w-12 h-12 rounded-2xl bg-gray-200 overflow-hidden border border-white shadow-sm shrink-0">
                                    {selectedMsg.profiles?.avatar_url ? (
                                        <Image src={selectedMsg.profiles.avatar_url} alt="Avatar" fill className="object-cover" unoptimized/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{selectedMsg.profiles?.full_name?.[0]}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h2 className="text-xl font-black text-gray-800 leading-tight">{selectedParsedSubject?.cleanSubject}</h2>
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${selectedParsedSubject?.type === 'bug' ? 'text-red-600 bg-red-50' : 'text-cyan-700 bg-cyan-50'}`}>
                                        {selectedParsedSubject?.type === 'bug' ? <AlertTriangle size={14}/> : <Mail size={14}/>}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100 font-bold text-gray-700">
                                            <User size={12}/> {selectedMsg.profiles?.full_name || 'לא ידוע'}
                                            <span className="text-gray-300 mx-1">•</span>
                                            <span className={getDepartmentPillClass(selectedMsg.profiles?.department || 'כללי')}>
                                              {selectedMsg.profiles?.department || 'כללי'}
                                            </span>
                                            <span className="text-gray-300 mx-1">•</span>
                                            <span className="font-medium text-gray-600">{selectedMsg.displayRole || 'ללא תפקיד'}</span>
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

                        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar p-6 flex flex-col gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 w-full">
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
                                        <SecureImage path={content.imagePath} onClick={() => openMessageImage(content.imagePath!)} />
                                    </div>
                                )}
                            </div>

                            {selectedMsg.admin_response && (
                                <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100 w-full animate-fadeIn">
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
                                    <label className="text-xs font-bold text-gray-500">
                                      שלח תשובה ל{getUserRoleShortLabel('coordinator', selectedMsg?.profiles?.department || '').replace(' סניף', '')} (תישלח התראה לנייד שלהם):
                                    </label>
                                    <div className="flex gap-2">
                                        <textarea 
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder="כתוב כאן את התשובה... (לחיצה על שלח תעביר את ההודעה לארכיון)"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-none h-20"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={handleSendReply}
                                                disabled={sendingReply || !responseText.trim()}
                                                className="h-full px-6 bg-brand-cyan text-white rounded-xl font-bold text-sm hover:bg-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                            >
                                                {sendingReply ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                <span>שלח</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-start gap-3 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                                        <a href={`mailto:${selectedMsg.profiles?.email || ''}`} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800"><Mail size={12}/> שלח במייל</a>
                                        {selectedMsg.profiles?.phone && (
                                            <a href={`https://wa.me/${selectedMsg.profiles.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700"><MessageCircle size={12}/> שלח בווצאפ</a>
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