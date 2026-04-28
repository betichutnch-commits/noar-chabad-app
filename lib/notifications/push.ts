import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotifyPayload } from './types'
type WebPushModule = typeof import('web-push')
type PushErrorLike = { statusCode?: number; body?: string; message?: string }

export type PushSendDetails = {
  ok: boolean
  totalSubscriptions: number
  sentSubscriptions: number
  removedSubscriptions: number
  errors: Array<{ statusCode: number; message: string }>
  reason?: 'not_configured' | 'no_subscriptions' | 'query_error' | 'send_failed'
}

let webPushConfigured = false

function configureWebPush(webpush: WebPushModule) {
  if (webPushConfigured) return
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
    .trim()
    .replace(/^"|"$/g, '')
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '')
    .trim()
    .replace(/^"|"$/g, '')
  const rawSubject = String(process.env.VAPID_SUBJECT || process.env.VAPID_CONTACT_EMAIL || 'admin@localhost').trim()
  const subject =
    /^(mailto:|https?:\/\/)/i.test(rawSubject) ? rawSubject : `mailto:${rawSubject}`
  const gcmApiKey = String(process.env.GCM_API_KEY || process.env.FCM_SERVER_KEY || '')
    .trim()
    .replace(/^"|"$/g, '')
  if (!publicKey || !privateKey) return
  try {
    if (gcmApiKey) {
      webpush.setGCMAPIKey(gcmApiKey)
    }
    webpush.setVapidDetails(subject, publicKey, privateKey)
    webPushConfigured = true
  } catch (error) {
    console.warn('[notify] invalid VAPID configuration', error)
    webPushConfigured = false
  }
}

export async function sendPushToUserDetailed(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<PushSendDetails> {
  try {
    const webpush = (await import('web-push')) as WebPushModule
    configureWebPush(webpush)
    if (!webPushConfigured) {
      console.warn('[notify] web-push not configured (missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)')
      return {
        ok: false,
        totalSubscriptions: 0,
        sentSubscriptions: 0,
        removedSubscriptions: 0,
        errors: [],
        reason: 'not_configured',
      }
    }

    const { data: rows, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      return {
        ok: false,
        totalSubscriptions: 0,
        sentSubscriptions: 0,
        removedSubscriptions: 0,
        errors: [{ statusCode: 0, message: error.message }],
        reason: 'query_error',
      }
    }

    if (!rows?.length) {
      return {
        ok: false,
        totalSubscriptions: 0,
        sentSubscriptions: 0,
        removedSubscriptions: 0,
        errors: [],
        reason: 'no_subscriptions',
      }
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
    })

    let sentSubscriptions = 0
    let removedSubscriptions = 0
    const errors: Array<{ statusCode: number; message: string }> = []
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
        sentSubscriptions += 1
        await admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id as string)
      } catch (e: unknown) {
        const err = (e || {}) as PushErrorLike
        const statusCode =
          typeof err.statusCode === 'number' ? err.statusCode : 0
        const message =
          String(err.body || err.message || 'web-push send failed')
            .replace(/\s+/g, ' ')
            .slice(0, 260)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', row.id as string)
          removedSubscriptions += 1
        } else {
          console.warn('[notify] web-push send failed', statusCode, e)
        }
        errors.push({ statusCode, message })
      }
    }
    return {
      ok: sentSubscriptions > 0,
      totalSubscriptions: rows.length,
      sentSubscriptions,
      removedSubscriptions,
      errors,
      reason: sentSubscriptions > 0 ? undefined : 'send_failed',
    }
  } catch (e) {
    console.warn('[notify] web-push module or send error', e)
    return {
      ok: false,
      totalSubscriptions: 0,
      sentSubscriptions: 0,
      removedSubscriptions: 0,
      errors: [{ statusCode: 0, message: String((e as { message?: string })?.message || 'module_error') }],
      reason: 'send_failed',
    }
  }
}

export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<boolean> {
  const result = await sendPushToUserDetailed(admin, userId, payload)
  return result.ok
}
