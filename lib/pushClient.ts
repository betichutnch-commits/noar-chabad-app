'use client'

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.warn('[push] SW register failed', e)
    return null
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  if (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength) {
    return u8.buffer as ArrayBuffer
  }
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

export type PushSubscribeJson = {
  endpoint: string
  expirationTime?: number | null
  keys?: { p256dh: string; auth: string }
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, error: 'התראות לא נתמכות בדפדפן זה' }
  }
  if (typeof window !== 'undefined' && (window as unknown as { isSecureContext?: boolean }).isSecureContext === false) {
    return { ok: false, error: 'Push דורש HTTPS (או localhost). פתח/י את המערכת בכתובת מאובטחת.' }
  }

  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/i.test(ua)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  if (isIOS && !isStandalone) {
    return { ok: false, error: 'ב־iPhone/iPad צריך להוסיף למסך הבית כדי לקבל Push (Add to Home Screen).' }
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'לא ניתנה הרשאה להתראות' }
  }

  const reg = await registerServiceWorker()
  if (!reg) return { ok: false, error: 'לא ניתן לרשום Service Worker' }

  const keyRes = await fetch('/api/push/vapid-public-key')
  if (!keyRes.ok) return { ok: false, error: 'חסר מפתח VAPID בשרת' }
  const { publicKey } = (await keyRes.json()) as { publicKey?: string }
  if (!publicKey) return { ok: false, error: 'חסר מפתח VAPID' }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toArrayBuffer(urlBase64ToUint8Array(publicKey)),
  })

  const json = sub.toJSON() as PushSubscribeJson
  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(json),
  })
  if (!save.ok) {
    const err = await save.json().catch(() => ({}))
    return { ok: false, error: (err as { error?: string }).error || 'שמירת המינוי נכשלה' }
  }
  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return { ok: true }
  const json = sub.toJSON() as PushSubscribeJson
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint: json.endpoint }),
  }).catch(() => {})
  await sub.unsubscribe().catch(() => {})
  return { ok: true }
}
