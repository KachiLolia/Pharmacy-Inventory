import { getRefundLogs } from '@/app/actions/refunds'
import { getCompletedPrescriptions } from '@/app/actions/pos'
import { RefundsTable } from '@/components/pos/refunds-table'

export const dynamic = 'force-dynamic'

export default async function AdminRefundsPage() {
  const [logs, prescriptions] = await Promise.all([
    getRefundLogs(),
    getCompletedPrescriptions(true) // Fetch all to get receipt numbers
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Refund Logs</h2>
        <p className="text-muted-foreground text-sm">View the immutable audit trail of all processed refunds and stock reversals.</p>
      </div>

      <RefundsTable logs={logs as any[]} prescriptions={prescriptions as any[]} />
    </div>
  )
}
