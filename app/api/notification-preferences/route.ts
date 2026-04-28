import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

const defaults = {
  push_enabled: true,
  email_enabled: true,
  per_type: {} as Record<string, unknown>,
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notification_preferences')
    .select('push_enabled, email_enabled, per_type')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    push_enabled: data?.push_enabled ?? defaults.push_enabled,
    email_enabled: data?.email_enabled ?? defaults.email_enabled,
    per_type: (data?.per_type as Record<string, unknown>) || defaults.per_type,
  })
}

type PatchBody = {
  push_enabled?: boolean
  email_enabled?: boolean
  per_type?: Record<string, unknown>
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as PatchBody
  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('push_enabled, email_enabled, per_type')
    .eq('user_id', user.id)
    .maybeSingle()

  const prevPer = (existing?.per_type as Record<string, unknown>) || {}
  const mergedPerType =
    body.per_type !== undefined ? { ...prevPer, ...body.per_type } : prevPer

  const row = {
    user_id: user.id,
    push_enabled: body.push_enabled ?? existing?.push_enabled ?? defaults.push_enabled,
    email_enabled: body.email_enabled ?? existing?.email_enabled ?? defaults.email_enabled,
    per_type: mergedPerType,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('notification_preferences').upsert(row, {
    onConflict: 'user_id',
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
