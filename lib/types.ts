export interface AppProfile {
  id: string;
  official_name?: string | null;
  last_name?: string | null;
  identity_number?: string | null;
  birth_date?: string | null;
  start_year?: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
  is_tech_admin?: boolean | null;
}

export interface TripRecord {
  id: string;
  user_id: string;
  name: string;
  branch: string | null;
  department?: string | null;
  coordinator_name: string | null;
  start_date: string;
  created_at?: string | null;
  status:
    | "draft"
    | "pending_dept_review"
    | "returned_for_changes"
    | "pending"
    | "approved"
    | "approved_for_execution"
    | "rejected"
    | "cancelled"
    | string;
  details?: {
    timeline?: Array<{ finalLocation?: string }>;
  } | null;
  dept_review_notes?: string | null;
  dept_reviewed_by?: string | null;
  dept_reviewed_at?: string | null;
  dept_forwarded_at?: string | null;
}

export interface ContactMessage {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  category: string | null;
  admin_response?: string | null;
  replied_at?: string | null;
  created_at: string;
}
