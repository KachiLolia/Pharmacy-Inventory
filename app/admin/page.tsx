import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { TopSellingDrugs } from '@/components/dashboard/top-selling-drugs'
import { InventoryOverview } from '@/components/dashboard/inventory-overview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { getAdminDashboardMetrics } from '@/app/actions/dashboard'
import { Receipt, ShoppingCart, Box, AlertTriangle, Plus, PackagePlus, FileText, Pill } from 'lucide-react'
import { getActiveAlerts } from '@/app/actions/alerts'

export default async function AdminDashboard() {
  const metrics = await getAdminDashboardMetrics()
  const alerts = await getActiveAlerts()

  const quickActions = [
    { title: 'New Prescription / Sale', href: '/admin/pos', icon: <Plus className="w-8 h-8" /> },
    { title: 'Restock Stock', href: '/admin/drugs', icon: <PackagePlus className="w-8 h-8" /> },
    { title: 'View Sales Records', href: '/admin/sales', icon: <FileText className="w-8 h-8" /> },
    { title: 'Drug Catalog', href: '/admin/drugs', icon: <Pill className="w-8 h-8" /> },
  ]

  return (
    <div className="space-y-6 pb-8 max-w-[1400px]">
      <DashboardHeader role="Admin" />

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Revenue Today" 
          value={`₦${metrics.totalRevenueToday.toLocaleString()}`} 
          icon={<Receipt className="w-5 h-5" />} 
          trend="12%" 
          trendUp={true} 
        />
        <KPICard 
          title="Number of Sales Today" 
          value={metrics.transactionCountToday.toLocaleString()} 
          icon={<ShoppingCart className="w-5 h-5" />} 
          trend="8%" 
          trendUp={true} 
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
          href="/admin/drugs?tab=low_stock"
        />
      </div>

      {/* Row 2: Sales Chart & Top Selling Drugs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart role="Admin" />
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
