'use client'

import { useCallback, useEffect, useState } from 'react'
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '@/lib/pushClient'

export function usePushSubscription(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      setIsSubscribed(false)
      setLoading(false)
      return
    }
    setPermission(Notification.permission)
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    setIsSubscribed(Boolean(sub))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => void refresh())
  }, [userId, refresh])

  const subscribe = useCallback(async () => {
    const r = await subscribeToPush()
    await refresh()
    return r
  }, [refresh])

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush()
    await refresh()
  }, [refresh])

  const ensureSw = useCallback(async () => {
    await registerServiceWorker()
    await refresh()
  }, [refresh])

  return { permission, isSubscribed, loading, subscribe, unsubscribe, ensureSw, refresh }
}
