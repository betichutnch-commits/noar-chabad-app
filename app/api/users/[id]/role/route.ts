import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }
type Body = { new_role?: string }

const ALLOWED = new Set(['coordinator', 'dept_staff', 'dept_trips_officer', 'safety_admin', 'user'])

export async function POST(request: Request, { params }: RouteContext) {
  const { id: targetUserId } = await params
  const body = (await request.json()) as Body
  const newRole = String(body?.new_role || '').trim().toLowerCase()
  if (!targetUserId || !ALLOWED.has(newRole)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  if (!isManagerUser(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.rpc('update_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await notifyUserIds(
    [targetUserId],
    {
      kind: 'user.role_changed',
      title: 'עודכן התפקיד במערכת',
      body: `התפקיד שלך עודכן ל: ${newRole}.`,
      url: '/dashboard/profile',
      inAppType: 'info',
    },
  )

  return NextResponse.json({ ok: true })
}
