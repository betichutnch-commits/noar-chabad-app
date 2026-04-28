'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, Send } from 'lucide-react'
import type { NotificationKind } from '@/lib/notifications/types'

type SubRow = {
  id: string
  endpoint: string
  created_at?: string | null
  last_used_at?: string | null
  user_agent?: string | null
}

type Props = { enabled: boolean }

type TestTarget =
  | 'self'
  | 'safety_admins'
  | 'tech_admins'
  | 'dept_trips_officers'
  | 'all_managers'

const TEST_KIND_OPTIONS: Array<{ value: NotificationKind; label: string }> = [
  { value: 'contact.new', label: 'פנייה חדשה' },
  { value: 'contact.reply', label: 'תשובה לפנייה' },
  { value: 'trip.submitted_dept_review', label: 'טיול הוגש לאישור ראשוני' },
  { value: 'trip.submitted_safety', label: 'טיול הוגש לבטיחות' },
  { value: 'trip.dept_forwarded_safety', label: 'טיול הועבר לבטיחות' },
  { value: 'trip.dept_review_coordinator', label: 'עדכון אישור ראשוני' },
  { value: 'trip.safety_status', label: 'עדכון סטטוס מבטיחות' },
  { value: 'trip.cancelled', label: 'ביטול טיול' },
  { value: 'user.registration_pending', label: 'הרשמה חדשה' },
  { value: 'user.status_changed', label: 'שינוי סטטוס משתמש' },
  { value: 'user.role_changed', label: 'שינוי תפקיד משתמש' },
  { value: 'trip.secondary_staff', label: 'שיבוץ צוות נוסף' },
]

const TARGET_OPTIONS: Array<{ value: TestTarget; label: string }> = [
  { value: 'self', label: 'רק אליי' },
  { value: 'safety_admins', label: 'כל מנהלי בטיחות' },
  { value: 'tech_admins', label: 'כל טכני-אדמין' },
  { value: 'dept_trips_officers', label: 'אחראי/ות טיולי מחלקה שלי' },
  { value: 'all_managers', label: 'כל המנהלים (בטיחות + טכני)' },
]

export function PushAdminTestPanel({ enabled }: Props) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [subs, setSubs] = useState<SubRow[]>([])
  const [lastResult, setLastResult] = useState<string>('')
  const [kind, setKind] = useState<NotificationKind>('contact.new')
  const [target, setTarget] = useState<TestTarget>('self')
  const [title, setTitle] = useState('טסט התראות Push')
  const [message, setMessage] = useState('אם ראית את זה — הפוש עובד.')
  const [url, setUrl] = useState('/manager/profile')

  const count = subs.length

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/push/subscriptions', { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as { subscriptions?: SubRow[] }
      setSubs(json.subscriptions || [])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
  }, [load])

  const sendTest = useCallback(async () => {
    setSending(true)
    setLastResult('')
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, target, title, message, url }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        error?: string
        hint?: string
        totalRecipients?: number
        sentCount?: number
        totalSubscriptions?: number
        firstError?: { statusCode?: number; message?: string; recipientId?: string } | null
      }
      if (!res.ok) {
        setLastResult(json.error || 'שגיאה בשליחת טסט')
        return
      }
      setLastResult(
        json.ok
          ? `נשלח בהצלחה (${json.sentCount || 0}/${json.totalRecipients || 0}), subscriptions: ${json.totalSubscriptions || 0}.`
          : json.hint
            ? `לא נשלח. ${json.hint}${
                json.firstError
                  ? ` [status=${json.firstError.statusCode || 0}] ${json.firstError.message || ''}`
                  : ''
              }`
            : 'לא נשלח (נכשל או אין subscriptions).',
      )
      await load()
    } finally {
      setSending(false)
    }
  }, [kind, target, title, message, url, load])

  const endpointPreview = useMemo(
    () => (s: string) => (s.length > 44 ? `${s.slice(0, 22)}…${s.slice(-18)}` : s),
    [],
  )

  if (!enabled) return null

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black text-amber-900">טסט Push (אדמין)</div>
          <div className="text-xs text-amber-800 mt-1">
            רשימת subscriptions שנשמרו למשתמש הזה + שליחת טסט מותאם.
          </div>
        </div>
        <Button
          type="button"
          className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
          icon={sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          isLoading={sending}
          onClick={() => void sendTest()}
        >
          שלח טסט
        </Button>
      </div>

      {lastResult && <div className="mt-3 text-xs font-bold text-amber-900">{lastResult}</div>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="text-xs font-bold text-amber-900">
          סוג טסט
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NotificationKind)}
            className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-gray-800"
          >
            {TEST_KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-amber-900">
          יעד שליחה
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as TestTarget)}
            className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-gray-800"
          >
            {TARGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <label className="text-xs font-bold text-amber-900">
          כותרת
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-gray-800"
            placeholder="כותרת פוש"
          />
        </label>
        <label className="text-xs font-bold text-amber-900">
          תוכן הודעה
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-gray-800"
            placeholder="תוכן קצר לפוש"
          />
        </label>
        <label className="text-xs font-bold text-amber-900">
          קישור פתיחה (url)
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-gray-800"
            placeholder="/manager/profile"
          />
        </label>
      </div>

      <div className="mt-4 text-xs font-bold text-amber-900">Subscriptions: {count}</div>

      {loading ? (
        <div className="py-6 flex justify-center text-amber-700">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : count === 0 ? (
        <div className="mt-2 text-xs text-amber-800">לא נמצאו subscriptions. הפעל Push כדי שיישמר מינוי.</div>
      ) : (
        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
          {subs.map((s) => (
            <div key={s.id} className="rounded-xl bg-white border border-amber-100 px-3 py-2">
              <div className="text-[11px] font-bold text-gray-800 truncate" title={s.endpoint}>
                {endpointPreview(s.endpoint)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {s.created_at && <span>נוצר: {new Date(s.created_at).toLocaleString('he-IL')}</span>}
                {s.last_used_at && <span>שימוש אחרון: {new Date(s.last_used_at).toLocaleString('he-IL')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
