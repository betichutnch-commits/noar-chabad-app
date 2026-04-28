'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscribeToPush } from '@/lib/pushClient'
import { Button } from '@/components/ui/Button'

const STORAGE_KEY = 'push_banner_dismissed_v1'

type Props = {
  userId?: string
}

export function PushPermissionBanner({ userId }: Props) {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !('Notification' in window)) {
      setVisible(false)
      return
    }
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setVisible(false)
      return
    }
    if (Notification.permission === 'default') {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [userId])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }, [])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const r = await subscribeToPush()
      if (r.ok) {
        dismiss()
      } else if (r.error) {
        console.warn('[push]', r.error)
      }
    } finally {
      setBusy(false)
    }
  }, [dismiss])

  if (!visible) return null

  return (
    <div className="sticky top-0 z-[85] px-3 pt-3 md:px-6 md:pt-4">
      <div className="max-w-4xl mx-auto rounded-2xl border border-cyan-200 bg-cyan-50/90 backdrop-blur-sm shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-sm font-bold text-cyan-950 text-right leading-snug">
          רוצים לקבל התראות מיידיות על טיולים, פניות ואישורים? הפעילו התראות דפדפן (Push).
        </p>
        <div className="flex gap-2 shrink-0 justify-end">
          <Button type="button" variant="outline" className="text-xs" onClick={dismiss} disabled={busy}>
            לא עכשיו
          </Button>
          <Button type="button" className="text-xs bg-brand-cyan text-white" onClick={() => void enable()} isLoading={busy}>
            להפעיל התראות
          </Button>
        </div>
      </div>
    </div>
  )
}
