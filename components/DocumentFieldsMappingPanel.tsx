'use client'

import React, { useMemo, useState } from 'react'
import { getDocumentFieldMapping } from '@/lib/tripDocumentAutofill'
import { documentCatalog } from '@/lib/tripDocumentsCatalog'
import { ClipboardList } from 'lucide-react'

const requiredNotesStorageKey = 'trip-document-field-required-notes'
const essentialContactDocumentKey = 'essential-contact-list'
type RequiredFieldDecision = { status: 'required' | 'optional' | 'conditional' | ''; condition?: string }
const requiredStatusOptions: Array<{ value: RequiredFieldDecision['status']; label: string }> = [
  { value: 'required', label: 'חובה' },
  { value: 'optional', label: 'לא חובה' },
  { value: 'conditional', label: 'תלוי' },
]

const normalizeRequiredDecisions = (raw: unknown): Record<string, RequiredFieldDecision> => {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => {
      if (typeof value === 'string') {
        if (value === 'חובה') return [key, { status: 'required' }]
        if (value === 'לא חובה') return [key, { status: 'optional' }]
        if (value.startsWith('תלוי')) return [key, { status: 'conditional', condition: value.replace(/^תלוי:?\s*/, '') }]
        return [key, { status: '', condition: value }]
      }
      if (!value || typeof value !== 'object') return [key, { status: '' }]
      const record = value as Partial<RequiredFieldDecision>
      return [
        key,
        {
          status: record.status === 'required' || record.status === 'optional' || record.status === 'conditional' ? record.status : '',
          condition: typeof record.condition === 'string' ? record.condition : '',
        },
      ]
    }),
  )
}

export function DocumentFieldsMappingPanel() {
  const [activeDocumentKey, setActiveDocumentKey] = useState(documentCatalog[0]?.key || '')
  const [requiredDecisions, setRequiredDecisions] = useState<Record<string, RequiredFieldDecision>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = window.localStorage.getItem(requiredNotesStorageKey)
      return saved ? normalizeRequiredDecisions(JSON.parse(saved)) : {}
    } catch {
      return {}
    }
  })

  const documents = useMemo(
    () =>
      documentCatalog.map((document) => ({
        ...document,
        fields: getDocumentFieldMapping(document).map((field, index) => ({
          key: `${document.key}:${field.label}:${index}`,
          fieldLabel: field.label,
          source: field.source,
          isMissingSource: field.isMissingSource,
        })),
      })),
    [],
  )
  const activeDocument = documents.find((document) => document.key === activeDocumentKey) || documents[0]
  const requiredSummary = useMemo(
    () =>
      documents.flatMap((document) =>
        document.fields
          .map((field) => ({
            key: field.key,
            category: document.category,
            title: document.title,
            fieldLabel: field.fieldLabel,
            decision: requiredDecisions[field.key],
          }))
          .filter((item) => item.decision?.status),
      ),
    [documents, requiredDecisions],
  )
  const decisionLabel = (status: RequiredFieldDecision['status']) => requiredStatusOptions.find((option) => option.value === status)?.label || ''

  const updateRequiredDecision = (key: string, patch: Partial<RequiredFieldDecision>) => {
    setRequiredDecisions((prev) => {
      const current = prev[key] || { status: '' }
      const nextDecision = { ...current, ...patch }
      const next = { ...prev, [key]: nextDecision }
      window.localStorage.setItem(requiredNotesStorageKey, JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="rounded-3xl border border-border-subtle bg-white shadow-sm">
      <div className="border-b border-border-subtle p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-800">מיפוי שדות מסמכי תיק הטיול</h2>
            <p className="mt-1 text-sm text-gray-600">לכל טופס מוצגים כל השדות שמופו, מקור ההזנה שלהם, ושדות שאין להם עדיין מקור מסומנים כ־חסר.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-2">
          {documents.map((document) => {
            const missingCount = document.fields.filter((field) => field.isMissingSource).length
            const isActive = document.key === activeDocument?.key
            return (
              <button
                key={document.key}
                type="button"
                onClick={() => setActiveDocumentKey(document.key)}
                className={`w-full rounded-2xl border px-3 py-3 text-right transition ${
                  isActive ? 'border-cyan-200 bg-white shadow-sm ring-2 ring-cyan-50' : 'border-transparent hover:border-gray-200 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold text-gray-500">{document.category}</div>
                <div className="mt-1 text-sm font-black text-gray-800">{document.title}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>{document.fields.length} שדות</span>
                  {document.key === essentialContactDocumentKey ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-black text-cyan-800">חדש</span> : null}
                  {missingCount ? <span className="rounded-full bg-red-50 px-2 py-0.5 font-black text-red-700">{missingCount} חסרים</span> : null}
                </div>
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <div className="border-b border-gray-100 bg-white px-5 py-4">
            <div className="text-xs font-bold text-gray-500">{activeDocument?.category}</div>
            <h3 className="mt-1 text-lg font-black text-gray-800">{activeDocument?.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{activeDocument?.description}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0 text-right text-sm">
              <thead className="sticky top-0 z-10 bg-gray-200 text-xs font-black text-gray-700">
                <tr>
                  <th className="border-b border-gray-300 px-4 py-3">שדה בטופס</th>
                  <th className="border-b border-gray-300 px-4 py-3">מקור הזנה</th>
                  <th className="border-b border-gray-300 px-4 py-3">חובה?</th>
                </tr>
              </thead>
              <tbody>
                {(activeDocument?.fields || []).map((row, index) => (
                  <tr key={row.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700">{row.fieldLabel}</td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top">
                      <span
                        className={
                          row.isMissingSource
                            ? 'inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700'
                            : 'text-gray-700'
                        }
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top">
                      <div className="min-w-64 space-y-2">
                        <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
                          {requiredStatusOptions.map((option) => {
                            const decision = requiredDecisions[row.key] || { status: '' }
                            const isActive = decision.status === option.value
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => updateRequiredDecision(row.key, { status: isActive ? '' : option.value })}
                                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                        {requiredDecisions[row.key]?.status === 'conditional' ? (
                          <input
                            value={requiredDecisions[row.key]?.condition || ''}
                            onChange={(event) => updateRequiredDecision(row.key, { condition: event.target.value })}
                            placeholder="במה זה תלוי?"
                            className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle p-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50">
          <div className="border-b border-gray-100 bg-white px-5 py-4">
            <h3 className="text-lg font-black text-gray-800">סיכום מיפוי חובה</h3>
            <p className="mt-1 text-sm text-gray-600">כאן מרוכזות כל הבחירות שסומנו במסמכים, כולל תנאים שנכתבו בשדות תלויים.</p>
          </div>

          {requiredSummary.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full border-separate border-spacing-0 text-right text-sm">
                <thead className="bg-gray-200 text-xs font-black text-gray-700">
                  <tr>
                    <th className="border-b border-gray-300 px-4 py-3">קטגוריה</th>
                    <th className="border-b border-gray-300 px-4 py-3">טופס</th>
                    <th className="border-b border-gray-300 px-4 py-3">שדה</th>
                    <th className="border-b border-gray-300 px-4 py-3">הגדרה</th>
                    <th className="border-b border-gray-300 px-4 py-3">תנאי</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredSummary.map((item, index) => {
                    const status = item.decision?.status || ''
                    return (
                      <tr key={item.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                        <td className="border-b border-gray-100 px-4 py-3 text-xs font-bold text-gray-500">{item.category}</td>
                        <td className="border-b border-gray-100 px-4 py-3 font-black text-gray-800">{item.title}</td>
                        <td className="border-b border-gray-100 px-4 py-3 text-gray-700">{item.fieldLabel}</td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                              status === 'required'
                                ? 'bg-red-50 text-red-700'
                                : status === 'conditional'
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {decisionLabel(status)}
                          </span>
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3 text-gray-700">{status === 'conditional' ? item.decision?.condition || 'לא הוגדר תנאי' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm font-bold text-gray-500">עדיין לא סומנו שדות חובה, לא חובה או תלויים.</div>
          )}
        </div>
      </div>
    </section>
  )
}

export default DocumentFieldsMappingPanel
