import type { NotifyPayload } from './types'

function absoluteUrl(pathOrUrl: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  if (!base) return pathOrUrl.startsWith('http') ? pathOrUrl : pathOrUrl
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

export async function sendNotificationEmail(
  toEmail: string,
  payload: NotifyPayload,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM_ADDRESS
  if (!apiKey || !from) {
    return false
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const link = absoluteUrl(payload.url)
    const { error } = await resend.emails.send({
      from,
      to: toEmail,
      subject: payload.title,
      html: `<div dir="rtl" style="font-family:sans-serif">
        <p>${payload.body}</p>
        <p><a href="${link}">פתיחה במערכת</a></p>
      </div>`,
    })
    if (error) {
      console.error('[notify] resend error', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[notify] resend send failed', e)
    return false
  }
}
