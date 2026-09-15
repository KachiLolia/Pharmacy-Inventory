import { getCompletedPrescriptions } from '@/app/actions/pos'
import { getDrugs } from '@/app/actions/drugs'
import { SalesHistoryTable } from '@/components/pos/sales-history-table'

export const dynamic = 'force-dynamic'

export default async function StaffSalesPage() {
  const sales = await getCompletedPrescriptions(false) // isAdmin = false
  const drugs = await getDrugs(false)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Sales Records</h2>
        <p className="text-muted-foreground text-sm">View your historically completed transactions.</p>
      </div>

      <SalesHistoryTable sales={sales} drugs={drugs} />
    </div>
  )
}
