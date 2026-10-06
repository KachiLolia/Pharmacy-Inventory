import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { OrdersTable } from '@/components/otc/orders-table'
import { getOTCOrders } from '@/app/actions/otc-orders'

export const dynamic = 'force-dynamic'

export default async function StaffOTCOrdersPage() {
  // Staff sees all orders, same as admin, but UI might restrict actions later if needed.
  // The PRD says staff get a "simpler version" (fulfillment only, no pricing/settings access), 
  // which is handled by them not having the OTC Store or Site Settings tabs in their sidebar.
  const orders = await getOTCOrders()

  return (
    <div className="space-y-6 max-w-[1400px]">
      <DashboardHeader role="Staff" />
      <OrdersTable orders={orders} role="staff" />
    </div>
  )
}
