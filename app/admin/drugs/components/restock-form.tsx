'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { restockDrug } from '@/app/actions/batches'
import { type DrugWithStock } from '@/app/actions/drugs'
import { Loader2, PackagePlus } from 'lucide-react'

export function RestockFormDialog({ children, drug }: { children: React.ReactElement, drug: DrugWithStock }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [quantityEntered, setQuantityEntered] = useState('')
  const [costPriceEntered, setCostPriceEntered] = useState('')
  const [sellingPriceEntered, setSellingPriceEntered] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [manufacturingDate, setManufacturingDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const qty = parseInt(quantityEntered)
    const cost = parseFloat(costPriceEntered)
    const sell = parseFloat(sellingPriceEntered)
    
    const quantity_received = qty
    const cost_price_per_unit = cost
    const selling_price_per_unit = sell

    try {
      await restockDrug({
        drug_id: drug.id,
        batch_number: batchNumber || undefined,
        quantity_received,
        cost_price_per_unit,
        selling_price_per_unit,
        manufacturing_date: manufacturingDate || undefined,
        expiry_date: expiryDate
      })
      setOpen(false)
      // Reset form
      setQuantityEntered('')
      setCostPriceEntered('')
      setSellingPriceEntered('')
      setBatchNumber('')
      setManufacturingDate('')
      setExpiryDate('')
    } catch (err) {
      console.error(err)
      alert("Failed to restock drug")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Restock: {drug.name}
          </DialogTitle>
          <DialogDescription>
            Record a new shipment or batch for this medication.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="quantity">
                Quantity (Total Units) <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="quantity" 
                type="number" 
                min="1" 
                required 
                value={quantityEntered} 
                onChange={e => setQuantityEntered(e.target.value)} 
                placeholder="e.g. 100" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="costPrice">
                Cost Price (Per Unit) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input 
                  id="costPrice" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  required 
                  value={costPriceEntered} 
                  onChange={e => setCostPriceEntered(e.target.value)} 
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="sellPrice">
                Selling Price (Per Unit) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input 
                  id="sellPrice" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  required 
                  value={sellingPriceEntered} 
                  onChange={e => setSellingPriceEntered(e.target.value)} 
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="mfgDate">Manufacturing Date</Label>
              <Input 
                id="mfgDate" 
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={manufacturingDate} 
                onChange={e => setManufacturingDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="expDate">Expiry Date <span className="text-destructive">*</span></Label>
              <Input 
                id="expDate" 
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                required 
                value={expiryDate} 
                onChange={e => setExpiryDate(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="batchNo">Supplier Batch Number</Label>
            <Input 
              id="batchNo" 
              value={batchNumber} 
              onChange={e => setBatchNumber(e.target.value)} 
              placeholder="Optional" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Restock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
