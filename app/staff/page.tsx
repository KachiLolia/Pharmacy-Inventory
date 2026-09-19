import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { TopSellingDrugs } from '@/components/dashboard/top-selling-drugs'
import { InventoryOverview } from '@/components/dashboard/inventory-overview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { getStaffDashboardMetrics } from '@/app/actions/dashboard'
import { getActiveAlerts } from '@/app/actions/alerts'
import { Receipt, ShoppingCart, Box, AlertTriangle, Plus, FileText, Pill } from 'lucide-react'
import { requireAuth } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StaffDashboard() {
  const { user } = await requireAuth(['staff'])
  
  // Use a hardcoded mock staff id for testing during development, or real user id if supabase is connected
  const staffId = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co' ? user.id : 'staff-1'
  const metrics = await getStaffDashboardMetrics(staffId)
  const alerts = await getActiveAlerts()

  const quickActions = [
    { title: 'New Prescription / Sale', href: '/staff/pos', icon: <Plus className="w-8 h-8" /> },
    { title: 'View Sales Records', href: '/staff/sales', icon: <FileText className="w-8 h-8" /> },
    { title: 'Drug Catalog', href: '/staff/drugs', icon: <Pill className="w-8 h-8" /> },
  ]

  return (
    <div className="space-y-6 pb-8 max-w-[1400px]">
      <DashboardHeader role="Staff" />

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Your Revenue Today" 
          value={`₦${metrics.myRevenueToday.toLocaleString()}`} 
          icon={<Receipt className="w-5 h-5" />} 
        />
        <KPICard 
          title="Sales Completed Today" 
          value={metrics.myTransactionCountToday.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />} 
        />
        <KPICard 
          title="Inventory Value" 
          value={`₦${metrics.inventoryValue.toLocaleString()}`} 
          icon={<Box className="w-5 h-5" />} 
          subtitle="Total stock value" 
        />
        <KPICard 
          title="Inventory Alerts" 
          value={alerts.length.toString()} 
          icon={<AlertTriangle className="w-5 h-5" />} 
          isAlert={alerts.length > 0} 
        />
      </div>

      {/* Row 2: Sales Chart & Top Selling Drugs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart role="Staff" staffId={staffId} />
        </div>
        <div className="lg:col-span-1">
          <TopSellingDrugs drugs={metrics.topSellingDrugs} />
        </div>
      </div>

      {/* Row 3: Inventory Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InventoryOverview metrics={metrics.inventoryOverview} />
        </div>
        <div className="lg:col-span-1">
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  )
}
