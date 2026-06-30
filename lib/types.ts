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
  safety_assignee_id?: string | null;
  safety_assigned_at?: string | null;
  safety_assigned_by?: string | null;
}

export interface TripPlanRecord {
  id: string;
  trip_id: string;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TripPlanRowRecord {
  id: string;
  plan_id: string;
  order_index: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
  notes?: string | null;
  owner_name?: string | null;
  safety_done?: boolean | null;
  equipment_done?: boolean | null;
  prints_done?: boolean | null;
  notes_done?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TripPlanSafetyRecord {
  id: string;
  row_id: string;
  order_index: number;
  risk?: string | null;
  mitigation?: string | null;
  owner?: string | null;
}

export interface TripPlanEquipmentRecord {
  id: string;
  row_id: string;
  order_index: number;
  item?: string | null;
  quantity?: string | null;
  quantity_unit?: string | null;
  source_type?: string | null;
  source_details?: string | null;
}

export interface TripPlanPrintRecord {
  id: string;
  row_id: string;
  order_index: number;
  file_path: string;
  file_name?: string | null;
  quantity?: number | null;
  print_size?: string | null;
  page_type?: string | null;
  print_location?: string | null;
  file_size_bytes?: number | null;
  notes?: string | null;
  status?: string | null;
  design_id?: string | null;
}

export interface TripPlanDesignRecord {
  id: string;
  row_id: string;
  order_index: number;
  document_name: string;
  designer_name?: string | null;
  size_settings?: string | null;
  notes?: string | null;
  content_mode: "text" | "file";
  document_text?: string | null;
  designer_instructions?: string | null;
  brief_file_path?: string | null;
  brief_file_name?: string | null;
  output_file_path?: string | null;
  output_file_name?: string | null;
  status?: string | null;
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
