'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, RefreshCcw, AlertTriangle } from 'lucide-react'
import type {  Prescription, PrescriptionItem  } from '@/lib/types'
import type { DrugWithStock } from '@/app/actions/drugs'
import { processRefund } from '@/app/actions/refunds'

interface RefundDialogProps {
  prescription: Prescription | null
  items: PrescriptionItem[]
  drugs: DrugWithStock[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RefundDialog({ prescription, items, drugs, open, onOpenChange, onSuccess }: RefundDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [restock, setRestock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Reset state when opened with a new prescription
  if (!open && Object.keys(quantities).length > 0) {
    setQuantities({})
    setReason('')
    setRestock(false)
    setErrorMsg('')
  }

  if (!prescription) return null

  const handleQtyChange = (itemId: string, val: string, max: number) => {
    let num = parseInt(val, 10)
    if (isNaN(num)) num = 0
    if (num < 0) num = 0
    if (num > max) num = max

    setQuantities(prev => ({ ...prev, [itemId]: num }))
  }

  const totalRefundItems = Object.values(quantities).reduce((a, b) => a + b, 0)
  const expectedRefundAmount = items.reduce((sum, item) => {
    return sum + (quantities[item.id] || 0) * item.unit_price
  }, 0)

  const handleSubmit = async () => {
    setErrorMsg('')
    if (totalRefundItems === 0) {
      setErrorMsg('Select at least one item to refund.')
      return
    }
    if (!reason.trim()) {
      setErrorMsg('Please provide a reason for this refund.')
      return
    }

    setLoading(true)
    try {
      const refundItems = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, quantityToRefund]) => ({ itemId, quantityToRefund }))

      const res = await processRefund(prescription.id, refundItems, restock, reason.trim())
      
      if (res.success) {
        onSuccess()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while processing the refund.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-destructive" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Select items to refund for receipt {prescription.receipt_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Sold</TableHead>
                  <TableHead className="text-center">Refundable</TableHead>
                  <TableHead className="text-right w-[120px]">Return Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const drug = drugs.find(d => d.id === item.drug_id)
                  const alreadyRefunded = item.refunded_quantity || 0
                  const maxRefundable = item.quantity - alreadyRefunded
                  const currentRefundQty = quantities[item.id] || 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{drug ? `${drug.name} ${drug.dose}` : 'Unknown Item'}</div>
                        <div className="text-xs text-muted-foreground">₦{item.unit_price.toFixed(2)} each</div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        {maxRefundable === 0 ? (
                          <span className="text-xs text-muted-foreground uppercase">Fully Refunded</span>
                        ) : (
                          maxRefundable
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          min="0" 
                          max={maxRefundable} 
                          value={currentRefundQty || ''}
                          onChange={(e) => handleQtyChange(item.id, e.target.value, maxRefundable)}
                          disabled={maxRefundable === 0 || loading}
                          className="h-8 w-20 ml-auto text-center"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
            <span className="font-medium text-sm">Expected Refund Amount:</span>
            <span className="font-bold text-lg text-destructive">₦{expectedRefundAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-4">
            {errorMsg && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm border border-destructive/20 font-medium">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Reason for Refund (Required)</Label>
              <Input 
                placeholder="e.g. Customer returned damaged product" 
                value={reason}
                onChange={e => setReason(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded-lg bg-yellow-50/50 border-yellow-100">
              <Switch 
                id="restock-switch" 
                checked={restock}
                onCheckedChange={setRestock}
                disabled={loading}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="restock-switch" className="font-medium text-yellow-900">
                  Return items to sellable stock?
                </Label>
                <p className="text-xs text-yellow-700">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Only enable if the physical product is unexpired and returning to the shelf.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={totalRefundItems === 0 || !reason.trim() || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
