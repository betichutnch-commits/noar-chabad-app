import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertInAppNotification } from './inApp'
import { sendWebPushToUser } from './push'
import { sendNotificationEmail } from './email'
import { resolveRecipientUserIds } from './recipients'
import type { NotifyPayload, RecipientSelector } from './types'

type PrefsRow = {
  push_enabled: boolean
  email_enabled: boolean
  per_type: Record<string, unknown> | null
}

function isKindAllowed(perType: Record<string, unknown> | null | undefined, kind: string): boolean {
  if (!perType || typeof perType !== 'object') return true
  const v = perType[kind]
  if (v === false) return false
  return true
}

async function loadPrefs(admin: SupabaseClient, userId: string): Promise<PrefsRow | null> {
  const { data } = await admin
    .from('notification_preferences')
    .select('push_enabled, email_enabled, per_type')
    .eq('user_id', userId)
    .maybeSingle()
  return data as PrefsRow | null
}

async function resolveDestinationEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user) return null
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>
    const contact = typeof meta.contact_email === 'string' ? meta.contact_email.trim() : ''
    if (contact) return contact
    if (data.user.email) return data.user.email
    return null
  } catch {
    return null
  }
}

async function deliverToUser(admin: SupabaseClient, userId: string, payload: NotifyPayload): Promise<void> {
  await insertInAppNotification(admin, userId, payload)

  const prefs = await loadPrefs(admin, userId)
  const pushEnabled = prefs?.push_enabled !== false
  const emailEnabled = prefs?.email_enabled !== false
  const kindOk = isKindAllowed(prefs?.per_type ?? null, payload.kind)

  if (!kindOk) return

  let pushOk = false
  if (pushEnabled) {
    pushOk = await sendWebPushToUser(admin, userId, payload)
  }

  const shouldEmail = emailEnabled && (!pushEnabled || !pushOk)
  if (!shouldEmail) return

  const to = await resolveDestinationEmail(admin, userId)
  if (!to) return

  await sendNotificationEmail(to, payload)
}

/**
 * Fan-out notifications (in-app + optional web push + email fallback) using the service role.
 * Safe to call from API routes; logs and returns if service role is not configured.
 */
export async function notifyUsers(
  selector: RecipientSelector,
  payload: NotifyPayload,
): Promise<void> {
  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    console.error('[notify] SUPABASE_SERVICE_ROLE_KEY missing — skipping fan-out')
    return
  }

  const ids = await resolveRecipientUserIds(admin, selector)
  for (const userId of ids) {
    try {
      await deliverToUser(admin, userId, payload)
    } catch (e) {
      console.error('[notify] deliver failed', userId, e)
    }
  }
}

/** Notify an explicit list of user IDs (deduped). */
export async function notifyUserIds(userIds: string[], payload: NotifyPayload): Promise<void> {
  await notifyUsers({ mode: 'user_ids', userIds }, payload)
}
