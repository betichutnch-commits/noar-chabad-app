'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DocumentFieldsMappingPanel } from '@/components/DocumentFieldsMappingPanel'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Button } from '@/components/ui/Button'

export default function TripDocumentsSettingsPage() {
  const router = useRouter()

  return (
    <>
      <ManagerHeader title="הגדרות חובה למסמכי תיק טיול" />
      <div className="mx-auto max-w-7xl animate-fadeIn space-y-4 p-4 pb-32 md:p-8">
        <Button variant="outline" onClick={() => router.push('/manager/settings')} className="px-4">
          <ArrowRight size={16} />
          חזרה להגדרות מערכת
        </Button>
        <DocumentFieldsMappingPanel />
      </div>
    </>
  )
}
