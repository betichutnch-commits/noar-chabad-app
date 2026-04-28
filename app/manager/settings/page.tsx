'use client'

import React from 'react'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { PushAdminTestPanel } from '@/components/PushAdminTestPanel'
import { useUser } from '@/hooks/useUser'
import { isManagerUser } from '@/lib/auth'
import { Settings } from 'lucide-react'

export default function ManagerSettingsPage() {
  const { user, profile } = useUser('/')
  const isAdminLike = isManagerUser(user, profile)

  return (
    <>
      <ManagerHeader title="הגדרות מערכת" />
      <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32 animate-fadeIn">
        <div className="rounded-3xl border border-border-subtle bg-white shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-800">כלי מערכת וניהול התראות</h2>
          </div>
          <p className="text-sm text-gray-600">
            כאן מרוכזים כלי ניהול מערכת. כרגע כולל טסט פושים מפורט למנהלים.
          </p>
        </div>

        <PushAdminTestPanel enabled={isAdminLike} />
      </div>
    </>
  )
}
