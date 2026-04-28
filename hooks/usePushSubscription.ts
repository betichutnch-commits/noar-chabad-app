'use client'

import { useCallback, useEffect, useState } from 'react'
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '@/lib/pushClient'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

function currentPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  const p = Notification.permission
  if (p === 'granted' || p === 'denied' || p === 'default') return p
  return 'unsupported'
}

export function usePushSubscription(userId?: string) {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setPermission(currentPermission())
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setIsSubscribed(false)
      return
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      setIsSubscribed(Boolean(sub))
    } catch {
      setIsSubscribed(false)
    }
  }, [])

  const ensureSw = useCallback(async () => {
    if (!userId) return
    try {
      await registerServiceWorker()
      await refresh()
    } finally {
      queueMicrotask(() => setLoading(false))
    }
  }, [refresh, userId])

  useEffect(() => {
    void ensureSw()
  }, [ensureSw])

  const subscribe = useCallback(async () => {
    const r = await subscribeToPush()
    await refresh()
    return r
  }, [refresh])

  const unsubscribe = useCallback(async () => {
    const r = await unsubscribeFromPush()
    await refresh()
    return r
  }, [refresh])

  return { permission, isSubscribed, loading, ensureSw, refresh, subscribe, unsubscribe }
}
