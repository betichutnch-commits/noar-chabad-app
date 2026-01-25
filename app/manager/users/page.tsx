"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Input } from '@/components/ui/Input'
import { Loader2, Shield, User, MapPin, CheckCircle, XCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'

export default function UsersManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending'); // pending | approved | rejected
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users_management_view').select('*');
    if (data) setUsers(data);
    setLoading(false);
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
      // קריאה לפונקציה שיצרנו ב-SQL
      const { error } = await supabase.rpc('update_user_status', { 
          user_id: userId, 
          new_status: newStatus 
      });
      
      if (error) {
          alert('שגיאה בעדכון: ' + error.message);
      } else {
          // עדכון מקומי כדי שנראה את השינוי מיד
          setUsers(prev => prev.map(u => {
              if (u.id === userId) {
                  const newMeta = { ...u.raw_user_meta_data, status: newStatus };
                  return { ...u, raw_user_meta_data: newMeta };
              }
              return u;
          }));
      }
  };

  const filteredUsers = users.filter(u => {
      const status = u.raw_user_meta_data.status || 'pending'; // ברירת מחדל: ממתין
      return status === filter;
  });

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
      <ManagerHeader title="ניהול משתמשים ורכזים" />
      
      <div className="p-8 animate-fadeIn max-w-7xl mx-auto pb-32">
          
          {/* סרגל סינון */}
          <div className="flex gap-4 mb-8">
              {['pending', 'approved', 'rejected'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all
                    ${filter === f ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                      {f === 'pending' ? 'ממתינים לאישור' : f === 'approved' ? 'משתמשים פעילים' : 'נדחו/נחסמו'}
                      <span className="mr-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                          {users.filter(u => (u.raw_user_meta_data.status || 'pending') === f).length}
                      </span>
                  </button>
              ))}
          </div>

          <div className="space-y-4">
              {filteredUsers.map((u) => {
                  const meta = u.raw_user_meta_data || {};
                  const isExpanded = expandedUser === u.id;
                  const isHQ = meta.branch === 'מטה';

                  return (
                    <div key={u.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                        {/* שורה ראשית */}
                        <div className="p-6 flex items-center gap-6 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 ${isHQ ? 'bg-gray-800' : 'bg-[#00BCD4]'}`}>
                                {meta.full_name?.[0] || <User/>}
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-800">{meta.full_name || 'ללא שם'}</h3>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${isHQ ? 'bg-gray-100 text-gray-700' : 'bg-cyan-50 text-cyan-700'}`}>
                                        {isHQ ? <Shield size={12}/> : <User size={12}/>}
                                        {isHQ ? 'מנהל מטה' : 'רכז סניף'}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                    <MapPin size={14}/> {meta.branch || '-'} • {meta.department || '-'}
                                </div>
                            </div>

                            <button className="text-gray-400">
                                {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                            </button>
                        </div>

                        {/* הרחבה */}
                        {isExpanded && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">תעודת זהות</p>
                                        <p className="font-medium text-gray-800">{meta.id_number || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">טלפון</p>
                                        <p className="font-medium text-gray-800">{meta.phone || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">כתובת למשלוח</p>
                                        <p className="font-medium text-gray-800">{meta.branch_address || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">נתוני הרשמה</p>
                                        <p className="font-medium text-gray-800">נרשם ב: {new Date(u.created_at).toLocaleDateString('he-IL')}</p>
                                    </div>
                                </div>

                                {/* כפתורי פעולה */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    {filter !== 'approved' && (
                                        <button onClick={() => updateUserStatus(u.id, 'approved')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-100 transition-all">
                                            <CheckCircle size={18}/> אשר משתמש
                                        </button>
                                    )}
                                    {filter !== 'rejected' && (
                                        <button onClick={() => updateUserStatus(u.id, 'rejected')} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-bold transition-all">
                                            <XCircle size={18}/> חסום / דחה
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                  )
              })}
              {filteredUsers.length === 0 && <div className="text-center p-10 text-gray-400">לא נמצאו משתמשים בסטטוס זה</div>}
          </div>
      </div>
    </>
  )
}