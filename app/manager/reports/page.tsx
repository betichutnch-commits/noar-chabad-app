'use client'

import React from 'react'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { FileBarChart, Clock, Users, CheckCircle } from 'lucide-react'

export default function ManagerReportsPage() {
  return (
    <>
      <ManagerHeader title="דוחות ונתונים" />
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-border-subtle shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-brand-cyan flex items-center justify-center">
              <FileBarChart size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-800">מרכז דוחות</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            עמוד זה ישמש לריכוז נתונים ותובנות ניהוליות. בינתיים ניתן להשתמש בלוח הבקרה ובמסכי האישור/משתמשים לצפייה בנתונים השוטפים.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
            <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
              <Clock size={16} /> בקשות ממתינות
            </div>
            <p className="text-xs text-orange-700/80 mt-2">קפיצה מהירה למסך אישור טיולים לקבלת תמונת מצב מלאה.</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
              <Users size={16} /> משתמשים ונרשמים
            </div>
            <p className="text-xs text-purple-700/80 mt-2">ניהול כל המשתמשים והסטטוסים זמין במסך ניהול משתמשים.</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4">
            <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
              <CheckCircle size={16} /> אישורים שהושלמו
            </div>
            <p className="text-xs text-green-700/80 mt-2">ארכיון האישורים זמין במסך אישור טיולים תחת טאב אישורים.</p>
          </div>
        </div>
      </div>
    </>
  )
}
