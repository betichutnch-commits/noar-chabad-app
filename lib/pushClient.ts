function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function toArrayBuffer(v: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(v.byteLength)
  out.set(v)
  return out.buffer
}

function getPushUnsupportedError(): string | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'התראות לא נתמכות בדפדפן זה'
  }
  if (window.isSecureContext === false) {
    return 'Push דורש HTTPS (או localhost). פתח/י את המערכת בכתובת מאובטחת.'
  }

  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/i.test(ua)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  if (isIOS && !isStandalone) {
    return 'ב־iPhone/iPad צריך להוסיף למסך הבית כדי לקבל Push (Add to Home Screen).'
  }
  return null
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  const unsupported = getPushUnsupportedError()
  if (unsupported) return { ok: false, error: unsupported }

  const reg = await registerServiceWorker()
  if (!reg || !reg.pushManager) return { ok: false, error: 'Push Manager לא זמין' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'לא ניתנה הרשאה להתראות' }
  }

  const keyRes = await fetch('/api/push/vapid-public-key', { credentials: 'include' })
  const keyJson = (await keyRes.json().catch(() => ({}))) as { publicKey?: string; error?: string }
  const publicKey = String(keyJson.publicKey || '').trim()
  if (!keyRes.ok || !publicKey) {
    return { ok: false, error: keyJson.error || 'מפתח VAPID ציבורי חסר' }
  }

  const serverKey = urlBase64ToUint8Array(publicKey)
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toArrayBuffer(serverKey),
  })

  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(sub),
  })

  if (!save.ok) {
    const data = (await save.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: data.error || 'שמירת המינוי נכשלה' }
  }

  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, error: 'Service Worker לא נתמך' }
  }

  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await reg?.pushManager.getSubscription()
  const endpoint = sub?.endpoint
  if (sub) await sub.unsubscribe()

  const res = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: data.error || 'ביטול המינוי נכשל' }
  }

  return { ok: true }
}
