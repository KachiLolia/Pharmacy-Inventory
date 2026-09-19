import { Bell } from 'lucide-react'
import { getActiveAlerts } from '@/app/actions/alerts'
import Link from 'next/link'

interface DashboardHeaderProps {
  role: 'Admin' | 'Staff'
}

export async function DashboardHeader({ role }: DashboardHeaderProps) {
  const alerts = await getActiveAlerts()
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Good morning, {role} <span className="text-2xl">👋</span>
        </h2>
        <p className="text-muted-foreground mt-1">Here's what's happening at your pharmacy today.</p>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Alerts Bell */}
        {role === 'Admin' && (
          <Link href="/admin/drugs?tab=low_stock" className="relative p-2 rounded-full border bg-white hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {alerts.length}
              </span>
            )}
          </Link>
        )}
        {role === 'Staff' && (
          <Link href="/staff/drugs?tab=low_stock" className="relative p-2 rounded-full border bg-white hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {alerts.length}
              </span>
            )}
          </Link>
        )}

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 border rounded-full bg-white text-sm font-medium">
          <span className="text-muted-foreground">{today}</span>
        </div>
      </div>
    </div>
  )
}
