import { NextResponse } from 'next/server'

export async function GET() {
  const publicKey = String(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '',
  )
    .trim()
    .replace(/^"|"$/g, '')

  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID public key not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
