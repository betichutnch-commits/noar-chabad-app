'use server'

import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { createSupabaseServiceRoleClient } from '@/lib/supabaseService'
import { isManagerUser } from '@/lib/auth'

export type ManagedUser = {
  id: string
  email: string
  raw_user_meta_data: Record<string, unknown>
}

type FetchUsersResult =
  | { ok: true; users: ManagedUser[]; page: number; perPage: number; total: number; totalPages: number }
  | { ok: false; error: string }

type FetchUsersParams = {
  page?: number
  perPage?: number
}

export async function fetchManagedUsersAction(params: FetchUsersParams = {}): Promise<FetchUsersResult> {
  const page = Math.max(1, Number(params.page || 1))
  const perPage = Math.min(200, Math.max(1, Number(params.perPage || 50)))
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, is_tech_admin')
    .eq('id', user.id)
    .single()

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User
  if (!isManagerUser(userLike, profile)) {
    return { ok: false, error: 'Forbidden' }
  }

  const admin = createSupabaseServiceRoleClient()
  if (!admin) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }
  }

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page,
    perPage,
  })
  if (listError) {
    return { ok: false, error: listError.message }
  }

  const authUsers = listed?.users || []
  const ids = authUsers.map((u) => u.id).filter(Boolean)

  const profilesById = new Map<string, Record<string, unknown>>()
  if (ids.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, official_name, last_name, department, identity_number, phone')
      .in('id', ids)
    if (profilesError) {
      return { ok: false, error: profilesError.message }
    }
    for (const p of profiles || []) {
      profilesById.set(String(p.id), (p as unknown as Record<string, unknown>) || {})
    }
  }

  const users: ManagedUser[] = authUsers.map((u) => {
    const meta = ((u.user_metadata || {}) as Record<string, unknown>) || {}
    const profileMeta = profilesById.get(String(u.id)) || {}
    const fullName = String(meta.full_name || '').trim()
    const officialName = String(profileMeta.official_name || '').trim()
    const lastName = String(profileMeta.last_name || '').trim()
    const mergedFullName = fullName || `${officialName} ${lastName}`.trim()

    return {
      id: String(u.id),
      email: String(u.email || ''),
      raw_user_meta_data: {
        ...meta,
        full_name: mergedFullName || meta.full_name || '',
        department: meta.department ?? profileMeta.department ?? '',
        identity_number: meta.identity_number ?? profileMeta.identity_number ?? '',
        phone: meta.phone ?? profileMeta.phone ?? '',
      },
    }
  })

  const total = Number(listed?.total || users.length || 0)
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  return { ok: true, users, page, perPage, total, totalPages }
}

