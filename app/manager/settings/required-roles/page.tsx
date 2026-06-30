"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ManagerHeader } from "@/components/layout/ManagerHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CATEGORIES } from "@/lib/constants";
import {
  DEFAULT_ASSIGNMENT_REQUIREMENT_RULES,
  DEFAULT_REQUIRED_ROLE_RULES,
  type RequiredAssignmentAudience,
  type RequiredAssignmentKind,
  type RoleCalculationType,
  type RoleMergePolicy,
  type RoleTriggerType,
  type TripAssignmentRequirementRule,
  type TripRoleRequirementRule,
} from "@/lib/tripRequiredRoles";

type LocalSelectOption<T extends string> = { value: T; label: string };
type SettingsTab = "roles" | "assignments";

function RuleSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "בחר",
  clearable = false,
}: {
  value: T | "";
  onChange: (value: T | "") => void;
  options: LocalSelectOption<T>[];
  placeholder?: string;
  clearable?: boolean;
}) {
  return (
    <Select
      className="mt-1"
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      clearable={clearable}
      accent="emerald"
      buttonClassName="!rounded-2xl"
    />
  );
}

const triggerOptions: LocalSelectOption<RoleTriggerType>[] = [
  { value: "always", label: "תמיד" },
  { value: "organized_transport", label: "נסיעה מאורגנת" },
  { value: "sleeping", label: "לינה" },
  { value: "category", label: "לפי קטגוריה" },
  { value: "event", label: "לפי התרחשות" },
  { value: "participant_ratio", label: "יחס לחניכים" },
  { value: "bus_count", label: "לפי אוטובוסים" },
];

const calculationOptions: LocalSelectOption<RoleCalculationType>[] = [
  { value: "fixed", label: "כמות קבועה" },
  { value: "ratio_participants", label: "1 לכל X חניכים" },
  { value: "per_bus", label: "לכל אוטובוס" },
];

const mergeOptions: LocalSelectOption<RoleMergePolicy>[] = [
  { value: "mergeable", label: "ניתן למיזוג" },
  { value: "exclusive", label: "בלעדי - לא מתמזג" },
];
const assignmentKindOptions: LocalSelectOption<RequiredAssignmentKind>[] = [
  { value: "buses", label: "שיבוצי אוטובוס" },
  { value: "groups", label: "שיבוצי קבוצות" },
  { value: "rooms", label: "שיבוצי חדרים" },
  { value: "other", label: "אחר" },
];
const audienceOptions: LocalSelectOption<RequiredAssignmentAudience>[] = [
  { value: "participants", label: "חניכים" },
  { value: "staff", label: "צוות" },
  { value: "both", label: "חניכים וצוות" },
];

const roleKeyFromLabel = (label: string) =>
  label
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0590-\u05ff_]/g, "")
    .slice(0, 48) || `role_${Date.now()}`;

const emptyRule = (index: number): TripRoleRequirementRule => ({
  role_key: `custom_role_${index + 1}`,
  role_label: "תפקיד נוסף",
  trigger_type: "always",
  category_key: null,
  event_label: null,
  calculation_type: "fixed",
  fixed_quantity: 1,
  ratio_per: null,
  min_quantity: 0,
  merge_policy: "mergeable",
  creates_staff_slot: true,
  creates_bus_assignment: false,
  creates_room_assignment: false,
  creates_group_assignment: false,
  order_index: index,
  is_active: true,
});

const emptyAssignmentRule = (index: number): TripAssignmentRequirementRule => ({
  assignment_key: `custom_assignment_${index + 1}`,
  kind: "other",
  title: "שיבוץ נוסף",
  custom_kind_label: "אחר",
  trigger_type: "always",
  category_key: null,
  event_label: null,
  audience: "both",
  creates_items: false,
  order_index: index,
  is_active: true,
});

export default function RequiredRolesSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("roles");
  const [rules, setRules] = useState<TripRoleRequirementRule[]>(DEFAULT_REQUIRED_ROLE_RULES);
  const [assignmentRules, setAssignmentRules] = useState<TripAssignmentRequirementRule[]>(DEFAULT_ASSIGNMENT_REQUIREMENT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const eventOptions = useMemo(
    () =>
      Object.entries(CATEGORIES).flatMap(([categoryKey, category]) =>
        category.options.map((option) => ({
          key: `${categoryKey}:${option.label}`,
          categoryKey,
          categoryLabel: category.label,
          eventLabel: option.label,
        })),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadRules() {
      setLoading(true);
      const res = await fetch("/api/manager/settings/required-roles", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (cancelled) return;
      setRules(Array.isArray(payload.rules) ? payload.rules : DEFAULT_REQUIRED_ROLE_RULES);
      setAssignmentRules(Array.isArray(payload.assignmentRules) ? payload.assignmentRules : DEFAULT_ASSIGNMENT_REQUIREMENT_RULES);
      setLoading(false);
    }
    void loadRules();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRule = (index: number, patch: Partial<TripRoleRequirementRule>) => {
    setMessage("");
    setRules((prev) =>
      prev.map((rule, ruleIndex) => {
        if (ruleIndex !== index) return rule;
        const next = { ...rule, ...patch };
        if (patch.role_label && (!rule.role_key || rule.role_key.startsWith("custom_role_"))) next.role_key = roleKeyFromLabel(patch.role_label);
        return next;
      }),
    );
  };
  const updateAssignmentRule = (index: number, patch: Partial<TripAssignmentRequirementRule>) => {
    setMessage("");
    setAssignmentRules((prev) => prev.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
  };

  const saveRules = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/manager/settings/required-roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules, assignmentRules }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(String(payload.error || "שמירת הכללים נכשלה"));
      return;
    }
    setMessage(`נשמרו ${Number(payload.saved || 0)} כללי צוות ו-${Number(payload.savedAssignments || 0)} כללי שיבוץ.`);
  };

  return (
    <>
      <ManagerHeader title="כללי מצבת צוות ושיבוצים" />
      <div className="mx-auto max-w-7xl animate-fadeIn space-y-4 p-4 pb-32 md:p-8">
        <Button variant="outline" onClick={() => router.push("/manager/settings")} className="px-4">
          <ArrowRight size={16} />
          חזרה להגדרות מערכת
        </Button>

        <section className="rounded-3xl border border-border-subtle bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-5">
            <div>
              <h2 className="text-xl font-black text-gray-800">הגדרת תפקידי חובה ושיבוצים</h2>
              <p className="mt-1 text-sm text-gray-600">הכללים האלו ירכיבו את מצבת הצוות והשיבוצים שיוצגו למחלקת מפעלים/בטיחות בזמן אישור הטיול לתכנון.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveRules} isLoading={saving} className="px-4">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                שמירה
              </Button>
            </div>
          </div>
          <div className="flex gap-2 border-b border-border-subtle bg-gray-50 px-5 py-3">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
                activeTab === "roles"
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm"
                  : "border-transparent text-gray-500 hover:border-cyan-100 hover:bg-cyan-50/60 hover:text-cyan-700"
              }`}
            >
              תפקידי חובה
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assignments")}
              className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
                activeTab === "assignments"
                  ? "border-purple-200 bg-purple-50 text-purple-700 shadow-sm"
                  : "border-transparent text-gray-500 hover:border-purple-100 hover:bg-purple-50/60 hover:text-purple-700"
              }`}
            >
              שיבוצים
            </button>
          </div>

          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <Loader2 className="animate-spin text-brand-cyan" size={34} />
            </div>
          ) : activeTab === "roles" ? (
            <div className="space-y-3 p-4">
              {rules.map((rule, index) => (
                <div key={`${rule.role_key}-${index}`} className={`rounded-3xl border p-4 ${rule.is_active ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-gray-100 opacity-70"}`}>
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_120px]">
                    <label className="text-xs font-black text-gray-600">
                      תפקיד
                      <input value={rule.role_label} onChange={(event) => updateRule(index, { role_label: event.target.value })} className="mt-1 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
                    </label>

                    <label className="text-xs font-black text-gray-600">
                      מתי חל
                      <RuleSelect
                        value={rule.trigger_type}
                        onChange={(trigger_type) => updateRule(index, { trigger_type: trigger_type as RoleTriggerType })}
                        options={triggerOptions}
                        clearable={false}
                      />
                    </label>

                    <label className="text-xs font-black text-gray-600">
                      חישוב
                      <RuleSelect
                        value={rule.calculation_type}
                        onChange={(calculation_type) => updateRule(index, { calculation_type: calculation_type as RoleCalculationType })}
                        options={calculationOptions}
                        clearable={false}
                      />
                    </label>

                    <label className="text-xs font-black text-gray-600">
                      כמות / יחס
                      <input
                        type="number"
                        min={0}
                        value={rule.calculation_type === "ratio_participants" ? rule.ratio_per || "" : rule.fixed_quantity}
                        onChange={(event) =>
                          updateRule(
                            index,
                            rule.calculation_type === "ratio_participants" ? { ratio_per: Number(event.target.value || 0) || null } : { fixed_quantity: Number(event.target.value || 0) },
                          )
                        }
                        className="mt-1 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none"
                      />
                    </label>

                    <label className="text-xs font-black text-gray-600">
                      מיזוג
                      <RuleSelect
                        value={rule.merge_policy}
                        onChange={(merge_policy) => updateRule(index, { merge_policy: merge_policy as RoleMergePolicy })}
                        options={mergeOptions}
                        clearable={false}
                      />
                    </label>

                    <div className="flex items-end justify-end gap-2">
                      <button type="button" onClick={() => updateRule(index, { is_active: !rule.is_active })} className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-600">
                        {rule.is_active ? "פעיל" : "כבוי"}
                      </button>
                      <button type="button" onClick={() => setRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    {rule.trigger_type === "category" ? (
                      <label className="text-xs font-black text-gray-600">
                        קטגוריה
                        <RuleSelect
                          value={rule.category_key || ""}
                          onChange={(category_key) => updateRule(index, { category_key })}
                          options={Object.entries(CATEGORIES).map(([key, category]) => ({ value: key, label: category.label }))}
                          placeholder="בחר קטגוריה"
                        />
                      </label>
                    ) : null}

                    {rule.trigger_type === "event" ? (
                      <label className="text-xs font-black text-gray-600">
                        התרחשות
                        <RuleSelect
                          value={`${rule.category_key || ""}:${rule.event_label || ""}`}
                          onChange={(key) => {
                            const selected = eventOptions.find((item) => item.key === key);
                            updateRule(index, { category_key: selected?.categoryKey || null, event_label: selected?.eventLabel || null });
                          }}
                          options={eventOptions.map((event) => ({
                            value: event.key,
                            label: `${event.categoryLabel} - ${event.eventLabel}`,
                          }))}
                          placeholder="בחר התרחשות"
                        />
                      </label>
                    ) : null}

                    <label className="text-xs font-black text-gray-600">
                      מינימום
                      <input type="number" min={0} value={rule.min_quantity} onChange={(event) => updateRule(index, { min_quantity: Number(event.target.value || 0) })} className="mt-1 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none" />
                    </label>

                    <label className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-black text-gray-600">
                      <input type="checkbox" checked={rule.creates_staff_slot} onChange={(event) => updateRule(index, { creates_staff_slot: event.target.checked })} />
                      יוצר תקן צוות
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-black text-gray-600">
                      <input type="checkbox" checked={rule.creates_bus_assignment} onChange={(event) => updateRule(index, { creates_bus_assignment: event.target.checked })} />
                      פותח שיבוץ אוטובוסים
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-black text-gray-600">
                      <input type="checkbox" checked={rule.creates_room_assignment} onChange={(event) => updateRule(index, { creates_room_assignment: event.target.checked })} />
                      פותח שיבוץ חדרים
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex justify-center rounded-3xl border-2 border-dashed border-emerald-100 bg-emerald-50/40 p-4">
                <Button variant="outline" onClick={() => setRules((prev) => [...prev, emptyRule(prev.length)])} className="px-5">
                  <Plus size={16} />
                  הוסף כלל
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {assignmentRules.map((rule, index) => (
                <div key={`${rule.assignment_key}-${index}`} className={`rounded-3xl border p-4 ${rule.is_active ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-gray-100 opacity-70"}`}>
                  <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_120px]">
                    <label className="text-xs font-black text-gray-600">
                      שם השיבוץ
                      <input value={rule.title} onChange={(event) => updateAssignmentRule(index, { title: event.target.value })} className="mt-1 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
                    </label>
                    <label className="text-xs font-black text-gray-600">
                      סוג
                      <RuleSelect
                        value={rule.kind}
                        onChange={(kind) => updateAssignmentRule(index, { kind: kind as RequiredAssignmentKind })}
                        options={assignmentKindOptions}
                        clearable={false}
                      />
                    </label>
                    <label className="text-xs font-black text-gray-600">
                      מתי נפתח
                      <RuleSelect
                        value={rule.trigger_type}
                        onChange={(trigger_type) => updateAssignmentRule(index, { trigger_type: trigger_type as RoleTriggerType })}
                        options={triggerOptions}
                        clearable={false}
                      />
                    </label>
                    <label className="text-xs font-black text-gray-600">
                      קהל יעד
                      <RuleSelect
                        value={rule.audience}
                        onChange={(audience) => updateAssignmentRule(index, { audience: audience as RequiredAssignmentAudience })}
                        options={audienceOptions}
                        clearable={false}
                      />
                    </label>
                    <label className="flex items-center gap-2 self-end rounded-2xl border border-gray-100 bg-white px-3 py-3 text-xs font-black text-gray-600">
                      <input type="checkbox" checked={rule.creates_items} onChange={(event) => updateAssignmentRule(index, { creates_items: event.target.checked })} />
                      יוצר פריטים
                    </label>
                    <div className="flex items-end justify-end gap-2">
                      <button type="button" onClick={() => updateAssignmentRule(index, { is_active: !rule.is_active })} className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-600">
                        {rule.is_active ? "פעיל" : "כבוי"}
                      </button>
                      <button type="button" onClick={() => setAssignmentRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {rule.kind === "other" ? (
                      <label className="text-xs font-black text-gray-600">
                        שם סוג אחר
                        <input value={rule.custom_kind_label || ""} onChange={(event) => updateAssignmentRule(index, { custom_kind_label: event.target.value })} className="mt-1 h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none" />
                      </label>
                    ) : null}
                    {rule.trigger_type === "category" ? (
                      <label className="text-xs font-black text-gray-600">
                        קטגוריה
                        <RuleSelect
                          value={rule.category_key || ""}
                          onChange={(category_key) => updateAssignmentRule(index, { category_key })}
                          options={Object.entries(CATEGORIES).map(([key, category]) => ({ value: key, label: category.label }))}
                          placeholder="בחר קטגוריה"
                        />
                      </label>
                    ) : null}
                    {rule.trigger_type === "event" ? (
                      <label className="text-xs font-black text-gray-600">
                        התרחשות
                        <RuleSelect
                          value={`${rule.category_key || ""}:${rule.event_label || ""}`}
                          onChange={(key) => {
                            const selected = eventOptions.find((item) => item.key === key);
                            updateAssignmentRule(index, { category_key: selected?.categoryKey || null, event_label: selected?.eventLabel || null });
                          }}
                          options={eventOptions.map((event) => ({
                            value: event.key,
                            label: `${event.categoryLabel} - ${event.eventLabel}`,
                          }))}
                          placeholder="בחר התרחשות"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              ))}
              <div className="flex justify-center rounded-3xl border-2 border-dashed border-emerald-100 bg-emerald-50/40 p-4">
                <Button variant="outline" onClick={() => setAssignmentRules((prev) => [...prev, emptyAssignmentRule(prev.length)])} className="px-5">
                  <Plus size={16} />
                  הוסף שיבוץ
                </Button>
              </div>
            </div>
          )}

          {message ? <div className="border-t border-gray-100 p-4 text-sm font-black text-emerald-700">{message}</div> : null}
        </section>
      </div>
    </>
  );
}
