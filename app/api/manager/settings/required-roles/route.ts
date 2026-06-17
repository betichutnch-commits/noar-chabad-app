import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  DEFAULT_ASSIGNMENT_REQUIREMENT_RULES,
  DEFAULT_REQUIRED_ROLE_RULES,
  normalizeAssignmentRuleInput,
  normalizeRoleRuleInput,
  type TripAssignmentRequirementRule,
  type TripRoleRequirementRule,
} from "@/lib/tripRequiredRoles";

type Body = {
  rules?: Partial<TripRoleRequirementRule>[];
  assignmentRules?: Partial<TripAssignmentRequirementRule>[];
};

async function requireManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  return { supabase, user: user as User, ok: isManagerUser(user as User, profile || null), status: 403 as const };
}

export async function GET() {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await access.supabase
    .from("trip_role_requirement_rules")
    .select(
      "id, role_key, role_label, trigger_type, category_key, event_label, calculation_type, fixed_quantity, ratio_per, min_quantity, merge_policy, creates_staff_slot, creates_bus_assignment, creates_room_assignment, creates_group_assignment, order_index, is_active",
    )
    .order("order_index", { ascending: true });

  const { data: assignmentData, error: assignmentError } = await access.supabase
    .from("trip_assignment_requirement_rules")
    .select("id, assignment_key, kind, title, custom_kind_label, trigger_type, category_key, event_label, audience, creates_items, order_index, is_active")
    .order("order_index", { ascending: true });

  return NextResponse.json({
    ok: true,
    rules: error ? DEFAULT_REQUIRED_ROLE_RULES : data?.length ? data : DEFAULT_REQUIRED_ROLE_RULES,
    assignmentRules: assignmentError ? DEFAULT_ASSIGNMENT_REQUIREMENT_RULES : assignmentData?.length ? assignmentData : DEFAULT_ASSIGNMENT_REQUIREMENT_RULES,
    fallback: Boolean(error || assignmentError),
  });
}

export async function PUT(request: Request) {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const rules = (Array.isArray(body.rules) ? body.rules : [])
    .map((rule, index) => normalizeRoleRuleInput(rule, index))
    .filter((rule) => rule.role_key && rule.role_label);
  const assignmentRules = (Array.isArray(body.assignmentRules) ? body.assignmentRules : [])
    .map((rule, index) => normalizeAssignmentRuleInput(rule, index))
    .filter((rule) => rule.assignment_key && rule.title);

  const clear = await access.supabase.from("trip_role_requirement_rules").delete().neq("role_key", "__never__");
  if (clear.error) return NextResponse.json({ error: clear.error.message }, { status: 500 });
  const clearAssignments = await access.supabase.from("trip_assignment_requirement_rules").delete().neq("assignment_key", "__never__");
  if (clearAssignments.error) return NextResponse.json({ error: clearAssignments.error.message }, { status: 500 });

  if (rules.length) {
    const { error } = await access.supabase.from("trip_role_requirement_rules").insert(
      rules.map((rule, index) => ({
        ...rule,
        order_index: index,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (assignmentRules.length) {
    const { error } = await access.supabase.from("trip_assignment_requirement_rules").insert(
      assignmentRules.map((rule, index) => ({
        ...rule,
        order_index: index,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rules.length, savedAssignments: assignmentRules.length });
}
