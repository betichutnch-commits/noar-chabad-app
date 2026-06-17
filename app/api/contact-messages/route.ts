import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { notifyUserIds } from '@/lib/notifications'
import { resolveRecipientUserIds } from '@/lib/notifications/recipients'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'

type Body = {
  subject: string
  message: string
  category: 'bug' | 'general'
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body
  if (!body?.subject || !body?.message || !body?.category) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: inserted, error } = await supabase
    .from('contact_messages')
    .insert([
      {
        user_id: user.id,
        subject: body.subject,
        message: body.message,
        category: body.category,
        status: 'new',
      },
    ])
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const admin = createSupabaseServiceRoleClient()
  const bug = (body.category || '').toLowerCase() === 'bug'
  const safetyIds =
    !bug && admin != null
      ? await resolveRecipientUserIds(admin, { mode: 'safety_admins' })
      : []
  let techIds: string[] = []
  if (bug && admin) {
    techIds = await resolveRecipientUserIds(admin, { mode: 'tech_admins' })
  }

  const recipientSet = new Set([...safetyIds, ...techIds])
  const recipientIds = Array.from(recipientSet)

  const preview = String(body.subject || 'פנייה חדשה').slice(0, 80)

  await notifyUserIds(recipientIds, {
    kind: 'contact.new',
    title: 'פנייה חדשה במערכת',
    body: `התקבלה פנייה: ${preview}`,
    url: '/manager/inbox',
    inAppType: 'info',
  })

  return NextResponse.json({ ok: true, id: inserted?.id })
}
