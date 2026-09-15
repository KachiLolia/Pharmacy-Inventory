import { getDrugs } from '@/app/actions/drugs'
import { getPendingPrescriptions } from '@/app/actions/pos'
import { POSInterface } from '@/components/pos/pos-interface'
import { PendingPrescriptions } from '@/components/pos/pending-prescriptions'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
  const drugs = await getDrugs(false) // exclude inactive
  const pendingPrescriptions = await getPendingPrescriptions()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Point of Sale</h2>
        <p className="text-muted-foreground text-sm">Create prescriptions and reserve stock.</p>
      </div>

      <POSInterface drugs={drugs} />
      
      <PendingPrescriptions prescriptions={pendingPrescriptions} drugs={drugs} />
    </div>
  )
}
