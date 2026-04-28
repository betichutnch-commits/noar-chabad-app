'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NotificationKind } from '@/lib/notifications/types'
import { Button } from '@/components/ui/Button'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { Loader2 } from 'lucide-react'

const KIND_OPTIONS: { kind: NotificationKind; label: string }[] = [
  { kind: 'trip.submitted_dept_review', label: 'הגשת טיול (אישור ראשוני במחלקה)' },
  { kind: 'trip.submitted_safety', label: 'הגשת טיול למחלקת הבטיחות' },
  { kind: 'trip.dept_forwarded_safety', label: 'העברת טיול לבטיחות' },
  { kind: 'trip.dept_review_coordinator', label: 'עדכון ממחלקה על טיול' },
  { kind: 'trip.safety_status', label: 'החלטת בטיחות על טיול' },
  { kind: 'trip.cancelled', label: 'ביטול טיול' },
  { kind: 'contact.new', label: 'פנייה חדשה למנהלים' },
  { kind: 'contact.reply', label: 'תשובה לפנייתך' },
  { kind: 'user.registration_pending', label: 'הרשמות חדשות (מנהלים)' },
  { kind: 'user.status_changed', label: 'עדכון סטטוס חשבון' },
  { kind: 'user.role_changed', label: 'עדכון תפקיד' },
  { kind: 'trip.secondary_staff', label: 'שיבוץ צוות נוסף לטיול' },
]

type Props = {
  userId?: string
}

export function NotificationPreferencesPanel({ userId }: Props) {
  const { permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe, ensureSw } =
    usePushSubscription(userId)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [perType, setPerType] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!userId) return
    setPrefsLoading(true)
    try {
      const res = await fetch('/api/notification-preferences', { credentials: 'include' })
      if (!res.ok) return
      const data = (await res.json()) as {
        push_enabled: boolean
        email_enabled: boolean
        per_type: Record<string, unknown>
      }
      setPushEnabled(data.push_enabled !== false)
      setEmailEnabled(data.email_enabled !== false)
      const pt: Record<string, boolean> = {}
      for (const { kind } of KIND_OPTIONS) {
        pt[kind] = data.per_type?.[kind] !== false
      }
      setPerType(pt)
    } finally {
      setPrefsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
    void ensureSw()
  }, [load, ensureSw])

  const persist = async (next: {
    push_enabled?: boolean
    email_enabled?: boolean
    per_type?: Record<string, unknown>
  }) => {
    setSaving(true)
    try {
      await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(next),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const toggleKind = async (kind: NotificationKind, enabled: boolean) => {
    const next = { ...perType, [kind]: enabled }
    setPerType(next)
    const per_type = Object.fromEntries(
      KIND_OPTIONS.map(({ kind: k }) => [k, next[k] !== false]),
    )
    await persist({ per_type })
  }

  if (!userId) return null

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 space-y-4 shadow-sm">
      <div>
        <h3 className="text-lg font-black text-text-primary">התראות (Push ואימייל)</h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          ב־iOS התראות Push עובדות בעיקר אחרי הוספת האתר למסך הבית (Add to Home Screen).
        </p>
      </div>

      {pushLoading || prefsLoading ? (
        <div className="flex justify-center py-6 text-brand-cyan">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl bg-surface-muted/60 p-4 border border-border-subtle">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold">התראות דפדפן (Push)</span>
              <span className="text-[11px] text-text-muted">
                {permission === 'unsupported'
                  ? 'לא נתמך'
                  : permission === 'denied'
                    ? 'חסום בדפדפן'
                    : isSubscribed
                      ? 'פעיל'
                      : 'לא מופעל'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {permission !== 'denied' && permission !== 'unsupported' && !isSubscribed && (
                <Button
                  type="button"
                  className="text-xs"
                  onClick={async () => {
                    setPushError('')
                    const r = await subscribe()
                    if (!r.ok && r.error) setPushError(r.error)
                  }}
                >
                  הפעלת Push
                </Button>
              )}
              {isSubscribed && (
                <Button type="button" variant="outline" className="text-xs" onClick={() => void unsubscribe()}>
                  ביטול מינוי Push
                </Button>
              )}
            </div>
            {pushError && (
              <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                {pushError}
              </div>
            )}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium">לא לשלוח Push (רק במערכת)</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-cyan"
                checked={!pushEnabled}
                disabled={saving}
                onChange={(e) => {
                  const v = !e.target.checked
                  setPushEnabled(v)
                  void persist({ push_enabled: v })
                }}
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-border-subtle p-4">
            <span className="text-sm font-bold">פולבק במייל</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-cyan"
              checked={emailEnabled}
              disabled={saving}
              onChange={(e) => {
                const v = e.target.checked
                setEmailEnabled(v)
                void persist({ email_enabled: v })
              }}
            />
          </label>

          <div className="space-y-2">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wide">סוגי התראות</div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {KIND_OPTIONS.map(({ kind, label }) => (
                <label
                  key={kind}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle/80 px-3 py-2 cursor-pointer hover:bg-surface-muted/40"
                >
                  <span className="text-xs font-medium leading-snug text-right">{label}</span>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-brand-cyan shrink-0"
                    checked={perType[kind] !== false}
                    disabled={saving}
                    onChange={(e) => void toggleKind(kind, e.target.checked)}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
