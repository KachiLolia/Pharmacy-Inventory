import { requireAuth } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAuth(['admin'])
  } catch (error) {
    redirect('/staff')
  }

  return <>{children}</>
}
