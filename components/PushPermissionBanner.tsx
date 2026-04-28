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
  const [error, setError] = useState<string>('')

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
    setError('')
    try {
      const r = await subscribeToPush()
      if (r.ok) {
        dismiss()
      } else if (r.error) {
        setError(r.error)
      }
    } finally {
      setBusy(false)
    }
  }, [dismiss])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-3 md:p-4">
      <div className="max-w-lg mx-auto rounded-3xl border border-cyan-200 bg-white shadow-2xl px-4 py-4">
        <p className="text-sm font-black text-gray-900 text-right leading-snug">
          רוצים לקבל התראות מיידיות על טיולים, פניות ואישורים?
        </p>
        <p className="text-xs font-bold text-gray-600 mt-1 text-right">
          הפעילו התראות דפדפן (Push). ניתן לכבות בכל רגע בפרופיל.
        </p>

        {error && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 text-right">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            onClick={dismiss}
            disabled={busy}
          >
            לא עכשיו
          </Button>
          <Button
            type="button"
            className="text-xs bg-brand-cyan text-white"
            onClick={() => void enable()}
            isLoading={busy}
          >
            להפעיל התראות
          </Button>
        </div>
      </div>
    </div>
  )
}
