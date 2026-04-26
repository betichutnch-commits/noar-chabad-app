import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

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

  const { error } = await supabase.from('contact_messages').insert([
    {
      user_id: user.id,
      subject: body.subject,
      message: body.message,
      category: body.category,
      status: 'new',
    },
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
