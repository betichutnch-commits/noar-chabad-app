import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotifyPayload } from './types'

export async function insertInAppNotification(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<boolean> {
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    title: payload.title,
    message: payload.body,
    link: payload.url,
    type: payload.inAppType || 'info',
    is_read: false,
  })
  if (error) {
    console.error('[notify] in-app insert failed', userId, error.message)
    return false
  }
  return true
}
