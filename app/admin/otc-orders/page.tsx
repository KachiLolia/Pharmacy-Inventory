import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { OrdersTable } from '@/components/otc/orders-table'
import { getOTCOrders } from '@/app/actions/otc-orders'

export const dynamic = 'force-dynamic'

export default async function AdminOTCOrdersPage() {
  const orders = await getOTCOrders()

  return (
    <div className="space-y-6 max-w-[1400px]">
      <DashboardHeader role="Admin" />
      <OrdersTable orders={orders} role="admin" />
    </div>
  )
}
