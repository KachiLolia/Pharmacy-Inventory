import { getMockUser } from '@/lib/mock-auth'
import { redirect } from 'next/navigation'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const user = await getMockUser()
  
  if (user?.role !== 'admin') {
    redirect('/staff')
  }

  return <>{children}</>
}
