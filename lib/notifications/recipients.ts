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
      .in('role', ['safety_admin', 'admin', 'secretary'])
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
      .from('users_management_view')
      .select('id, raw_user_meta_data')

    if (error) {
      console.error('[notify] resolve dept_trips_officers', error.message)
      return []
    }

    const officers = (data || []).filter((row) => {
      const meta = ((row as { raw_user_meta_data?: Record<string, unknown> }).raw_user_meta_data || {}) as Record<
        string,
        unknown
      >
      const role = String(meta.role || '').toLowerCase().trim()
      const department = normalizeDepartmentKey(String(meta.department || ''))
      const canDeptReview = meta.can_dept_review === true || String(meta.can_dept_review || '').toLowerCase() === 'true'
      const isLegacyOfficer = role === 'dept_trips_officer'
      const isCapabilityOfficer = role === 'dept_staff' && canDeptReview
      return department === dept && (isLegacyOfficer || isCapabilityOfficer)
    })
    const officerIds = dedupe(officers.map((r) => (r as { id: string }).id))

    if (officerIds.length > 0) return officerIds

    if (selector.orFallbackSafetyAdmins) {
      return resolveRecipientUserIds(admin, { mode: 'safety_admins' })
    }

    return []
  }

  return []
}
