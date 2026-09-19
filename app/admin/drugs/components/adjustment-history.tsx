'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getAdjustmentsForBatch } from '@/app/actions/stock-adjustments'
import { Loader2, History } from 'lucide-react'
import type {  Batch  } from '@/lib/types'
import type { DrugWithStock } from '@/app/actions/drugs'
import type {  StockAdjustment  } from '@/lib/types'

export function AdjustmentHistoryDialog({ children, batch, drug }: { children: React.ReactElement, batch: Batch, drug: DrugWithStock }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])

  useEffect(() => {
    if (open) {
      setLoading(true)
      getAdjustmentsForBatch(batch.id)
        .then(data => setAdjustments(data || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [open, batch.id])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Audit Trail
          </DialogTitle>
          <DialogDescription>
            {drug.name} (Batch {batch.batch_number || 'N/A'}) - History of all manual stock adjustments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-[300px] py-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : adjustments.length === 0 ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              No adjustments recorded for this batch.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Resulting Qty</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map(adj => {
                  const isIncrease = adj.adjustment_type === 'increase'
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(adj.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {adj.adjusted_by}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono ${isIncrease ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-destructive border-destructive/20 bg-destructive/10'}`}>
                          {isIncrease ? '+' : '-'}{adj.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {adj.resulting_quantity}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{adj.reason}</div>
                        {adj.notes && <div className="text-xs text-muted-foreground mt-0.5">{adj.notes}</div>}
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
