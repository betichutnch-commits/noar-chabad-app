import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { notifyUsers } from '@/lib/notifications'

async function resolveUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (token) {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) return { user: null as null }
    return { user: data.user }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { user: null as null }
  return { user: data.user }
}

export async function POST(request: Request) {
  const { user } = await resolveUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = String((user.user_metadata as Record<string, unknown>)?.status || '')
  if (status !== 'pending') {
    return NextResponse.json({ error: 'Not a pending registration' }, { status: 403 })
  }

  const fullName = String((user.user_metadata as Record<string, unknown>)?.full_name || 'משתמש חדש')
  const department = String((user.user_metadata as Record<string, unknown>)?.department || '')

  await notifyUsers(
    { mode: 'safety_admins' },
    {
      kind: 'user.registration_pending',
      title: 'בקשת הרשמה חדשה',
      body: `${fullName}${department ? ` (${department})` : ''} נרשם/ה וממתין/ה לאישור.`,
      url: '/manager/users',
      inAppType: 'info',
    },
  )

  return NextResponse.json({ ok: true })
}
