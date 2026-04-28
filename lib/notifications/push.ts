import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotifyPayload } from './types'

type WebPushModule = typeof import('web-push')

let webPushConfigured = false

function configureWebPush(webpush: WebPushModule) {
  if (webPushConfigured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const contact = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@localhost'
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(contact, publicKey, privateKey)
  webPushConfigured = true
}

export async function sendWebPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<boolean> {
  try {
    const webpush = (await import('web-push')) as WebPushModule
    configureWebPush(webpush)
    if (!webPushConfigured) {
      console.warn('[notify] web-push not configured (missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)')
      return false
    }

    const { data: rows, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error || !rows?.length) {
      return false
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
    })

    let anyOk = false
    for (const row of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint as string,
            keys: {
              p256dh: row.p256dh as string,
              auth: row.auth as string,
            },
          },
          body,
          { TTL: 60 * 60 },
        )
        anyOk = true
        await admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id as string)
      } catch (e: unknown) {
        const statusCode =
          e && typeof e === 'object' && 'statusCode' in e ? (e as { statusCode: number }).statusCode : 0
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', row.id as string)
        } else {
          console.warn('[notify] web-push send failed', statusCode, e)
        }
      }
    }
    return anyOk
  } catch (e) {
    console.warn('[notify] web-push module or send error', e)
    return false
  }
}
