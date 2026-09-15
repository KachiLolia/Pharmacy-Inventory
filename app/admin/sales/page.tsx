import { getCompletedPrescriptions } from '@/app/actions/pos'
import { getDrugs } from '@/app/actions/drugs'
import { SalesHistoryTable } from '@/components/pos/sales-history-table'

export const dynamic = 'force-dynamic'

export default async function AdminSalesPage() {
  const sales = await getCompletedPrescriptions(true) // isAdmin = true
  const drugs = await getDrugs(false) // needed for the receipt

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sales Records</h2>
        <p className="text-muted-foreground text-sm">View all historical completed transactions.</p>
      </div>

      <SalesHistoryTable sales={sales} drugs={drugs} isAdmin={true} />
    </div>
  )
}
