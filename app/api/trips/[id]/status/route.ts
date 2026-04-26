import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

type RouteContext = { params: Promise<unknown> }
type Body = { status: 'approved' | 'rejected' }

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as Body

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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

  const { data: trip } = await supabase.from('trips').select('id, user_id, name').eq('id', id).single()
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const { error } = await supabase.from('trips').update({ status: body.status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: trip.user_id,
    title: body.status === 'approved' ? 'הטיול אושר!' : 'הטיול נדחה',
    message:
      body.status === 'approved'
        ? `הטיול "${trip.name}" אושר בהצלחה.`
        : `הטיול "${trip.name}" נדחה. היכנס לפרטים לבירור.`,
    link: `/dashboard/trip/${trip.id}`,
    type: body.status === 'approved' ? 'success' : 'error',
  })

  return NextResponse.json({ ok: true })
}
