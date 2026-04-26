import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

type SaveTripBody = {
  editId?: string | null
  status: 'pending' | 'draft'
  tripData: {
    coordinator_name: string
    branch?: string | null
    department?: string | null
    name: string
    start_date: string
    details: Record<string, unknown>
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as SaveTripBody
  if (!body?.tripData || (body.status !== 'pending' && body.status !== 'draft')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const tripPayload = {
    user_id: user.id,
    coordinator_name: body.tripData.coordinator_name,
    branch: body.tripData.branch ?? null,
    department: body.tripData.department ?? null,
    name: body.tripData.name,
    start_date: body.tripData.start_date,
    status: body.status,
    details: body.tripData.details,
  }

  if (body.editId) {
    const { data: ownedTrip } = await supabase
      .from('trips')
      .select('id, user_id')
      .eq('id', body.editId)
      .single()

    if (!ownedTrip || ownedTrip.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase.from('trips').update(tripPayload).eq('id', body.editId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ id: body.editId })
  }

  const { data, error } = await supabase.from('trips').insert([tripPayload]).select('id').single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
