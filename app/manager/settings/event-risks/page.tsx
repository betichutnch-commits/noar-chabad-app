'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants'

type EventRiskRow = {
  id?: string
  riskText: string
  riskLevel: number | null
  likelihood: number | null
  orderIndex: number
}

type ApiRiskRow = {
  id?: string
  category_key: string
  category_label: string
  event_label: string
  risk_text: string
  risk_level: number | null
  likelihood: number | null
  order_index: number
}

const riskLevels = [1, 2, 3, 4, 5]

const riskLevelClass = (level: number, selected: boolean) => {
  const tones: Record<number, { selected: string; idle: string }> = {
    1: { selected: 'bg-emerald-500 text-white border-emerald-500', idle: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    2: { selected: 'bg-lime-500 text-white border-lime-500', idle: 'bg-lime-50 text-lime-700 border-lime-200' },
    3: { selected: 'bg-amber-400 text-white border-amber-400', idle: 'bg-amber-50 text-amber-700 border-amber-200' },
    4: { selected: 'bg-orange-500 text-white border-orange-500', idle: 'bg-orange-50 text-orange-700 border-orange-200' },
    5: { selected: 'bg-red-500 text-white border-red-500', idle: 'bg-red-50 text-red-700 border-red-200' },
  }
  return selected ? tones[level].selected : tones[level].idle
}

export default function EventRisksSettingsPage() {
  const router = useRouter()
  const events = useMemo(
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
  )
  const [activeEventKey, setActiveEventKey] = useState(events[0]?.key || '')
  const [risksByEvent, setRisksByEvent] = useState<Record<string, EventRiskRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [dirtyEvents, setDirtyEvents] = useState<Record<string, boolean>>({})
  const hydratedRef = useRef(false)
  const autoSaveTimerRef = useRef<number | null>(null)
  const activeEvent = events.find((event) => event.key === activeEventKey) || events[0]
  const activeRisks = activeEvent ? risksByEvent[activeEvent.key] || [] : []

  useEffect(() => {
    let cancelled = false
    async function loadRisks() {
      setLoading(true)
      const res = await fetch('/api/manager/settings/event-risks', { cache: 'no-store' })
      const payload = await res.json().catch(() => ({}))
      if (cancelled) return
      const next: Record<string, EventRiskRow[]> = {}
      const apiRows = Array.isArray(payload.risks) ? (payload.risks as ApiRiskRow[]) : []
      for (const row of apiRows) {
        const key = `${row.category_key}:${row.event_label}`
        if (!next[key]) next[key] = []
        next[key].push({
          id: row.id,
          riskText: row.risk_text || '',
          riskLevel: row.risk_level ?? null,
          likelihood: row.likelihood ?? null,
          orderIndex: row.order_index ?? next[key].length,
        })
      }
      setRisksByEvent(next)
      setLoading(false)
      hydratedRef.current = true
    }
    void loadRisks()
    return () => {
      cancelled = true
    }
  }, [])

  const updateRisks = (eventKey: string, risks: EventRiskRow[]) => {
    setRisksByEvent((prev) => ({ ...prev, [eventKey]: risks.map((risk, index) => ({ ...risk, orderIndex: index })) }))
    if (hydratedRef.current) {
      setDirtyEvents((prev) => ({ ...prev, [eventKey]: true }))
      setMessage('')
    }
  }

  const saveEvent = useCallback(async (eventKey: string, options: { showMessage?: boolean } = {}) => {
    const event = events.find((item) => item.key === eventKey)
    if (!event) return
    const risks = risksByEvent[eventKey] || []
    setSavingKey(event.key)
    setMessage('')
    const res = await fetch('/api/manager/settings/event-risks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryKey: event.categoryKey,
        categoryLabel: event.categoryLabel,
        eventLabel: event.eventLabel,
        risks,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setSavingKey(null)
    if (!res.ok) {
      setMessage(String(payload.error || 'שמירת הסיכונים נכשלה'))
      return
    }
    setDirtyEvents((prev) => {
      const next = { ...prev }
      delete next[eventKey]
      return next
    })
    if (options.showMessage) setMessage(`נשמר. עודכנו ${Number(payload.updatedRows || 0)} שורות לו״ז קיימות.`)
  }, [events, risksByEvent])

  const saveActiveEvent = () => {
    if (!activeEvent) return
    void saveEvent(activeEvent.key, { showMessage: true })
  }

  useEffect(() => {
    if (!hydratedRef.current) return
    const dirtyKeys = Object.keys(dirtyEvents)
    if (!dirtyKeys.length) return
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(() => {
      void Promise.all(dirtyKeys.map((eventKey) => saveEvent(eventKey)))
    }, 900)
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    }
  }, [dirtyEvents, saveEvent])

  const activeDirty = Boolean(activeEvent && dirtyEvents[activeEvent.key])

  return (
    <>
      <ManagerHeader title="סיכוני ברירת מחדל לפי התרחשות" />
      <div className="mx-auto max-w-7xl animate-fadeIn space-y-4 p-4 pb-32 md:p-8">
        <Button variant="outline" onClick={() => router.push('/manager/settings')} className="px-4">
          <ArrowRight size={16} />
          חזרה להגדרות מערכת
        </Button>

        <section className="rounded-3xl border border-border-subtle bg-white shadow-sm">
          <div className="border-b border-border-subtle p-5">
            <h2 className="text-xl font-black text-gray-800">הגדרת סיכונים אוטומטיים</h2>
            <p className="mt-1 text-sm text-gray-600">בחר התרחשות, הגדר סיכונים ודירוג, וכל שורת לו״ז עם אותה התרחשות תקבל אותם כברירת מחדל.</p>
          </div>

          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <Loader2 className="animate-spin text-brand-cyan" size={34} />
            </div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="max-h-[72vh] space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-2">
                {events.map((event) => {
                  const count = risksByEvent[event.key]?.filter((risk) => risk.riskText.trim()).length || 0
                  const active = event.key === activeEvent?.key
                  return (
                    <button
                      key={event.key}
                      type="button"
                      onClick={() => {
                        setActiveEventKey(event.key)
                        setMessage('')
                      }}
                      className={`w-full rounded-2xl border px-3 py-3 text-right transition ${
                        active ? 'border-orange-200 bg-white shadow-sm ring-2 ring-orange-50' : 'border-transparent hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-500">{event.categoryLabel}</div>
                      <div className="mt-1 text-sm font-black text-gray-800">{event.eventLabel}</div>
                      <div className="mt-2 text-xs font-bold text-gray-500">{count ? `${count} סיכונים` : 'ללא סיכונים'}</div>
                    </button>
                  )
                })}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500">{activeEvent?.categoryLabel}</div>
                    <h3 className="mt-1 text-lg font-black text-gray-800">{activeEvent?.eventLabel}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={saveActiveEvent}
                      disabled={savingKey === activeEvent?.key}
                      className={`px-4 ${activeDirty ? 'bg-orange-500 shadow-lg shadow-orange-100 hover:bg-orange-600' : ''}`}
                    >
                      {savingKey === activeEvent?.key ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      שמירה והחלה
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {activeRisks.length ? (
                    activeRisks.map((risk, index) => (
                      <div key={`${activeEvent?.key}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_44px] md:items-start">
                          <textarea
                            value={risk.riskText}
                            onChange={(event) => {
                              const next = [...activeRisks]
                              next[index] = { ...risk, riskText: event.target.value }
                              if (activeEvent) updateRisks(activeEvent.key, next)
                            }}
                            placeholder="כתוב כאן את הסיכון שיופיע בלו״ז"
                            className="min-h-20 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                          />
                          <div>
                            <div className="mb-2 text-xs font-black text-gray-500">דירוג סיכון</div>
                            <div className="flex gap-1">
                              {riskLevels.map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => {
                                    const next = [...activeRisks]
                                    next[index] = { ...risk, riskLevel: risk.riskLevel === level ? null : level }
                                    if (activeEvent) updateRisks(activeEvent.key, next)
                                  }}
                                  className={`h-9 w-9 rounded-xl border text-xs font-black transition ${riskLevelClass(level, risk.riskLevel === level)}`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-black text-gray-500">דירוג שכיחות</div>
                            <div className="flex gap-1">
                              {riskLevels.map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => {
                                    const next = [...activeRisks]
                                    next[index] = { ...risk, likelihood: risk.likelihood === level ? null : level }
                                    if (activeEvent) updateRisks(activeEvent.key, next)
                                  }}
                                  className={`h-9 w-9 rounded-xl border text-xs font-black transition ${riskLevelClass(level, risk.likelihood === level)}`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => activeEvent && updateRisks(activeEvent.key, activeRisks.filter((_, riskIndex) => riskIndex !== index))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label="מחיקת סיכון"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center text-sm font-bold text-gray-500">
                      עדיין לא הוגדרו סיכונים להתרחשות הזו.
                    </div>
                  )}

                  <div className="flex justify-center rounded-2xl border-2 border-dashed border-orange-100 bg-orange-50/40 p-4">
                    <Button
                      variant="outline"
                      onClick={() => activeEvent && updateRisks(activeEvent.key, [...activeRisks, { riskText: '', riskLevel: null, likelihood: null, orderIndex: activeRisks.length }])}
                      className="px-4"
                    >
                      <Plus size={16} />
                      הוספת סיכון
                    </Button>
                  </div>

                  {message ? <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">{message}</div> : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
