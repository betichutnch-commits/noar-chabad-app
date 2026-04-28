/* global self */
self.addEventListener('push', (event) => {
  let payload = { title: 'התראה', body: '', url: '/' }
  try {
    if (event.data) {
      const parsed = event.data.json()
      payload = { ...payload, ...parsed }
    }
  } catch {
    try {
      const t = event.data?.text?.()
      if (t) payload.body = t
    } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: payload.url || '/' },
      lang: 'he',
      dir: 'rtl',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  const absolute = url.startsWith('http') ? url : new URL(url, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(absolute).catch(() => {})
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absolute)
      }
      return undefined
    }),
  )
})
