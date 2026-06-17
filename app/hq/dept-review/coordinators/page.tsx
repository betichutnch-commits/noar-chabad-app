"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Header } from '@/components/layout/Header'
import { Input } from '@/components/ui/Input'
import {
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  IdCard,
  CheckCircle2,
  Clock,
  XCircle,
  User as UserIcon,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { getCoordinatorsPluralTitle, isDeptReviewOfficer } from '@/lib/auth'

type CoordinatorRow = {
  id: string
  email: string
  raw_user_meta_data: Record<string, string>
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'פעיל', bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: CheckCircle2 },
  pending: { label: 'ממתין לאישור', bg: 'bg-amber-50', text: 'text-amber-700', Icon: Clock },
  rejected: { label: 'חסום', bg: 'bg-red-50', text: 'text-red-700', Icon: XCircle },
}

export default function DeptCoordinatorsListPage() {
  const { user, profile, loading: userLoading } = useUser('/')
  const [users, setUsers] = useState<CoordinatorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const department = profile?.department || ''

  useEffect(() => {
    if (userLoading) return
    if (!user) return

    const isOfficer = isDeptReviewOfficer(user, profile)
    if (!isOfficer) {
      window.location.href = '/dashboard'
      return
    }

    let cancelled = false

    if (!department) {
      const timer = setTimeout(() => {
        if (!cancelled) setLoading(false)
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(timer)
      }
    }

    const fetchCoordinators = async () => {
      const { data } = await supabase
        .from('users_management_view')
        .select('id, email, raw_user_meta_data')

      if (cancelled) return

      const rows = (data || []) as CoordinatorRow[]
      const filtered = rows.filter(row => {
        const meta = row.raw_user_meta_data || {}
        const role = (meta.role || '').toLowerCase()
        return role === 'coordinator' && (meta.department || '') === department
      })
      setUsers(filtered)
      setLoading(false)
    }

    fetchCoordinators()

    const channel = supabase
      .channel(`dept_coordinators_${department}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCoordinators())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [department, user, profile, userLoading])

  const filteredUsers = useMemo(() => {
    const q = search.trim()
    if (!q) return users
    return users.filter(row => {
      const meta = row.raw_user_meta_data || {}
      const haystack = [
        meta.full_name,
        meta.branch_name || meta.branch,
        meta.phone,
        row.email,
        meta.id_number || meta.identity_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q.toLowerCase())
    })
  }, [users, search])

  const counts = useMemo(() => {
    const total = users.length
    const approved = users.filter(u => (u.raw_user_meta_data?.status || 'pending') === 'approved').length
    const pending = users.filter(u => (u.raw_user_meta_data?.status || 'pending') === 'pending').length
    return { total, approved, pending }
  }, [users])

  if (userLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-cyan" size={40} />
      </div>
    )
  }

  return (
    <>
      <Header title={`${getCoordinatorsPluralTitle(department)} המחלקה${department ? ` • ${department}` : ''}`} />
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32 animate-fadeIn">
        {!department ? (
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 text-amber-700 text-sm">
            המחלקה שלך לא מוגדרת בפרופיל. פנה למנהל הבטיחות.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-gray-800">{counts.total}</div>
                  <div className="text-xs text-gray-500">סך הכל {getCoordinatorsPluralTitle(department)}</div>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-emerald-700">{counts.approved}</div>
                  <div className="text-xs text-emerald-700">פעילים</div>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-amber-700">{counts.pending}</div>
                  <div className="text-xs text-amber-700">ממתינים</div>
                </div>
              </div>
              <div className="md:w-72">
                <Input
                  placeholder="חיפוש לפי שם / סניף / טלפון..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
            </div>

            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 text-xs text-cyan-700 mb-6">
              תצוגה זו היא לצפייה בלבד. כדי לאשר משתמשים חדשים או לחסום משתמש קיים, פנה למנהל הבטיחות.
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-gray-400 py-12 bg-white rounded-3xl border border-gray-100">
                  לא נמצאו {getCoordinatorsPluralTitle(department)} במחלקה.
                </div>
              ) : (
                filteredUsers.map(row => {
                  const meta = row.raw_user_meta_data || {}
                  const status = (meta.status || 'pending').toLowerCase()
                  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
                  const Icon = config.Icon
                  const branchName = meta.branch_name || meta.branch || ''
                  const isExpanded = expanded === row.id
                  return (
                    <div
                      key={row.id}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : row.id)}
                        className="w-full p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-right hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 md:flex-1">
                          <div className="w-11 h-11 rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center font-bold text-lg shrink-0">
                            {meta.full_name?.[0] || <UserIcon size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 truncate">{meta.full_name || 'ללא שם'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <MapPin size={12} /> {branchName || 'ללא סניף'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${config.bg} ${config.text}`}>
                            <Icon size={12} /> {config.label}
                          </span>
                          {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/40 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <DetailRow icon={<Mail size={14} />} label="אימייל" value={meta.contact_email || row.email || '-'} />
                          <DetailRow icon={<Phone size={14} />} label="טלפון" value={meta.phone || '-'} />
                          <DetailRow icon={<IdCard size={14} />} label="ת״ז" value={meta.id_number || meta.identity_number || '-'} />
                          <DetailRow icon={<MapPin size={14} />} label="סניף" value={branchName || '-'} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2">
    <span className="text-gray-400">{icon}</span>
    <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
    <span className="font-medium text-gray-800 truncate" data-tooltip={value}>
      {value}
    </span>
  </div>
)
