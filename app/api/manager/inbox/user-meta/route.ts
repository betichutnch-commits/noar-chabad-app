import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

type Body = { userIds?: string[] }

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as Body
  const userIds = Array.from(new Set((body.userIds || []).map((id) => String(id || '').trim()).filter(Boolean)))
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, users: [] })
  }

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const users: Array<{ id: string; raw_user_meta_data: Record<string, unknown> }> = []
  for (const targetId of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(targetId)
    if (error || !data?.user) continue
    users.push({
      id: targetId,
      raw_user_meta_data: (data.user.user_metadata || {}) as Record<string, unknown>,
    })
  }

  return NextResponse.json({ ok: true, users })
}

