"use client"

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowRight,
  Check,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  X as XIcon,
} from 'lucide-react'
import { TripDetailsView } from '@/components/TripDetailsView'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/hooks/useUser'
import { isDeptReviewOfficer } from '@/lib/auth'
import { getTripStatusConfig, normalizeTripStatus } from '@/lib/tripStatus'
import type { AppProfile, TripRecord } from '@/lib/types'

type DeptAction = 'return' | 'forward'

const ACTION_LABELS: Record<DeptAction, { title: string; submit: string; placeholder: string }> = {
  return: {
    title: 'החזרה להערות',
    submit: 'שלח חזרה לרכז',
    placeholder: 'פרט/י את ההערות שיועברו לרכז...',
  },
  forward: {
    title: 'העברה לאישור מחלקת הבטיחות',
    submit: 'העבר לאישור בטיחות',
    placeholder: 'הערות אופציונליות עבור מחלקת הבטיחות (לא חובה)...',
  },
}

export default function DeptReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser('/')

  const [trip, setTrip] = useState<TripRecord | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<AppProfile | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    action: DeptAction
  }>({ isOpen: false, action: 'return' })
  const [notes, setNotes] = useState('')

  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'info' | 'confirm',
    title: '',
    message: '',
  })

  const showModal = (
    type: 'success' | 'error' | 'info' | 'confirm',
    title: string,
    message: string,
  ) => setModal({ isOpen: true, type, title, message })

  useEffect(() => {
    if (userLoading || !user) return

    const isOfficer = isDeptReviewOfficer(user, profile)
    if (profile && !isOfficer) {
      router.replace('/dashboard')
      return
    }

    const fetchData = async () => {
      const { data: tripData, error } = await supabase
        .from('trips')
        .select(
          'id, user_id, name, branch, department, coordinator_name, start_date, status, details, dept_review_notes, dept_reviewed_at, dept_forwarded_at',
        )
        .eq('id', id)
        .single()

      if (error || !tripData) {
        router.replace('/hq/dept-review')
        return
      }

      if (
        String(profile?.department || '').trim() !== String(tripData.department || '').trim()
      ) {
        router.replace('/hq/dept-review')
        return
      }

      setTrip(tripData as TripRecord)

      if (tripData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role, department')
          .eq('id', tripData.user_id)
          .single()
        setOwnerProfile(profileData)
      }

      setDataLoading(false)
    }

    fetchData()
  }, [id, router, user, userLoading, profile])

  const openAction = (action: DeptAction) => {
    setNotes('')
    setActionDialog({ isOpen: true, action })
  }

  const submitAction = async () => {
    if (!trip) return
    const action = actionDialog.action

    if (action === 'return' && !notes.trim()) {
      showModal('error', 'חסרות הערות', 'יש למלא הערות לפני שמירה.')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/trips/${trip.id}/dept-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'שגיאה בשמירה')

      const newStatus = action === 'return' ? 'returned_for_changes' : 'pending'
      setTrip({
        ...trip,
        status: newStatus,
        dept_review_notes: notes.trim() || trip.dept_review_notes || null,
        dept_reviewed_at: new Date().toISOString(),
        ...(action === 'forward' ? { dept_forwarded_at: new Date().toISOString() } : {}),
      })
      setActionDialog({ isOpen: false, action })
      setNotes('')

      const successMessage =
        action === 'return'
          ? 'הטיול הוחזר לרכז עם ההערות.'
          : 'הטיול הועבר לאישור מחלקת הבטיחות.'
      showModal('success', 'בוצע', successMessage)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      showModal('error', 'שגיאה', message)
    } finally {
      setProcessing(false)
    }
  }

  if (userLoading || dataLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-cyan" size={40} />
      </div>
    )
  }
  if (!trip) return null

  const status = getTripStatusConfig(trip.status)
  const StatusIcon = status.icon
  const normalized = normalizeTripStatus(trip.status)
  const canTakeAction =
    normalized === 'pending_dept_review' && isDeptReviewOfficer(user, profile)

  return (
    <div className="min-h-screen bg-surface-base font-sans text-text-primary pb-32" dir="rtl">
      <Header title="אישור ראשוני - פרטי טיול" />
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      <main className="max-w-[1600px] mx-auto p-6 space-y-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl px-4 py-3 md:px-5 md:py-4 flex items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
              aria-label="חזרה"
            >
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="font-black text-lg md:text-xl text-text-primary">{trip.name}</h1>
              <p className="text-xs md:text-sm text-text-muted">
                אישור ראשוני • {trip.branch || 'ללא סניף'} • {trip.department || 'ללא מחלקה'}
              </p>
            </div>
          </div>
          <span
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.textCol}`}
          >
            <StatusIcon size={12} /> {status.text}
          </span>
        </div>

        {trip.dept_review_notes && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-orange-700 mb-1">
              הערות אחרונות שניתנו על ידי אחראי המחלקה
            </div>
            <p className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">
              {trip.dept_review_notes}
            </p>
          </div>
        )}

        {!canTakeAction && normalized !== 'pending_dept_review' && (
          <div
            className={`rounded-2xl p-4 flex items-center gap-3 border ${status.bg} ${status.textCol} border-current/10`}
          >
            <StatusIcon size={20} className="shrink-0" />
            <div className="text-sm">
              <div className="font-bold">{status.text}</div>
              {trip.dept_forwarded_at && (
                <div className="text-xs opacity-80 mt-1">
                  הועבר לבטיחות: {new Date(trip.dept_forwarded_at).toLocaleString('he-IL')}
                </div>
              )}
            </div>
          </div>
        )}

        <TripDetailsView trip={trip} profile={ownerProfile} isEditable={false} isPublic={false} />
      </main>

      {canTakeAction && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 font-bold hidden md:block">
              ניהול אישור ראשוני • טיול #{trip.id.substring(0, 8)}...
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => openAction('return')}
                isLoading={processing && actionDialog.action === 'return'}
                icon={<RotateCcw size={18} />}
                className="flex-1 md:w-auto h-12"
              >
                החזר להערות
              </Button>
              <Button
                variant="primary"
                onClick={() => openAction('forward')}
                isLoading={processing && actionDialog.action === 'forward'}
                icon={<ShieldCheck size={18} />}
                className="flex-1 md:w-auto h-12"
              >
                העבר לאישור בטיחות
              </Button>
            </div>
          </div>
        </div>
      )}

      {actionDialog.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => !processing && setActionDialog({ ...actionDialog, isOpen: false })}
        >
          <div
            className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                {actionDialog.action === 'return' && <RotateCcw size={20} className="text-orange-500" />}
                {actionDialog.action === 'forward' && <ShieldCheck size={20} className="text-brand-cyan" />}
                {ACTION_LABELS[actionDialog.action].title}
              </h3>
              <button
                onClick={() => !processing && setActionDialog({ ...actionDialog, isOpen: false })}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
                aria-label="סגור"
              >
                <XIcon size={18} />
              </button>
            </div>

            <textarea
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-4 outline-none focus:border-brand-cyan min-h-[120px] resize-none"
              placeholder={ACTION_LABELS[actionDialog.action].placeholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={processing}
            />

            <div className="flex gap-3">
              <button
                onClick={() => !processing && setActionDialog({ ...actionDialog, isOpen: false })}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 disabled:opacity-50"
                disabled={processing}
              >
                ביטול
              </button>
              <button
                onClick={submitAction}
                disabled={processing}
                className={`flex-1 py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                  actionDialog.action === 'return'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-brand-cyan hover:bg-cyan-600'
                }`}
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : actionDialog.action === 'forward' ? (
                  <Send size={16} />
                ) : (
                  <Check size={16} />
                )}
                {ACTION_LABELS[actionDialog.action].submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
