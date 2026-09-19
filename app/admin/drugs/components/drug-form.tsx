'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createOrUpdateDrug } from '@/app/actions/drugs'
import type {  Drug  } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export function DrugFormDialog({ children, drug }: { children: React.ReactNode, drug?: Drug }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [name, setName] = useState(drug?.name || '')
  const [dose, setDose] = useState(drug?.dose || '')
  const [manufacturer, setManufacturer] = useState(drug?.manufacturer || '')
  const [category, setCategory] = useState(drug?.category || '')
  const [form, setForm] = useState(drug?.form || 'tablet')
  const [packSize, setPackSize] = useState(drug?.pack_size?.toString() || '')
  const [isActive, setIsActive] = useState(drug?.is_active ?? true)
  const [nafdac, setNafdac] = useState(drug?.nafdac_number || '')
  const [lowStock, setLowStock] = useState(drug?.low_stock_threshold?.toString() || '50')
  const [expiryWarning, setExpiryWarning] = useState(drug?.expiry_warning_days?.toString() || '90')

  const isCountable = form === 'tablet' || form === 'capsule'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await createOrUpdateDrug({
        id: drug?.id,
        name,
        dose,
        manufacturer,
        category,
        form,
        nafdac_number: nafdac,
        unit_type: isCountable ? 'countable' : 'whole',
        pack_size: isCountable ? parseInt(packSize) : undefined,
        low_stock_threshold: lowStock ? parseInt(lowStock) : undefined,
        expiry_warning_days: expiryWarning ? parseInt(expiryWarning) : undefined,
        is_active: isActive
      })
      setOpen(false)
    } catch (err) {
      console.error(err)
      alert("Failed to save drug")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{drug ? 'Edit Drug' : 'Add New Drug'}</DialogTitle>
          <DialogDescription>
            {drug ? 'Update the details for this drug.' : 'Enter the details for the new catalog entry.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Drug Name <span className="text-destructive">*</span></Label>
              <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Paracetamol" />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="dose">Dose <span className="text-destructive">*</span></Label>
              <Input id="dose" required value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 500mg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="manufacturer">Manufacturer / Brand <span className="text-destructive">*</span></Label>
              <Input id="manufacturer" required value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Nature's Field" />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
              <Input id="category" required value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Analgesic" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="nafdac">NAFDAC Number</Label>
              <Input id="nafdac" value={nafdac} onChange={e => setNafdac(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Form <span className="text-destructive">*</span></Label>
              <Select value={form} onValueChange={(val) => setForm(val as string)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="capsule">Capsule</SelectItem>
                  <SelectItem value="syrup">Syrup</SelectItem>
                  <SelectItem value="cream">Cream</SelectItem>
                  <SelectItem value="spray">Spray</SelectItem>
                  <SelectItem value="injection">Injection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Pack Size {isCountable && <span className="text-destructive">*</span>}</Label>
              <Input 
                type="number" 
                min="1" 
                required={isCountable} 
                disabled={!isCountable} 
                value={packSize} 
                onChange={e => setPackSize(e.target.value)} 
                placeholder={isCountable ? "Units per pack" : "N/A for " + form} 
                className={!isCountable ? "bg-muted opacity-50" : "bg-background"}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground leading-relaxed">
              {isCountable 
                ? "Tablets and capsules are sold individually, so we need to know how many are in a single restock pack." 
                : `${form.charAt(0).toUpperCase() + form.slice(1)}s are sold as whole units.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="lowStock">Low Stock Threshold <span className="text-destructive">*</span></Label>
              <Input 
                id="lowStock" 
                type="number" 
                min="0"
                required
                value={lowStock} 
                onChange={e => setLowStock(e.target.value)} 
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="expiryWarning">Expiry Warning (Days) <span className="text-destructive">*</span></Label>
              <Input 
                id="expiryWarning" 
                type="number" 
                min="0"
                required
                value={expiryWarning} 
                onChange={e => setExpiryWarning(e.target.value)} 
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground leading-relaxed">
              These set the thresholds for when this specific drug will trigger low stock or expiring soon alerts.
            </p>
          </div>

          {drug && (
            <div className="flex items-center justify-between p-4 border rounded-xl bg-destructive/5 border-destructive/10">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-foreground">Active Status</Label>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                  {isActive 
                    ? "Turn off to discontinue this drug. It will be hidden from staff but historical sales records will remain intact." 
                    : "Turn on to reactivate this drug."}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Drug"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
