"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { 
  Bell, CheckCircle, AlertTriangle, Info, X, Clock, MailOpen, Trash2 
} from 'lucide-react'

export default function InboxPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  // טעינת הודעות
  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // סימון כנקרא
  const markAsRead = async (id: string) => {
      // אופטימיסטיות UI - מעדכן מיד במסך
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      // עדכון בשרת
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  // מחיקת הודעה
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // שלא יפתח את ההודעה כשלוחצים על מחיקה
      setNotifications(prev => prev.filter(n => n.id !== id));
      await supabase.from('notifications').delete().eq('id', id);
  };

  // אייקון לפי סוג
  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <CheckCircle size={24} className="text-green-500" />;
          case 'warning': return <AlertTriangle size={24} className="text-orange-500" />;
          case 'error': return <X size={24} className="text-red-500" />;
          default: return <Info size={24} className="text-[#00BCD4]" />;
      }
  };

  return (
    <>
      <Header title="הודעות ועדכונים" />

      <div className="max-w-5xl mx-auto p-8 animate-fadeIn pb-32">
        
        {/* כותרת משנה וסטטיסטיקה */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Bell size={24} className="text-gray-400"/>
                דואר נכנס
            </h2>
            <div className="text-sm font-bold text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                {notifications.filter(n => !n.is_read).length} הודעות חדשות
            </div>
        </div>

        {/* רשימת ההודעות */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                    <MailOpen size={64} className="opacity-20 mb-4"/>
                    <p className="font-bold text-lg">אין הודעות חדשות</p>
                    <p className="text-sm">כשיהיו עדכונים על טיולים, הם יופיעו כאן.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {notifications.map((note) => (
                        <div 
                            key={note.id} 
                            onClick={() => markAsRead(note.id)}
                            className={`p-6 flex items-start gap-4 transition-all cursor-pointer hover:bg-gray-50
                            ${note.is_read ? 'opacity-60 bg-white' : 'bg-cyan-50/30'}`}
                        >
                            {/* אייקון */}
                            <div className={`mt-1 p-3 rounded-2xl shrink-0 ${note.is_read ? 'bg-gray-100 grayscale' : 'bg-white shadow-sm border border-gray-100'}`}>
                                {getIcon(note.type)}
                            </div>

                            {/* תוכן */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`text-base ${note.is_read ? 'font-medium text-gray-600' : 'font-black text-gray-800'}`}>
                                        {note.title}
                                    </h3>
                                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                        <Clock size={12}/>
                                        {new Date(note.created_at).toLocaleDateString('he-IL')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                                    {note.message}
                                </p>
                                {note.link && (
                                    <a href={note.link} className="text-xs font-bold text-[#00BCD4] mt-2 inline-block hover:underline">
                                        לחץ למעבר לפרטים
                                    </a>
                                )}
                            </div>

                            {/* כפתור מחיקה */}
                            <button 
                                onClick={(e) => deleteNotification(note.id, e)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="מחק הודעה"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </>
  )
}