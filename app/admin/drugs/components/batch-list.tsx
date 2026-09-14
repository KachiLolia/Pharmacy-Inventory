'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getBatchesForDrug } from '@/app/actions/batches'
import type { Batch } from '@/lib/mock-data/batches'
import type { DrugWithStock } from '@/app/actions/drugs'
import { AdjustmentFormDialog } from './adjustment-form'
import { AdjustmentHistoryDialog } from './adjustment-history'
import { Loader2, Boxes, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BatchListDialog({ children, drug }: { children: React.ReactElement, drug: DrugWithStock }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<Batch[]>([])

  const loadBatches = () => {
    setLoading(true)
    getBatchesForDrug(drug.id)
      .then(data => setBatches(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) {
      loadBatches()
    }
  }, [open, drug.id])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            Batch History: {drug.name}
          </DialogTitle>
          <DialogDescription>
            View all shipments and physical inventory records for this medication.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-[300px] py-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              No batches found. Restock this drug to create a batch.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Qty Remaining</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(batch => {
                  const isExpired = new Date(batch.expiry_date) < new Date()
                  const isDepleted = batch.quantity_remaining === 0

                  return (
                    <TableRow key={batch.id} className={isDepleted ? 'opacity-50' : ''}>
                      <TableCell className="font-medium text-xs">{batch.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{batch.quantity_remaining} units</div>
                      </TableCell>
                      <TableCell>₦{batch.cost_price_per_unit.toFixed(2)}</TableCell>
                      <TableCell>₦{batch.selling_price_per_unit.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={isExpired ? 'text-destructive font-semibold' : ''}>
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isDepleted ? (
                          <Badge variant="secondary" className="bg-slate-100">Depleted</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <AdjustmentHistoryDialog batch={batch} drug={drug}>
                            <Button variant="ghost" size="sm" className="h-7 text-muted-foreground px-2">
                              History
                            </Button>
                          </AdjustmentHistoryDialog>
                          {!isDepleted && (
                            <AdjustmentFormDialog batch={batch} drug={drug} onAdjusted={loadBatches}>
                              <Button variant="outline" size="sm" className="h-7 px-2">
                                <Settings2 className="w-3.5 h-3.5 mr-1" />
                                Adjust
                              </Button>
                            </AdjustmentFormDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
