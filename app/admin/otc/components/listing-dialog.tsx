'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { type DrugWithListing, upsertOTCListing } from '@/app/actions/otc'

export function ListingDialog({ drug, listing }: { drug: DrugWithListing, listing?: DrugWithListing['listing'] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [listed, setListed] = useState(listing?.listed ?? false)
  const [priceOverride, setPriceOverride] = useState(listing?.price_override?.toString() ?? '')
  const [descriptionOverride, setDescriptionOverride] = useState(listing?.description_override ?? '')

  async function handleSave() {
    try {
      setLoading(true)
      await upsertOTCListing(drug.id, {
        listed,
        price_override: priceOverride ? parseFloat(priceOverride) : null,
        description_override: descriptionOverride || null,
        // images would be handled separately
      })
      
      alert(`${drug.name} has been ${listed ? 'listed' : 'unlisted'} successfully.`)
      setOpen(false)
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Failed to update listing")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 px-3 text-primary hover:bg-primary/10 cursor-pointer border border-primary/20">
          Edit Listing
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Storefront Listing: {drug.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Publish to Storefront</Label>
              <p className="text-sm text-muted-foreground">
                Make this drug visible to the public.
              </p>
            </div>
            <Switch
              checked={listed}
              onCheckedChange={setListed}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceOverride">Price Override (₦)</Label>
            <Input
              id="priceOverride"
              type="number"
              step="0.01"
              placeholder="Leave empty to use live price"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If set, this price ignores inventory cost changes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptionOverride">Public Description</Label>
            <Textarea
              id="descriptionOverride"
              placeholder="Optional description for the storefront..."
              value={descriptionOverride}
              onChange={(e) => setDescriptionOverride(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
