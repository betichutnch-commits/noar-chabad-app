import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser, isTechAdminUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

type RouteContext = { params: Promise<unknown> }

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  if (!isManagerUser(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messageRow, error: messageLoadError } = await supabase
    .from('contact_messages')
    .select('id, category')
    .eq('id', id)
    .single()

  if (messageLoadError || !messageRow) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  const isBugCategory = String(messageRow.category || 'general').toLowerCase() === 'bug'
  if (isBugCategory && !isTechAdminUser(userLike, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('contact_messages').update({ status: 'treated' }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
