import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecipientSelector } from './types'

export function normalizeDepartmentKey(department?: string | null): string {
  return String(department || '')
    .trim()
    .replace(/״/g, '"')
    .replace(/\s+/g, ' ')
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)))
}

export async function resolveRecipientUserIds(
  admin: SupabaseClient,
  selector: RecipientSelector,
): Promise<string[]> {
  if (selector.mode === 'user_ids') {
    return dedupe(selector.userIds)
  }

  if (selector.mode === 'safety_admins') {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['safety_admin', 'admin'])
    if (error) {
      console.error('[notify] resolve safety_admins', error.message)
      return []
    }
    return dedupe((data || []).map((r) => r.id as string))
  }

  if (selector.mode === 'tech_admins') {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('is_tech_admin', true)
    if (error) {
      console.error('[notify] resolve tech_admins', error.message)
      return []
    }
    return dedupe((data || []).map((r) => r.id as string))
  }

  if (selector.mode === 'dept_trips_officers') {
    const dept = normalizeDepartmentKey(selector.department)
    const { data, error } = await admin
      .from('profiles')
      .select('id, department')
      .eq('role', 'dept_trips_officer')

    if (error) {
      console.error('[notify] resolve dept_trips_officers', error.message)
      return []
    }

    const officers = (data || []).filter(
      (r) => normalizeDepartmentKey(r.department as string | null) === dept,
    )
    const officerIds = dedupe(officers.map((r) => r.id as string))

    if (officerIds.length > 0) return officerIds

    if (selector.orFallbackSafetyAdmins) {
      return resolveRecipientUserIds(admin, { mode: 'safety_admins' })
    }

    return []
  }

  return []
}
