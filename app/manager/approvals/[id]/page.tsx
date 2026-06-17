"use client"

import React, { useState, useEffect, use, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Check, X, ArrowRight, Loader2, ChevronDown, History } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { isManagerUser } from '@/lib/auth'
import type { ApprovedAssignmentPlanRow, RequiredStaffPlanRow, RequiredStaffContext } from '@/lib/tripRequiredRoles'
import type { AppProfile, TripRecord } from '@/lib/types'
import { TripComplianceApprovalBanner } from '@/components/plan/TripComplianceApprovalBanner'
import AppendixCForm, { type AppendixCFormValues } from '@/components/AppendixCForm'
import { buildAppendixCInitialValues, getLanguageGender } from '@/lib/appendixCHelpers'

// ייבוא Hook
import { useUser } from '@/hooks/useUser'

const SAFETY_TRIP_STATUS_LABELS: Record<string, string> = {
  pending: "ממתין לאישור בטיחות",
  approved: "אושר לפרסום ותכנון",
  approved_for_execution: "אושר לביצוע",
  rejected: "נדחה",
};

function formatStaffPlanningContextSummary(ctx: RequiredStaffContext): string {
  const parts = [`${ctx.participantCount} חניכים`];
  if (ctx.totalPeople > ctx.participantCount) {
    parts.push(`${ctx.totalPeople} סה״כ מטיילים`);
  }
  parts.push(`${ctx.busCount} אוטובוסים`);
  return parts.join(" · ");
}

function StyledSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className = '',
}: {
  value: T | ''
  options: Array<{ value: T; label: string }>
  onChange: (next: T | '') => void
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const active = options.find((o) => o.value === value)?.label || placeholder

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 inline-flex items-center justify-between hover:border-gray-300"
      >
        <span className="truncate">{active}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute top-full mt-1.5 right-0 z-[130] min-w-full rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
          <div className="p-1.5 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className={`w-full rounded-lg px-2.5 py-1.5 text-right text-xs font-bold transition-colors ${
                value === '' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full rounded-lg px-2.5 py-1.5 text-right text-xs font-bold transition-colors ${
                  value === opt.value ? 'bg-cyan-50 text-cyan-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function ManagerTripView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // 1. שימוש ב-Hook
  const { user, profile, loading: userLoading } = useUser('/');

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<AppProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [assigneeName, setAssigneeName] = useState<string>("");
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [assignmentHistory, setAssignmentHistory] = useState<
    Array<{ id: string; created_at: string; assigned_by: string; assigned_to: string | null; assigned_from: string | null }>
  >([]);
  const [showAssignmentHistory, setShowAssignmentHistory] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    status: 'approved' | 'rejected' | null;
    note: string;
    requiredStaffRows: RequiredStaffPlanRow[];
    assignmentRows: ApprovedAssignmentPlanRow[];
    requiredStaffContext: RequiredStaffContext | null;
    loadingRequiredStaff: boolean;
    appendixCValues: Partial<AppendixCFormValues> | null;
    executionDeadlineDays: 1 | 2;
  }>({ isOpen: false, status: null, note: '', requiredStaffRows: [], assignmentRows: [], requiredStaffContext: null, loadingRequiredStaff: false, appendixCValues: null, executionDeadlineDays: 2 });

  // מודל גלובלי
  const [modal, setModal] = useState({
      isOpen: false,
      type: 'info' as 'success' | 'error' | 'info' | 'confirm',
      title: '',
      message: '',
      onConfirm: undefined as (() => void) | undefined
  });

  const showModal = (type: 'success' | 'error' | 'info' | 'confirm', title: string, msg: string, onConfirm?: () => void) => 
      setModal({ isOpen: true, type, title, message: msg, onConfirm });
  const closeStatusDialog = () =>
    setStatusDialog({
      isOpen: false,
      status: null,
      note: '',
      requiredStaffRows: [],
      assignmentRows: [],
      requiredStaffContext: null,
      loadingRequiredStaff: false,
      appendixCValues: null,
      executionDeadlineDays: 2,
    });

  // 2. טעינת הנתונים
  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;

        // בדיקת הרשאות (רק למנהלים)
        const isManager = isManagerUser(user, profile);
        
        if (profile && !isManager) {
             router.push('/dashboard');
             return;
        }

        let tripData: TripRecord | null = null;
        const tripRes = await supabase
          .from('trips')
          .select('id, user_id, name, branch, coordinator_name, start_date, status, details, safety_assignee_id, safety_assigned_at, safety_assigned_by')
          .eq('id', id)
          .single();
        if (tripRes.error && /safety_assignee_id|safety_assigned_at|safety_assigned_by/i.test(tripRes.error.message)) {
          const fallback = await supabase
            .from('trips')
            .select('id, user_id, name, branch, coordinator_name, start_date, status, details')
            .eq('id', id)
            .single();
          if (fallback.data) {
            tripData = {
              ...fallback.data,
              safety_assignee_id: null,
              safety_assigned_at: null,
              safety_assigned_by: null,
            } as TripRecord;
          }
        } else {
          tripData = (tripRes.data || null) as TripRecord | null;
        }
        if (!tripData) {
            router.push('/manager/approvals'); 
            return; 
        }
        setTrip(tripData);

        if (tripData?.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, avatar_url, role, department')
              .eq('id', tripData.user_id)
              .single();
            setOwnerProfile(profileData);
        }

        const { data: members } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("role", ["safety_admin", "admin", "secretary"]);
        const normalizedMembers = (members || []).map((m) => ({
          id: String(m.id),
          full_name: m.full_name as string | null,
        }));
        setTeamMembers(normalizedMembers);
        if (tripData.safety_assignee_id) {
          const matched = normalizedMembers.find((m) => m.id === tripData.safety_assignee_id);
          setAssigneeName(matched?.full_name || "לא ידוע");
        } else {
          setAssigneeName("");
        }

        const { data: events } = await supabase
          .from("trip_assignment_events")
          .select("id, created_at, assigned_by, assigned_to, assigned_from")
          .eq("trip_id", id)
          .order("created_at", { ascending: false });
        setAssignmentHistory((events || []) as Array<{ id: string; created_at: string; assigned_by: string; assigned_to: string | null; assigned_from: string | null }>);
        setDataLoading(false);
    };
    
    if (!userLoading && user) {
        fetchData();
    }
  }, [id, router, user, userLoading, profile]);

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
      setStatusDialog({
        isOpen: true,
        status: newStatus,
        note: '',
        requiredStaffRows: [],
        assignmentRows: [],
        requiredStaffContext: null,
        loadingRequiredStaff: newStatus === 'approved',
        appendixCValues: null,
        executionDeadlineDays: 2,
      });
      if (newStatus !== 'approved' || !trip) return;
      try {
        const res = await fetch(`/api/trips/${trip.id}/required-staff`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));
        const approvedRows = Array.isArray(payload.approvedRows) && payload.approvedRows.length ? payload.approvedRows : payload.preview?.rows;
        setStatusDialog((prev) => ({
          ...prev,
          requiredStaffRows: Array.isArray(approvedRows) ? approvedRows : [],
          assignmentRows: Array.isArray(payload.preview?.assignmentRows) ? payload.preview.assignmentRows : [],
          requiredStaffContext: payload.preview?.context || null,
          loadingRequiredStaff: false,
        }));
      } catch {
        setStatusDialog((prev) => ({ ...prev, loadingRequiredStaff: false }));
      }
  };

  const submitStatusUpdate = async () => {
    if (!trip || !statusDialog.status) return;
    const isRejected = statusDialog.status === 'rejected';
    const trimmedNote = statusDialog.note.trim();
    if (isRejected && !trimmedNote) {
      showModal('error', 'נדרשת סיבת דחייה', 'כדי לדחות טיול יש להזין סיבת דחייה.');
      return;
    }
    if (!isRejected && !statusDialog.appendixCValues?.safetyOfficerSignature) {
      showModal('error', 'חתימה נדרשת', 'יש לחתום על כתב המינוי לפני אישור הטיול.');
      return;
    }

    setStatusDialog((prev) => ({ ...prev, isOpen: false }));
    setProcessing(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusDialog.status,
          note: trimmedNote || null,
          requiredStaffPlan: statusDialog.status === 'approved' ? statusDialog.requiredStaffRows : undefined,
          assignmentPlan: statusDialog.status === 'approved' ? statusDialog.assignmentRows : undefined,
          appendixCFormData: statusDialog.status === 'approved' ? statusDialog.appendixCValues : undefined,
          executionDeadlineDays: statusDialog.status === 'approved' ? statusDialog.executionDeadlineDays : undefined,
        }),
      });
      await res.json();

      if (!res.ok) {
        showModal('error', 'שגיאה', 'שגיאה בעדכון הסטטוס');
        return;
      }

      setTrip({ ...trip, status: statusDialog.status });
      showModal(
        'success',
        'בוצע',
        statusDialog.status === 'rejected'
          ? 'הטיול נדחה.'
          : 'הטיול אושר לפרסום ותכנון!',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleAssign = async (assigneeId: string | null) => {
    if (!trip) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showModal("error", "שגיאה בשיוך", payload?.error || "לא ניתן לעדכן שיוך");
        return;
      }
      const nextName = assigneeId
        ? teamMembers.find((m) => m.id === assigneeId)?.full_name || "לא ידוע"
        : "";
      setAssigneeName(nextName);
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              safety_assignee_id: assigneeId,
              safety_assigned_at: assigneeId ? new Date().toISOString() : null,
              safety_assigned_by: user?.id || null,
            }
          : prev,
      );
      setAssignmentHistory((prev) => [
        {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          assigned_by: user?.id || "",
          assigned_to: assigneeId,
          assigned_from: trip.safety_assignee_id || null,
        },
        ...prev,
      ]);
      showModal("success", "עודכן", assigneeId ? "הטיול שויך בהצלחה." : "שיוך הטיול בוטל.");
    } finally {
      setAssigning(false);
    }
  };

  const appendixCInitialValues = useMemo(() => {
    if (!trip) return {};
    const details = (trip.details || {}) as Record<string, string | undefined | Array<Record<string, string>>>;
    return buildAppendixCInitialValues({
      name: trip.name,
      branch: trip.branch,
      department: (trip as { department?: string }).department || (details.department as string | undefined),
      coordinator_name: trip.coordinator_name,
      start_date: trip.start_date,
      details: {
        endDate: details.endDate as string | undefined,
        gradeFrom: details.gradeFrom as string | undefined,
        gradeTo: details.gradeTo as string | undefined,
        coordName: details.coordName as string | undefined,
        coordPhone: details.coordPhone as string | undefined,
        timeline: details.timeline as Array<{ finalLocation?: string; locationValue?: string; otherDetail?: string }> | undefined,
      },
    });
  }, [trip]);

  const appendixCGender = useMemo(() => {
    const details = (trip?.details || {}) as Record<string, unknown>;
    const dept = (trip as { department?: string })?.department || (details.department as string | undefined);
    return getLanguageGender(dept);
  }, [trip]);

  // בדיקת טעינה משולבת
  if (userLoading || dataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-cyan" size={40}/></div>;
  if (!trip) return null;

  const canResolveSafetyStatus = trip.status === "pending";
  const tripStatusLabel = SAFETY_TRIP_STATUS_LABELS[trip.status] || trip.status;

  return (
    <div className={`min-h-screen bg-surface-base font-sans text-text-primary ${canResolveSafetyStatus ? "pb-32" : "pb-8"}`} dir="rtl">
      
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
        onConfirm={modal.onConfirm} 
      />
      {statusDialog.isOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeStatusDialog}
          />
          <div className="relative flex w-full max-w-4xl max-h-[min(90dvh,calc(100vh-2rem))] flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5">
            <h3 className="text-lg font-black text-gray-800 mb-2">
              {statusDialog.status === 'rejected' ? 'דחיית טיול' : 'אישור לפרסום ותכנון'}
            </h3>
            <p className="text-xs text-gray-500">
              {statusDialog.status === 'rejected'
                ? 'יש להזין סיבת דחייה שתישלח לרכז.'
                : 'אפשר להוסיף הערה שתצורף לעדכון לרכז.'}
            </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <textarea
              className="w-full min-h-[110px] rounded-xl border border-gray-200 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
              placeholder={statusDialog.status === 'rejected' ? 'סיבת הדחייה...' : 'הערה (לא חובה)...'}
              value={statusDialog.note}
              onChange={(e) => setStatusDialog((prev) => ({ ...prev, note: e.target.value }))}
            />
            {statusDialog.status === 'approved' && trip ? (
              <TripComplianceApprovalBanner tripId={trip.id} />
            ) : null}
            {statusDialog.status === 'approved' ? (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-cyan-950">מצבת צוות מינימלית לתכנון</h4>
                    <p className="mt-1 text-xs font-bold text-cyan-800">
                      מחלקת מפעלים/בטיחות יכולה לאשר, להפחית או להוסיף תקנים לפני פתיחת התכנון.
                    </p>
                  </div>
                  {statusDialog.requiredStaffContext ? (
                    <div
                      className="max-w-full rounded-2xl bg-white px-3 py-2 text-xs font-black leading-relaxed text-cyan-900 shadow-sm"
                      title="חישוב אוטובוסים לפי סה״כ מטיילים (כולל צוות) כשמוגדר בטיול"
                    >
                      {formatStaffPlanningContextSummary(statusDialog.requiredStaffContext)}
                    </div>
                  ) : null}
                </div>

                {statusDialog.loadingRequiredStaff ? (
                  <div className="flex h-36 items-center justify-center">
                    <Loader2 className="animate-spin text-brand-cyan" size={28} />
                  </div>
                ) : (
                  <>
                  <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-cyan-100 bg-white">
                    <table className="w-full min-w-[760px] text-right text-xs">
                      <thead className="sticky top-0 bg-cyan-100 text-cyan-950">
                        <tr>
                          <th className="p-2 font-black">תפקיד</th>
                          <th className="p-2 font-black">מקור הדרישה</th>
                          <th className="w-24 p-2 font-black">מחושב</th>
                          <th className="w-28 p-2 font-black">מאושר</th>
                          <th className="w-32 p-2 font-black">מיזוג</th>
                          <th className="w-16 p-2 font-black">פעיל</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusDialog.requiredStaffRows.map((row, index) => (
                          <tr key={`${row.role_key}-${index}`} className="border-t border-cyan-50">
                            <td className="p-2 font-black text-gray-800">{row.role_label}</td>
                            <td className="p-2 font-bold text-gray-500">{row.source_summary}</td>
                            <td className="p-2 font-black text-gray-700">{row.required_quantity}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={0}
                                value={row.approved_quantity}
                                onChange={(event) => {
                                  const value = Math.max(0, Number(event.target.value || 0));
                                  setStatusDialog((prev) => ({
                                    ...prev,
                                    requiredStaffRows: prev.requiredStaffRows.map((item, rowIndex) =>
                                      rowIndex === index ? { ...item, approved_quantity: value, status: value > 0 ? 'approved' : 'removed' } : item,
                                    ),
                                  }));
                                }}
                                className="h-9 w-20 rounded-xl border border-gray-200 px-2 text-center font-black outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                              />
                            </td>
                            <td className="p-2">
                              <span className={`rounded-full px-2 py-1 font-black ${row.merge_policy === 'exclusive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {row.merge_policy === 'exclusive' ? 'בלעדי' : 'ניתן למיזוג'}
                              </span>
                            </td>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={row.status !== 'removed'}
                                onChange={(event) => {
                                  setStatusDialog((prev) => ({
                                    ...prev,
                                    requiredStaffRows: prev.requiredStaffRows.map((item, rowIndex) =>
                                      rowIndex === index
                                        ? { ...item, status: event.target.checked ? 'approved' : 'removed', approved_quantity: event.target.checked ? Math.max(1, item.approved_quantity || item.required_quantity) : 0 }
                                        : item,
                                    ),
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-cyan-100 bg-cyan-50/60">
                          <td colSpan={6} className="p-2">
                            <button
                              type="button"
                              onClick={() =>
                                setStatusDialog((prev) => ({
                                  ...prev,
                                  requiredStaffRows: [
                                    ...prev.requiredStaffRows,
                                    {
                                      role_key: `manual_role_${Date.now()}`,
                                      role_label: 'תפקיד נוסף',
                                      source_summary: 'נוסף ידנית באישור מחלקת מפעלים/בטיחות',
                                      required_quantity: 1,
                                      approved_quantity: 1,
                                      merge_policy: 'mergeable',
                                      status: 'approved',
                                      notes: '',
                                      order_index: prev.requiredStaffRows.length,
                                    },
                                  ],
                                }))
                              }
                              className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-brand-cyan shadow-sm hover:bg-cyan-50"
                            >
                              הוספת תקן ידני
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-white">
                    <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2">
                      <h4 className="text-sm font-black text-emerald-950">שיבוצים שייפתחו בתכנון</h4>
                      <p className="mt-1 text-xs font-bold text-emerald-800">אפשר לערוך את שמות השיבוצים או לבטל שיבוץ לפני פתיחת התכנון.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-right text-xs">
                        <thead className="bg-emerald-100 text-emerald-950">
                          <tr>
                            <th className="p-2 font-black">שם השיבוץ</th>
                            <th className="p-2 font-black">סוג</th>
                            <th className="p-2 font-black">מקור</th>
                            <th className="p-2 font-black">קהל יעד</th>
                            <th className="p-2 font-black">פריטים</th>
                            <th className="w-16 p-2 font-black">פעיל</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statusDialog.assignmentRows.map((row, index) => (
                            <tr key={`${row.assignment_key}-${index}`} className="border-t border-emerald-50">
                              <td className="p-2">
                                <input
                                  value={row.title}
                                  onChange={(event) =>
                                    setStatusDialog((prev) => ({
                                      ...prev,
                                      assignmentRows: prev.assignmentRows.map((item, rowIndex) => (rowIndex === index ? { ...item, title: event.target.value } : item)),
                                    }))
                                  }
                                  className="h-9 w-full rounded-xl border border-gray-200 px-2 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                                />
                              </td>
                              <td className="p-2 font-black text-gray-700">
                                {row.kind === 'buses' ? 'אוטובוסים' : row.kind === 'groups' ? 'קבוצות' : row.kind === 'rooms' ? 'חדרים' : row.custom_kind_label || 'אחר'}
                              </td>
                              <td className="p-2 font-bold text-gray-500">{row.source_summary}</td>
                              <td className="p-2 font-bold text-gray-700">{row.audience === 'both' ? 'חניכים וצוות' : row.audience === 'staff' ? 'צוות' : 'חניכים'}</td>
                              <td className="p-2">
                                <label className="inline-flex items-center gap-1 font-bold text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={row.creates_items}
                                    onChange={(event) =>
                                      setStatusDialog((prev) => ({
                                        ...prev,
                                        assignmentRows: prev.assignmentRows.map((item, rowIndex) => (rowIndex === index ? { ...item, creates_items: event.target.checked } : item)),
                                      }))
                                    }
                                  />
                                  ליצור
                                </label>
                              </td>
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={row.status !== 'removed'}
                                  onChange={(event) =>
                                    setStatusDialog((prev) => ({
                                      ...prev,
                                      assignmentRows: prev.assignmentRows.map((item, rowIndex) => (rowIndex === index ? { ...item, status: event.target.checked ? 'approved' : 'removed' } : item)),
                                    }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-emerald-100 bg-emerald-50/60">
                            <td colSpan={6} className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusDialog((prev) => ({
                                    ...prev,
                                    assignmentRows: [
                                      ...prev.assignmentRows,
                                      {
                                        assignment_key: `manual_assignment_${Date.now()}`,
                                        kind: 'other',
                                        title: 'שיבוץ נוסף',
                                        custom_kind_label: 'אחר',
                                        source_summary: 'נוסף ידנית באישור מחלקת מפעלים/בטיחות',
                                        audience: 'both',
                                        creates_items: false,
                                        status: 'approved',
                                        order_index: prev.assignmentRows.length,
                                      },
                                    ],
                                  }))
                                }
                                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-50"
                              >
                                הוספת שיבוץ ידני
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>
                )}
              </div>
            ) : null}
            {statusDialog.status === 'approved' && trip ? (
              <>
              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                <h4 className="text-sm font-black text-amber-950">מועד בחינה לאישור ביצוע</h4>
                <p className="mt-1 text-xs font-bold text-amber-800">בחר כמה ימים נותנים לרכז להשלים את כל ההיערכות לפני בחינת הטיול לאישור ביצוע.</p>
                <div className="mt-3 flex gap-3">
                  <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition-colors ${statusDialog.executionDeadlineDays === 1 ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="deadlineDays"
                      checked={statusDialog.executionDeadlineDays === 1}
                      onChange={() => setStatusDialog((prev) => ({ ...prev, executionDeadlineDays: 1 }))}
                      className="sr-only"
                    />
                    ערב אחד
                  </label>
                  <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition-colors ${statusDialog.executionDeadlineDays === 2 ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="deadlineDays"
                      checked={statusDialog.executionDeadlineDays === 2}
                      onChange={() => setStatusDialog((prev) => ({ ...prev, executionDeadlineDays: 2 }))}
                      className="sr-only"
                    />
                    שני ערבים
                  </label>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                <h4 className="text-sm font-black text-indigo-950">כתב מינוי לאחראי הטיול (נספח ג׳)</h4>
                <p className="mt-1 text-xs font-bold text-indigo-800">יש לחתום על כתב המינוי כדי לאשר את הטיול. המסמך יישלח לרכז ולמזכ״לית לחתימה נוספת.</p>
                <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-xl border border-indigo-100 bg-white p-2">
                  <AppendixCForm
                    isEditable
                    initialValues={appendixCInitialValues}
                    languageGender={appendixCGender}
                    canSignSafetySignature
                    canSignSignature={false}
                    onValuesChange={(values) => setStatusDialog((prev) => ({ ...prev, appendixCValues: values }))}
                    className="scale-[0.85] origin-top"
                  />
                </div>
              </div>
              </>
            ) : null}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button
                variant="outline"
                onClick={closeStatusDialog}
                className="h-10 px-4 text-xs rounded-lg"
              >
                ביטול
              </Button>
              <Button
                variant={statusDialog.status === 'rejected' ? 'danger' : 'primary'}
                onClick={() => void submitStatusUpdate()}
                isLoading={processing}
                className="h-10 px-4 text-xs rounded-lg"
              >
                {statusDialog.status === 'rejected' ? 'דחה טיול' : 'אשר לפרסום ותכנון'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="bg-brand-dark text-white shadow-md sticky top-0 z-30 border-b-4 border-brand-cyan">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-full transition-colors"><ArrowRight size={20} /></button>
            <div>
                <h1 className="font-bold text-lg">{trip.name}</h1>
                <p className="text-xs text-gray-400">אישור ובקרה • {trip.branch}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="mb-4 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 font-bold">מטפל נוכחי</div>
            <div className="text-sm font-black text-gray-800">
              {trip.safety_assignee_id ? assigneeName || "לא ידוע" : "לא משויך"}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowAssignmentHistory((prev) => !prev)}
              className="h-10 min-w-[110px] px-3 text-xs rounded-lg whitespace-nowrap"
            >
              <History size={14} />
              היסטוריה
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleAssign(user?.id || null)}
              isLoading={assigning}
              className="h-10 min-w-[110px] px-3 text-xs rounded-lg whitespace-nowrap"
            >
              שייך אליי
            </Button>
            <StyledSelect
              className="min-w-[180px]"
              value={transferTarget}
              onChange={(next) => setTransferTarget(next)}
              placeholder="העבר למטפל אחר..."
              options={teamMembers.map((m) => ({
                value: m.id,
                label: m.full_name || m.id,
              }))}
            />
            <Button
              variant="outline"
              onClick={() => void handleAssign(transferTarget || null)}
              disabled={!transferTarget}
              isLoading={assigning}
              className="h-10 min-w-[90px] px-3 text-xs rounded-lg whitespace-nowrap"
            >
              העבר
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleAssign(null)}
              isLoading={assigning}
              className="h-10 min-w-[110px] px-3 text-xs rounded-lg whitespace-nowrap"
            >
              בטל שיוך
            </Button>
          </div>
          {showAssignmentHistory ? (
            <div className="w-full mt-2 bg-gray-50 rounded-xl border border-gray-100 p-3">
              <div className="text-xs font-bold text-gray-500 mb-2">היסטוריית שיוכים</div>
              {assignmentHistory.length === 0 ? (
                <div className="text-xs text-gray-400">אין עדיין היסטוריית שיוך לטיול זה.</div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {assignmentHistory.slice(0, 8).map((ev) => {
                    const byName = teamMembers.find((m) => m.id === ev.assigned_by)?.full_name || "חבר צוות";
                    const toName = ev.assigned_to
                      ? teamMembers.find((m) => m.id === ev.assigned_to)?.full_name || "לא ידוע"
                      : "בוטל שיוך";
                    return (
                      <div key={ev.id} className="text-xs text-gray-700 border border-gray-100 rounded-lg p-2 bg-white">
                        <span className="font-bold">{byName}</span> שייך ל־<span className="font-bold">{toName}</span>
                        <span className="text-gray-400 mr-2">
                          {new Date(ev.created_at).toLocaleString("he-IL")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <TripDetailsView 
            trip={trip}
            profile={ownerProfile}
            isEditable={false} 
            isPublic={false}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm font-bold text-gray-600">
              {canResolveSafetyStatus ? (
                <span className="text-gray-500">ניהול סטטוס עבור טיול #{trip.id.substring(0, 8)}…</span>
              ) : (
                <span className="text-gray-800">{tripStatusLabel}</span>
              )}
            </div>
            {canResolveSafetyStatus ? (
              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  variant="danger"
                  onClick={() => void handleStatusUpdate("rejected")}
                  isLoading={processing}
                  icon={<X size={18} />}
                  className="flex-1 md:w-auto h-12"
                >
                  דחה טיול
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleStatusUpdate("approved")}
                  isLoading={processing}
                  icon={<Check size={18} />}
                  className="flex-1 md:w-auto h-12"
                >
                  אשר לפרסום ותכנון
                </Button>
              </div>
            ) : (
              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                {trip.status === "approved" || trip.status === "approved_for_execution" ? (
                  <Link
                    href={`/manager/approvals/${trip.id}/plan`}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-cyan px-4 text-sm font-black text-white shadow-sm hover:bg-cyan-600 md:flex-none md:min-w-[140px]"
                  >
                    מעבר לתכנון
                  </Link>
                ) : null}
                <Link
                  href="/manager/approvals"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 hover:bg-gray-50 md:flex-none md:min-w-[120px]"
                >
                  חזרה לרשימה
                </Link>
              </div>
            )}
         </div>
      </div>
    </div>
  )
}