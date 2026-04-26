import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

type RouteContext = { params: Promise<unknown> }
type Body = { reason: string }

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as Body
  if (!body?.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: trip, error: fetchError } = await supabase
    .from('trips')
    .select('id, user_id, details')
    .eq('id', id)
    .single()

  if (fetchError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const details = (trip.details as Record<string, unknown>) || {}
  const updatedDetails = { ...details, cancellationReason: body.reason }

  const { error } = await supabase
    .from('trips')
    .update({ status: 'cancelled', cancellation_reason: body.reason, details: updatedDetails })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, details: updatedDetails })
}
