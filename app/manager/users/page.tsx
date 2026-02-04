"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Loader2, Shield, User, MapPin, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

// ייבוא Hook
import { useUser } from '@/hooks/useUser'

export default function UsersManagement() {
  const router = useRouter();
  
  // 1. שימוש ב-Hook
  const { user, profile, loading: userLoading } = useUser('/');

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // מודל גלובלי
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string, onConfirm?: () => void) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm });

  // 2. טעינת נתונים ובדיקת הרשאות
  useEffect(() => {
    const fetchUsers = async () => {
        if (!user) return;

        // בדיקת הרשאות (רק למנהלים מורשים)
        // אפשר להוסיף כאן לוגיקה יותר מחמירה אם צריך
        const isManager = profile?.role === 'admin' || profile?.role === 'safety_admin' || user.user_metadata?.department === 'בטיחות ומפעלים';
        
        if (profile && !isManager) {
             router.push('/dashboard');
             return;
        }

        const { data } = await supabase.from('users_management_view').select('*');
        if (data) setUsers(data);
        setLoadingUsers(false);
    };

    if (!userLoading && user) {
        fetchUsers();
    }
  }, [user, userLoading, profile, router]);

  const updateUserStatus = (userId: string, newStatus: string) => {
      showModal('confirm', 'שינוי סטטוס משתמש', `האם אתה בטוח שברצונך לשנות את הסטטוס ל-${newStatus === 'approved' ? 'פעיל' : 'חסום'}?`, async () => {
          const { error } = await supabase.rpc('update_user_status', { 
              user_id: userId, 
              new_status: newStatus 
          });
          
          if (error) {
              showModal('error', 'שגיאה', 'שגיאה בעדכון: ' + error.message);
          } else {
              setUsers(prev => prev.map(u => {
                  if (u.id === userId) {
                      const newMeta = { ...u.raw_user_meta_data, status: newStatus };
                      return { ...u, raw_user_meta_data: newMeta };
                  }
                  return u;
              }));
              showModal('success', 'עודכן בהצלחה', 'סטטוס המשתמש עודכן.');
          }
      });
  };

  const filteredUsers = users.filter(u => {
      const status = u.raw_user_meta_data.status || 'pending';
      return status === filter;
  });

  // בדיקת טעינה משולבת
  if (userLoading || loadingUsers) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00BCD4]" size={40}/></div>;

  return (
    <>
      <ManagerHeader title="ניהול משתמשים ורכזים" />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} />
      
      <div className="p-4 md:p-8 animate-fadeIn max-w-[100vw] overflow-x-hidden pb-32">
          
          {/* סרגל סינון */}
          <div className="flex gap-2 md:gap-4 mb-8 overflow-x-auto pb-2">
              {['pending', 'approved', 'rejected'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setFilter(f)}
                    className={`px-4 md:px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center
                    ${filter === f ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                      {f === 'pending' ? 'ממתינים' : f === 'approved' ? 'פעילים' : 'חסומים'}
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
                        <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer hover:bg-gray-50 relative" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                            
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 ${isHQ ? 'bg-gray-800' : 'bg-[#00BCD4]'}`}>
                                    {meta.full_name?.[0] || <User/>}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800">{meta.full_name || 'ללא שם'}</h3>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                                <div className="md:hidden text-gray-400">
                                    {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                                </div>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 w-full md:w-auto pl-8 md:pl-0">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit ${isHQ ? 'bg-gray-100 text-gray-700' : 'bg-cyan-50 text-cyan-700'}`}>
                                        {isHQ ? <Shield size={12}/> : <User size={12}/>}
                                        {isHQ ? 'מנהל מטה' : 'רכז סניף'}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-600 flex items-center gap-1 col-span-2 md:col-span-1">
                                    <MapPin size={14}/> {meta.branch || '-'} • {meta.department || '-'}
                                </div>
                            </div>

                            <button className="hidden md:block text-gray-400 ml-auto">
                                {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                            </button>
                        </div>

                        {/* הרחבה */}
                        {isExpanded && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">תעודת זהות</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100">{meta.id_number || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">טלפון</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100">{meta.phone || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                                    {filter !== 'approved' && (
                                        <Button variant="secondary" onClick={() => updateUserStatus(u.id, 'approved')} icon={<CheckCircle size={18}/>} className="h-10 text-sm">
                                            אשר משתמש
                                        </Button>
                                    )}
                                    {filter !== 'rejected' && (
                                        <Button variant="outline" onClick={() => updateUserStatus(u.id, 'rejected')} icon={<XCircle size={18}/>} className="h-10 text-sm border-red-200 text-red-600 hover:bg-red-50">
                                            חסום / דחה
                                        </Button>
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