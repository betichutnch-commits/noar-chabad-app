'use client'

import Link from 'next/link'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { PushAdminTestPanel } from '@/components/PushAdminTestPanel'
import { useUser } from '@/hooks/useUser'
import { isTechAdminUser } from '@/lib/auth'
import { AlertTriangle, ClipboardList, Leaf, ScrollText, Settings, UsersRound } from 'lucide-react'

const settingsCards = [
  {
    href: '/manager/settings/trip-documents',
    title: 'הגדרות חובה למסמכי תיק טיול',
    description: 'מיפוי כל שדות הטפסים, מקור ההזנה שלהם והגדרת חובה / לא חובה / תלוי.',
    Icon: ClipboardList,
    tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  },
  {
    href: '/manager/settings/event-risks',
    title: 'סיכוני ברירת מחדל לפי התרחשות',
    description: 'ניהול סיכונים ודירוגים שיופיעו אוטומטית בלו״ז לפי סוג ההתרחשות.',
    Icon: AlertTriangle,
    tone: 'bg-orange-50 text-orange-700 border-orange-100',
  },
  {
    href: '/manager/settings/required-roles',
    title: 'כללי מצבת צוות ושיבוצים',
    description: 'הגדרת תפקידי חובה, נוסחאות כמות, מיזוג תפקידים ושיבוצי אוטובוסים, קבוצות וחדרים.',
    Icon: UsersRound,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    href: '/manager/settings/sustainability',
    title: 'קיימות ואיכות סביבה',
    description: 'הצגה או הסתרה של כל דגשי הקיימות לאורך תהליך התכנון — לכל המשתמשים במערכת.',
    Icon: Leaf,
    tone: 'bg-green-50 text-green-700 border-green-100',
  },
  {
    href: '/manager/settings/regulation',
    title: 'חוזרי מנכ״ל ורגולציה',
    description: 'מאגר חוזר 585, צפייה בטבלאות, ומדריך עדכון עתידי (חילוץ PDF, קבצי JSON, סקריפטים).',
    Icon: ScrollText,
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
]

export default function ManagerSettingsPage() {
  const { user, profile } = useUser('/')
  const isTechAdmin = isTechAdminUser(user, profile)

  return (
    <>
      <ManagerHeader title="הגדרות מערכת" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32 animate-fadeIn space-y-6">
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

        <div className="grid gap-4 md:grid-cols-2">
          {settingsCards.map(({ href, title, description, Icon, tone }) => (
            <Link key={href} href={href} className="group rounded-3xl border border-border-subtle bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${tone}`}>
                <Icon size={22} />
              </div>
              <h2 className="text-lg font-black text-gray-800 group-hover:text-brand-cyan">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
              <div className="mt-5 text-sm font-black text-brand-cyan">פתיחת הגדרה</div>
            </Link>
          ))}
        </div>

        <PushAdminTestPanel enabled={isTechAdmin} />
      </div>
    </>
  )
}
