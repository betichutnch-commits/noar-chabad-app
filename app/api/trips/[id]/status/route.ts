import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isManagerUser } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import { notifyUserIds, notifyUsers } from '@/lib/notifications'
import { replaceRowSafetyWithDefaultRisks } from '@/lib/eventDefaultRisks'
import { seedRowsFromTripDetails } from '@/lib/tripPlan'
import {
  applyApprovedRequiredStaffPlan,
  calculateRequiredPlanningPreview,
  fetchTripAssignmentRules,
  fetchTripRoleRules,
  saveApprovedRequiredStaffPlan,
  type ApprovedAssignmentPlanRow,
  type RequiredStaffPlanRow,
} from '@/lib/tripRequiredRoles'
import { syncPlanAssigneesToStaffRoster } from '@/lib/syncPlanStaffAssignees'

type RouteContext = { params: Promise<unknown> }
type Body = {
  status: 'approved' | 'approved_for_execution' | 'rejected'
  note?: string | null
  requiredStaffPlan?: RequiredStaffPlanRow[]
  assignmentPlan?: ApprovedAssignmentPlanRow[]
  appendixCFormData?: Record<string, unknown>
  executionDeadlineDays?: 1 | 2
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string }
  const body = (await request.json()) as Body

  if (
    body.status !== 'approved' &&
    body.status !== 'approved_for_execution' &&
    body.status !== 'rejected'
  ) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const note = String(body.note ?? '').trim()

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

  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id, name, status, department, details')
    .eq('id', id)
    .single()
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const canResolveFromPending = trip.status === 'pending'
  const canPromoteToExecution =
    trip.status === 'approved' && body.status === 'approved_for_execution'

  if (!canResolveFromPending && !canPromoteToExecution) {
    return NextResponse.json(
      {
        error:
          'Trip status cannot be changed to the requested value.',
      },
      { status: 409 },
    )
  }

  if (body.status === 'approved') {
    const [rules, assignmentRules] = await Promise.all([fetchTripRoleRules(supabase), fetchTripAssignmentRules(supabase)])
    const { count: busCount } = await supabase.from('trip_plan_buses').select('id', { count: 'exact', head: true }).eq('trip_id', id)
    const preview = calculateRequiredPlanningPreview((trip.details || {}) as Record<string, unknown>, rules, assignmentRules, busCount || 0)
    const approvedRows = Array.isArray(body.requiredStaffPlan) && body.requiredStaffPlan.length ? body.requiredStaffPlan : preview.rows
    const approvedAssignmentRows = Array.isArray(body.assignmentPlan) && body.assignmentPlan.length ? body.assignmentPlan : preview.assignmentRows
    try {
      await saveApprovedRequiredStaffPlan(supabase, id, approvedRows, user.id)
      await applyApprovedRequiredStaffPlan(
        supabase,
        { id, details: (trip.details || {}) as Record<string, unknown> },
        approvedRows,
        preview.context,
        approvedAssignmentRows,
      )
      try {
        await syncPlanAssigneesToStaffRoster(supabase, id, approvedRows)
      } catch {
        // Assignee sync is best-effort when participant-ref columns are not migrated yet.
      }
      const { data: existingPlan } = await supabase.from('trip_plans').select('id').eq('trip_id', id).maybeSingle()
      let planId = existingPlan?.id as string | undefined
      if (!planId) {
        const created = await supabase.from('trip_plans').insert({ trip_id: id, created_by: user.id }).select('id').single()
        if (created.error || !created.data) throw new Error(created.error?.message || 'Failed to create trip plan')
        planId = String(created.data.id)
      }
      const { count: existingRowsCount } = await supabase.from('trip_plan_rows').select('id', { count: 'exact', head: true }).eq('plan_id', planId)
      if ((existingRowsCount || 0) === 0) {
        const rows = seedRowsFromTripDetails((trip.details || {}) as Record<string, unknown>)
        const inserted = await supabase.from('trip_plan_rows').insert(rows.map((row) => ({ ...row, plan_id: planId }))).select('id, event_text')
        if (inserted.error) throw new Error(inserted.error.message)
        for (const row of inserted.data || []) {
          const eventText = String(row.event_text || '').trim()
          if (eventText) await replaceRowSafetyWithDefaultRisks(supabase, String(row.id), eventText)
        }
      }
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to prepare required staff plan' }, { status: 500 })
    }
  }

  // Save appendix C form data when approving
  const APPENDIX_C_DOCUMENT_KEY = 'appendix-c-trip-leader-appointment'
  let executionDeadlineDate: string | null = null

  if (body.status === 'approved' && body.appendixCFormData) {
    const { data: existingOverride } = await supabase
      .from('trip_plan_document_overrides')
      .select('id')
      .eq('trip_id', id)
      .eq('document_key', APPENDIX_C_DOCUMENT_KEY)
      .maybeSingle()

    if (existingOverride) {
      await supabase
        .from('trip_plan_document_overrides')
        .update({ form_data: body.appendixCFormData, status: 'בטיפול', updated_at: new Date().toISOString() })
        .eq('id', existingOverride.id)
    } else {
      await supabase.from('trip_plan_document_overrides').insert({
        trip_id: id,
        document_key: APPENDIX_C_DOCUMENT_KEY,
        form_data: body.appendixCFormData,
        status: 'בטיפול',
      })
    }
  }

  if (body.status === 'approved' && body.executionDeadlineDays) {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + body.executionDeadlineDays)
    executionDeadlineDate = deadline.toISOString().slice(0, 10)
  }

  const updatePayload: Record<string, unknown> = { status: body.status }
  if (executionDeadlineDate) {
    updatePayload.execution_review_deadline = executionDeadlineDate
  }
  const { error } = await supabase.from('trips').update(updatePayload).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const title =
    body.status === 'approved'
      ? 'הטיול אושר לפרסום ותכנון!'
      : body.status === 'approved_for_execution'
        ? 'הטיול אושר לביצוע!'
        : 'הטיול נדחה'

  const deadlineLabel = executionDeadlineDate
    ? new Date(executionDeadlineDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const deadlineNote = executionDeadlineDate
    ? `\nהטיול ייבחן לאישור ביצוע ב${deadlineLabel}. יש להשלים את כל ההיערכות עד למועד זה.`
    : ''

  const message =
    body.status === 'approved'
      ? `הטיול "${trip.name}" אושר לפרסום ותכנון.${note ? `\nהערת בטיחות: ${note}` : ''}${deadlineNote}`
      : body.status === 'approved_for_execution'
        ? `הטיול "${trip.name}" אושר לביצוע.${note ? `\nהערת בטיחות: ${note}` : ''}`
        : `הטיול "${trip.name}" נדחה.${note ? `\nסיבת הדחייה: ${note}` : '\nהיכנס לפרטים לבירור.'}`

  const appendixCUrl = `/dashboard/trip/${id}/plan/documents/appendix-c`

  await notifyUserIds([trip.user_id], {
    kind: 'trip.safety_status',
    title,
    body: message,
    url: `/dashboard?planning=${trip.id}`,
    inAppType: body.status === 'rejected' ? 'error' : 'success',
    actions: body.status === 'approved'
      ? [
          { label: 'מעבר לתכנון', url: `/dashboard?planning=${trip.id}` },
          { label: 'צפה בכתב מינוי', url: appendixCUrl },
        ]
      : undefined,
  })

  await notifyUsers(
    {
      mode: 'dept_trips_officers',
      department: trip.department as string | null,
      orFallbackSafetyAdmins: false,
    },
    {
      kind: 'trip.safety_status',
      title: 'עדכון ממחלקת הבטיחות',
      body: `הטיול "${trip.name}" עודכן: ${title}`,
      url: '/hq/dept-review',
      inAppType: 'info',
    },
  )

  // Notify secretary to sign if approved
  if (body.status === 'approved') {
    const { data: secretaryProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'secretary')

    const secretaryIds = (secretaryProfiles || []).map((p) => p.id as string).filter(Boolean)
    if (secretaryIds.length) {
      await notifyUserIds(secretaryIds, {
        kind: 'trip.safety_status',
        title: 'נדרשת חתימתך על כתב מינוי',
        body: `הטיול "${trip.name}" אושר. נא לחתום על כתב המינוי לאחראי הטיול.`,
        url: appendixCUrl,
        inAppType: 'info',
        actions: [{ label: 'חתימה על כתב מינוי', url: appendixCUrl }],
      })
    }
  }

  return NextResponse.json({ ok: true })
}
