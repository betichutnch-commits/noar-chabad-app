export type NotificationKind =
  | 'trip.submitted_dept_review'
  | 'trip.submitted_safety'
  | 'trip.dept_forwarded_safety'
  | 'trip.dept_review_coordinator'
  | 'trip.safety_status'
  | 'trip.cancelled'
  | 'contact.new'
  | 'contact.reply'
  | 'user.registration_pending'
  | 'user.status_changed'
  | 'user.role_changed'
  | 'trip.secondary_staff'

export type NotifyPayload = {
  kind: NotificationKind
  title: string
  body: string
  /** Path or full URL — normalized in notify layer */
  url: string
  inAppType?: string
}

export type RecipientSelector =
  | { mode: 'user_ids'; userIds: string[] }
  | { mode: 'safety_admins' }
  | { mode: 'tech_admins' }
  | {
      mode: 'dept_trips_officers'
      department: string | null | undefined
      /** If no officers found, use all safety admins */
      orFallbackSafetyAdmins: boolean
    }
