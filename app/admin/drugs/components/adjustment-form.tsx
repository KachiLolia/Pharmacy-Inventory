'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adjustStock } from '@/app/actions/stock-adjustments'
import { Loader2, ArrowRightLeft } from 'lucide-react'
import type {  Batch  } from '@/lib/types'
import type { DrugWithStock } from '@/app/actions/drugs'

const REASONS = [
  'Audit Correction',
  'Damage/Breakage',
  'Expiry',
  'Data Entry Error'
]

export function AdjustmentFormDialog({ children, batch, drug, onAdjusted }: { children: React.ReactElement, batch: Batch, drug: DrugWithStock, onAdjusted: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [type, setType] = useState<'increase' | 'decrease'>('decrease')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')

  const qtyNum = parseInt(quantity) || 0
  let newQuantity = batch.quantity_remaining
  if (type === 'increase') {
    newQuantity += qtyNum
  } else {
    newQuantity -= qtyNum
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (qtyNum <= 0) throw new Error("Quantity must be greater than 0")
      
      await adjustStock({
        batch_id: batch.id,
        drug_id: drug.id,
        adjustment_type: type,
        quantity: qtyNum,
        reason,
        notes: notes || undefined
      })
      
      setOpen(false)
      setQuantity('')
      setNotes('')
      onAdjusted()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to adjust stock")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription>
            Make a physical adjustment to {drug.name} (Batch {batch.batch_number || 'N/A'}).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current Stock</p>
              <p className="text-2xl font-bold">{batch.quantity_remaining}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">New Stock</p>
              <p className={`text-2xl font-bold ${newQuantity < 0 || newQuantity < batch.reserved_quantity ? 'text-destructive' : 'text-primary'}`}>
                {newQuantity}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={type} onValueChange={(val) => { if (val) setType(val as 'increase' | 'decrease') }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase (+)</SelectItem>
                  <SelectItem value="decrease">Decrease (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                min="1" 
                required 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                placeholder="e.g. 5" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(val) => { if (val) setReason(val) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Additional details..." 
              className="resize-none h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
