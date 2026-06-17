"use client"

import React, { useState, useEffect } from 'react'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import {
  Loader2,
  Shield,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Briefcase,
  ClipboardList,
  Users,
  UserCog,
  X,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isManagerUser, formatUserRoleLabel, getUserRoleShortLabel, getCoordinatorRoleTitle } from '@/lib/auth'
import { fetchManagedUsersAction, type ManagedUser } from './actions'

import { useUser } from '@/hooks/useUser'

type RoleOption = 'coordinator' | 'dept_staff' | 'safety_admin' | 'secretary';

const ROLE_OPTIONS: Array<{ value: RoleOption; label: string; description: string }> = [
  {
    value: 'coordinator',
    label: 'רכז/ת סניף',
    description: 'משתמש שמנהל סניף ומגיש טיולים לאישור.',
  },
  {
    value: 'dept_staff',
    label: 'צוות מטה',
    description: 'חבר מטה במחלקה (ללא הרשאות בטיחות מיוחדות).',
  },
  {
    value: 'safety_admin',
    label: 'מנהל בטיחות',
    description: 'הרשאות ניהול מלאות במערכת הבטיחות.',
  },
  {
    value: 'secretary',
    label: 'מזכ״לית הארגון',
    description: 'הרשאות בטיחות ומפעלים + חתימת כתבי מינוי.',
  },
];

const getRoleIcon = (role?: string | null, canDeptReview?: boolean) => {
  if ((role || '').toLowerCase() === 'dept_staff' && canDeptReview) return ClipboardList;
  switch ((role || '').toLowerCase()) {
    case 'safety_admin':
    case 'admin':
    case 'secretary':
      return ShieldCheck;
    case 'dept_staff':
      return Briefcase;
    case 'coordinator':
      return User;
    default:
      return Users;
  }
};

const getRoleAccent = (role?: string | null, canDeptReview?: boolean) => {
  if ((role || '').toLowerCase() === 'dept_staff' && canDeptReview) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', avatar: 'bg-amber-500' };
  }
  switch ((role || '').toLowerCase()) {
    case 'safety_admin':
    case 'admin':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', avatar: 'bg-emerald-500' };
    case 'secretary':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', avatar: 'bg-indigo-500' };
    case 'dept_staff':
      return { bg: 'bg-gray-100', text: 'text-gray-700', avatar: 'bg-gray-800' };
    case 'coordinator':
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', avatar: 'bg-brand-cyan' };
    default:
      return { bg: 'bg-purple-50', text: 'text-purple-700', avatar: 'bg-purple-500' };
  }
};

function UsersManagementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageParam = Number(searchParams.get('page') || '1');
  const filterParam = String(searchParams.get('filter') || 'pending');
  const roleParam = String(searchParams.get('role') || 'all') as RoleOption | 'all';
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const filter = ['pending', 'approved', 'rejected'].includes(filterParam) ? filterParam : 'pending';
  const roleFilter: RoleOption | 'all' =
    roleParam === 'coordinator' || roleParam === 'dept_staff' || roleParam === 'safety_admin' || roleParam === 'secretary' || roleParam === 'all'
      ? roleParam
      : 'all';
  const perPage = 50;

  const { user, profile, loading: userLoading } = useUser('/');

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoadError, setUsersLoadError] = useState<string>('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [roleModal, setRoleModal] = useState<{
    isOpen: boolean;
    user: ManagedUser | null;
    selectedRole: RoleOption;
    isDeptTripsOfficer: boolean;
    saving: boolean;
  }>({ isOpen: false, user: null, selectedRole: 'coordinator', isDeptTripsOfficer: false, saving: false });

  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string, onConfirm?: () => void) =>
      setModal({ isOpen: true, type, title, message: msg, onConfirm });

  const updateQuery = (next: { page?: number; filter?: string; role?: RoleOption | 'all' }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(next.page ?? page));
    params.set('filter', String(next.filter ?? filter));
    params.set('role', String(next.role ?? roleFilter));
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const fetchUsers = async () => {
        if (!user) return;
        setLoadingUsers(true);
        setUsersLoadError('');

        const isManager = isManagerUser(user, profile);

        if (profile && !isManager) {
             router.push('/dashboard');
             return;
        }
        const result = await fetchManagedUsersAction({ page, perPage });
        if (!result.ok) {
          setUsers([]);
          setTotalUsers(0);
          setTotalPages(1);
          setUsersLoadError(result.error || 'Failed to load users');
          setLoadingUsers(false);
          return;
        }
        setUsers(result.users);
        setTotalUsers(result.total);
        setTotalPages(result.totalPages);
        setLoadingUsers(false);
    };

    if (!userLoading && user) {
        fetchUsers();
    }
  }, [user, userLoading, profile, router, page, perPage]);

  const updateUserStatus = (userId: string, newStatus: string) => {
      showModal('confirm', 'שינוי סטטוס משתמש', `האם אתה בטוח שברצונך לשנות את הסטטוס ל-${newStatus === 'approved' ? 'פעיל' : 'חסום'}?`, async () => {
          const target = users.find(u => u.id === userId);
          const res = await fetch(`/api/users/${encodeURIComponent(userId)}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              new_status: newStatus,
              ...(newStatus === 'approved' && target?.raw_user_meta_data?.role
                ? {
                    sync_role: String(target.raw_user_meta_data.role).toLowerCase(),
                    sync_can_dept_review:
                      target.raw_user_meta_data.can_dept_review === true ||
                      String(target.raw_user_meta_data.can_dept_review || '').toLowerCase() === 'true',
                  }
                : {}),
            }),
          });
          const payload = await res.json().catch(() => ({}));

          if (!res.ok) {
              showModal('error', 'שגיאה', 'שגיאה בעדכון: ' + (payload?.error || res.statusText));
              return;
          }

          setUsers(prev => prev.map(u => {
              if (u.id === userId) {
                  const newMeta = { ...u.raw_user_meta_data, status: newStatus };
                  return { ...u, raw_user_meta_data: newMeta };
              }
              return u;
          }));
          showModal('success', 'עודכן בהצלחה', 'סטטוס המשתמש עודכן.');
      });
  };

  const normalizeRoleForFilter = (role?: string | null): RoleOption | 'unknown' => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'dept_trips_officer') return 'dept_staff';
    if (normalized === 'coordinator' || normalized === 'dept_staff' || normalized === 'safety_admin' || normalized === 'secretary') {
      return normalized as RoleOption;
    }
    return 'unknown';
  };

  const openRoleModal = (target: ManagedUser) => {
    const currentRole = String(target.raw_user_meta_data?.role || 'coordinator').toLowerCase();
    const canDeptReviewMeta =
      target.raw_user_meta_data?.can_dept_review === true ||
      String(target.raw_user_meta_data?.can_dept_review || '').toLowerCase() === 'true';
    const isDeptTripsOfficer = currentRole === 'dept_trips_officer' || canDeptReviewMeta;
    const normalizedRole = currentRole === 'dept_trips_officer' ? 'dept_staff' : currentRole;
    const initial: RoleOption = (ROLE_OPTIONS.find(opt => opt.value === normalizedRole)?.value as RoleOption) || 'coordinator';
    setRoleModal({
      isOpen: true,
      user: target,
      selectedRole: initial,
      isDeptTripsOfficer,
      saving: false,
    });
  };

  const closeRoleModal = () =>
    setRoleModal({
      isOpen: false,
      user: null,
      selectedRole: 'coordinator',
      isDeptTripsOfficer: false,
      saving: false,
    });

  const handleRoleSave = async () => {
    if (!roleModal.user) return;
    setRoleModal(prev => ({ ...prev, saving: true }));
    const roleToSave = roleModal.selectedRole;
    const canDeptReviewToSave =
      roleModal.selectedRole === 'dept_staff' ? roleModal.isDeptTripsOfficer : false;
    const res = await fetch(`/api/users/${encodeURIComponent(roleModal.user.id)}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ new_role: roleToSave, can_dept_review: canDeptReviewToSave }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRoleModal(prev => ({ ...prev, saving: false }));
      showModal('error', 'שגיאה בשינוי תפקיד', payload?.error || res.statusText);
      return;
    }
    setUsers(prev => prev.map(u => {
      if (u.id !== roleModal.user!.id) return u;
      return {
        ...u,
        raw_user_meta_data: {
          ...u.raw_user_meta_data,
          role: roleToSave,
          can_dept_review: canDeptReviewToSave,
        },
      };
    }));
    closeRoleModal();
    showModal('success', 'עודכן', 'התפקיד עודכן בהצלחה.');
  };

  const filteredUsers = users.filter(u => {
      const status = u.raw_user_meta_data.status || 'pending';
      if (String(status) !== filter) return false;
      if (roleFilter === 'all') return true;
      return normalizeRoleForFilter(String(u.raw_user_meta_data.role || '')) === roleFilter;
  });

  const visiblePages = (() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    const adjustedStart = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  })();

  if (userLoading || loadingUsers) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>;

  return (
    <>
      <ManagerHeader title="ניהול משתמשים" />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({...modal, isOpen: false})} type={modal.type} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} />

      {roleModal.isOpen && roleModal.user && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog size={20} />
                <span className="font-bold">שינוי תפקיד והרשאות</span>
              </div>
              <button onClick={closeRoleModal} aria-label="סגור" className="hover:opacity-70"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-800">{String(roleModal.user.raw_user_meta_data?.full_name || '') || roleModal.user.email}</span>
                <span> • {String(roleModal.user.raw_user_meta_data?.department || '') || 'ללא מחלקה'}</span>
              </div>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => {
                  const Icon = getRoleIcon(opt.value);
                  const checked = roleModal.selectedRole === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        checked ? 'border-brand-cyan bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={checked}
                        onChange={() =>
                          setRoleModal(prev => ({
                            ...prev,
                            selectedRole: opt.value,
                            isDeptTripsOfficer: opt.value === 'dept_staff' ? prev.isDeptTripsOfficer : false,
                          }))
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-bold text-gray-800">
                          <Icon size={16} className="text-gray-500"/>
                          {opt.label}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  );
                })}
                {roleModal.selectedRole === 'dept_staff' && (
                  <label className="flex items-start gap-3 p-3 rounded-2xl border border-amber-200 bg-amber-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleModal.isDeptTripsOfficer}
                      onChange={(e) =>
                        setRoleModal(prev => ({ ...prev, isDeptTripsOfficer: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 accent-amber-500"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-amber-800">הרשאת אישור ראשוני מחלקתי</div>
                      <p className="text-xs text-amber-700 mt-0.5">
                        סימון זה יפעיל הרשאת אישור ראשוני ל{getCoordinatorRoleTitle(String(roleModal.user?.raw_user_meta_data?.department || '')).replace(' סניף', '')} עבור משתמש צוות המטה.
                      </p>
                    </div>
                  </label>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-700">
                שים לב: ברוב המקרים התפקיד יתעדכן אוטומטית תוך רגעים. אם המשתמש עדיין לא רואה שינוי, מספיק רענון עמוד.
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <Button variant="ghost" onClick={closeRoleModal}>בטל</Button>
              <Button onClick={handleRoleSave} isLoading={roleModal.saving} icon={<CheckCircle size={16}/>}>שמור תפקיד</Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8 animate-fadeIn max-w-[100vw] overflow-x-hidden pb-32">
          {usersLoadError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              שגיאה בטעינת משתמשים: {usersLoadError}
            </div>
          )}

          <div className="flex gap-2 md:gap-4 mb-4 overflow-x-auto pb-2">
              {['pending', 'approved', 'rejected'].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      updateQuery({ filter: f, page: 1 });
                    }}
                    className={`px-4 md:px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center
                    ${filter === f ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                      {f === 'pending' ? 'ממתינים' : f === 'approved' ? 'פעילים' : 'חסומים'}
                      <span className="mr-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                          {users.filter(u => String(u.raw_user_meta_data.status || 'pending') === f).length}
                      </span>
                  </button>
              ))}
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 text-xs">
              <button
                onClick={() => updateQuery({ role: 'all', page: 1 })}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                  roleFilter === 'all' ? 'bg-brand-cyan text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                כל התפקידים ({users.filter(u => String(u.raw_user_meta_data.status || 'pending') === filter).length})
              </button>
              {ROLE_OPTIONS.map(opt => {
                  const count = users.filter(u =>
                      String(u.raw_user_meta_data.status || 'pending') === filter &&
                      normalizeRoleForFilter(String(u.raw_user_meta_data.role || '')) === opt.value
                  ).length;
                  const Icon = getRoleIcon(opt.value);
                  const active = roleFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        updateQuery({ role: opt.value, page: 1 });
                      }}
                      className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        active ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      <Icon size={12}/>
                      {opt.label}
                      <span className={`px-1.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                    </button>
                  );
              })}
          </div>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 text-sm">
            <div className="text-gray-600">
              עמוד {page} מתוך {totalPages} • סה״כ משתמשים: {totalUsers}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="outline"
                onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                disabled={loadingUsers || page <= 1}
              >
                הקודם
              </Button>
              {visiblePages[0] > 1 && (
                <>
                  <Button variant="outline" onClick={() => updateQuery({ page: 1 })} disabled={loadingUsers}>
                    1
                  </Button>
                  {visiblePages[0] > 2 && <span className="px-1 text-gray-400">...</span>}
                </>
              )}
              {visiblePages.map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'secondary' : 'outline'}
                  onClick={() => updateQuery({ page: p })}
                  disabled={loadingUsers || p === page}
                >
                  {p}
                </Button>
              ))}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <Button variant="outline" onClick={() => updateQuery({ page: totalPages })} disabled={loadingUsers}>
                    {totalPages}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => updateQuery({ page: Math.min(totalPages, page + 1) })}
                disabled={loadingUsers || page >= totalPages}
              >
                הבא
              </Button>
            </div>
          </div>

          <div className="space-y-4">
              {filteredUsers.map((u) => {
                  const meta = u.raw_user_meta_data || {};
                  const isExpanded = expandedUser === u.id;
                  const role = String(meta.role || '').toLowerCase();
                  const canDeptReview =
                    meta.can_dept_review === true ||
                    String(meta.can_dept_review || '').toLowerCase() === 'true' ||
                    role === 'dept_trips_officer';
                  const normalizedRole = role === 'dept_trips_officer' ? 'dept_staff' : role;
                  const RoleIcon = getRoleIcon(normalizedRole, canDeptReview);
                  const accent = getRoleAccent(normalizedRole, canDeptReview);
                  const branchName = String(meta.branch_name || meta.branch || '');
                  const roleLabel = getUserRoleShortLabel(
                      canDeptReview && normalizedRole === 'dept_staff' ? 'dept_trips_officer' : normalizedRole,
                      String(meta.department || ''),
                  );
                  const fullRoleLabel = formatUserRoleLabel({
                      role: canDeptReview && normalizedRole === 'dept_staff' ? 'dept_trips_officer' : normalizedRole,
                      department: String(meta.department || ''),
                      branchName,
                  });

                  return (
                    <div key={u.id} className="bg-surface-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden transition-all">
                        <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer hover:bg-gray-50 relative" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 ${accent.avatar}`}>
                                    {String(meta.full_name || '')[0] || <User/>}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800">{String(meta.full_name || '') || 'ללא שם'}</h3>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                                <div className="md:hidden text-gray-400">
                                    {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 w-full md:w-auto pl-8 md:pl-0">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit ${accent.bg} ${accent.text}`}>
                                        <RoleIcon size={12}/>
                                        {roleLabel}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-600 flex items-center gap-1 col-span-2 md:col-span-1">
                                    <MapPin size={14}/> {branchName || String(meta.department || '') || '-'}
                                </div>
                            </div>

                            <button className="hidden md:block text-gray-400 ml-auto">
                                {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                            </button>
                        </div>

                        {isExpanded && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">תפקיד מלא</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100 flex items-center gap-2">
                                            <Shield size={14} className="text-gray-400"/>
                                            {fullRoleLabel}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">תעודת זהות</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100">{String(meta.id_number || meta.identity_number || '') || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">טלפון</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100">{String(meta.phone || '') || '-'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400">מחלקה</p>
                                        <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100">{String(meta.department || '') || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                                    <Button variant="outline" onClick={() => openRoleModal(u)} icon={<UserCog size={18}/>} className="h-10 text-sm">
                                        שנה תפקיד/הרשאה
                                    </Button>
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
                                {filter === 'pending' && (
                                    <p className="mt-3 text-[11px] text-gray-400 text-left">
                                        בעת אישור, תפקיד המשתמש יסונכרן אוטומטית בטבלת ה־profiles.
                                    </p>
                                )}
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

export default function UsersManagement() {
  return (
    <React.Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-cyan" size={40} />
        </div>
      }
    >
      <UsersManagementContent />
    </React.Suspense>
  );
}
