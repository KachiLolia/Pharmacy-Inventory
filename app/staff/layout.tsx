import { AppSidebar } from '@/components/layout/app-sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMockUser } from '@/lib/mock-auth'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    const mockUser = await getMockUser()
    if (!mockUser || mockUser.role !== 'staff') redirect('/login')
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data: userData } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'staff') {
      redirect('/admin') // Redirect admins to their dashboard if they try to access staff
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <AppSidebar role="staff" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
