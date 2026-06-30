'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { SustainabilityIconBadge } from '@/components/sustainability/SustainabilityIcon'
import { useSustainabilityMotifsSetting } from '@/contexts/SustainabilityMotifsContext'

export default function SustainabilitySettingsPage() {
  const router = useRouter()
  const { enabled: contextEnabled, refresh } = useSustainabilityMotifsSetting()
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/manager/settings/sustainability', { cache: 'no-store' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(payload.error || 'טעינת ההגדרה נכשלה'))
      setEnabled(payload.enabled !== false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'טעינת ההגדרה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading) setEnabled(contextEnabled)
  }, [contextEnabled, loading])

  const handleToggle = async () => {
    const nextEnabled = !enabled
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/manager/settings/sustainability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(payload.error || 'שמירת ההגדרה נכשלה'))
      setEnabled(nextEnabled)
      await refresh()
      setMessage(nextEnabled ? 'תוכן הקיימות הוצג במערכת.' : 'תוכן הקיימות הוסתר מכל המערכת.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שמירת ההגדרה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ManagerHeader title="קיימות ואיכות סביבה" />
      <div className="mx-auto max-w-3xl animate-fadeIn space-y-4 p-4 pb-32 md:p-8">
        <Button variant="outline" onClick={() => router.push('/manager/settings')} className="px-4">
          <ArrowRight size={16} />
          חזרה להגדרות מערכת
        </Button>

        <section className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <SustainabilityIconBadge size={18} className="rounded-2xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-gray-800">הצגת תוכן קיימות במערכת</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                כיבוי ההגדרה מסתיר את כל דגשי הקיימות: בטופס הגשת טיול, ב-hub תכנון, בלו״ז המפורט, ברשימת רכש ובדיאלוג ספקים.
                ההגדרה חלה על כל המשתמשים במערכת.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-gray-800">
                  {enabled ? 'תוכן הקיימות מוצג' : 'תוכן הקיימות מוסתר'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {enabled
                    ? 'הרכזים רואים דגשי קיימות לאורך תהליך התכנון.'
                    : 'לא יוצגו כרטיסים, כפתורים או פריטי קיימות בשום מסך.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggle()}
                disabled={loading || saving}
                className={`inline-flex h-11 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:opacity-60 ${
                  enabled
                    ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                    : 'border border-brand-green bg-brand-green text-white hover:opacity-90'
                }`}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {enabled ? 'הסתר קיימות' : 'הצג קיימות'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              טוען הגדרה...
            </div>
          ) : null}
          {message ? <p className="mt-4 text-sm font-bold text-brand-green">{message}</p> : null}
        </section>
      </div>
    </>
  )
}
