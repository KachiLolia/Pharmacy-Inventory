'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import type { DrugWithStock } from '@/app/actions/drugs'
import { calculateFEFOAllocation, createPrescription, type FEFOAllocation } from '@/app/actions/pos'
import { useRouter } from 'next/navigation'

export function POSInterface({ drugs }: { drugs: DrugWithStock[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<{ drug: DrugWithStock, quantity: number | '' }[]>([])
  
  const [allocation, setAllocation] = useState<FEFOAllocation[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeDrugs = drugs.filter(d => d.is_active)
  const searchResults = activeDrugs.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.manufacturer && d.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5) // Limit to top 5 for quick adding

  const addToCart = (drug: DrugWithStock) => {
    setAllocation(null)
    setError(null)
    setCart(prev => {
      const existing = prev.find(item => item.drug.id === drug.id)
      if (existing) {
        const currentQty = typeof existing.quantity === 'number' ? existing.quantity : 0
        return prev.map(item => item.drug.id === drug.id ? { ...item, quantity: currentQty + 1 } : item)
      }
      return [...prev, { drug, quantity: '' }]
    })
  }

  const updateQuantity = (drugId: string, quantity: number | '') => {
    setAllocation(null)
    setError(null)
    setCart(prev => prev.map(item => item.drug.id === drugId ? { ...item, quantity } : item))
  }

  const removeFromCart = (drugId: string) => {
    setAllocation(null)
    setError(null)
    setCart(prev => prev.filter(item => item.drug.id !== drugId))
  }

  const handlePreview = async () => {
    if (cart.length === 0 || cart.every(i => !i.quantity)) return
    setLoadingPreview(true)
    setError(null)
    try {
      const cartItems = cart
        .filter(item => typeof item.quantity === 'number' && item.quantity > 0)
        .map(item => ({
          drug_id: item.drug.id,
          required_quantity: item.quantity as number
        }))
      const result = await calculateFEFOAllocation(cartItems)
      setAllocation(result)
    } catch (err: any) {
      setError(err.message || 'Failed to calculate allocation. Check stock availability.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleCreate = async () => {
    if (cart.length === 0 || cart.every(i => !i.quantity)) return
    setCreating(true)
    setError(null)
    try {
      const cartItems = cart
        .filter(item => typeof item.quantity === 'number' && item.quantity > 0)
        .map(item => ({
          drug_id: item.drug.id,
          required_quantity: item.quantity as number
        }))
      await createPrescription(cartItems)
      setCart([])
      setAllocation(null)
      alert("Prescription created successfully!")
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create prescription.')
    } finally {
      setCreating(false)
    }
  }

  const getTotalPreview = () => {
    if (!allocation) return 0
    return allocation.reduce((sum, alloc) => sum + alloc.total_price, 0)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      
      {/* LEFT: Search and Inventory */}
      <div className="space-y-6">
        <Card className="border-none shadow-sm ring-1 ring-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add to Prescription</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by drug name or category..." 
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No matching active drugs found.
                </div>
              ) : (
                searchResults.map(drug => (
                  <div key={drug.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">
                        {drug.name} 
                        <span className="text-muted-foreground font-normal ml-1">
                          ({drug.manufacturer ? `${drug.manufacturer} • ` : ''}{drug.dose})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{drug.form} • Avail: <strong className="text-foreground">{drug.current_stock}</strong> units</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => addToCart(drug)} disabled={drug.current_stock <= 0}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Cart and Preview */}
      <div className="space-y-6">
        <Card className="border-none shadow-sm ring-1 ring-primary/5 flex flex-col h-full">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Current Prescription
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 p-0">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p>Prescription is empty.</p>
                <p className="text-sm mt-1">Search and add drugs to begin.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="overflow-y-auto max-h-[400px] p-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.drug.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.drug.name}
                          {item.drug.manufacturer && <span className="text-muted-foreground font-normal ml-1">({item.drug.manufacturer})</span>}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.drug.base_price !== undefined ? (
                            <span className="flex items-center gap-1.5">
                              {typeof item.quantity === 'number' && item.quantity > 0 ? (
                                <strong className="text-foreground text-sm">₦{(item.drug.base_price * item.quantity).toFixed(2)}</strong>
                              ) : (
                                <span>₦0.00</span>
                              )}
                            </span>
                          ) : 'Price pending'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0">
                        <div className="flex items-center border rounded-md overflow-hidden bg-background">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.drug.id, Math.max(1, (typeof item.quantity === 'number' ? item.quantity : 0) - 1))}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <input
                            type="number"
                            min="1"
                            className="w-12 text-center text-sm font-medium border-none focus:outline-none bg-transparent p-0 hide-spin-button"
                            value={item.quantity}
                            onChange={(e) => {
                              if (e.target.value === '') {
                                updateQuantity(item.drug.id, '')
                              } else {
                                const val = parseInt(e.target.value)
                                if (!isNaN(val)) updateQuantity(item.drug.id, val)
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQuantity(item.drug.id, (typeof item.quantity === 'number' ? item.quantity : 0) + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeFromCart(item.drug.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview Section */}
                {allocation && (
                  <div className="p-4 bg-muted/30 border-t space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      FEFO Allocation Preview
                    </h4>
                    <div className="space-y-2">
                      {allocation.map(alloc => {
                        const drug = cart.find(c => c.drug.id === alloc.drug_id)?.drug
                        return (
                          <div key={alloc.drug_id} className="text-xs space-y-1 bg-background p-2 rounded border">
                            <p className="font-medium">{drug?.name}</p>
                            {alloc.allocated_batches.map((ab, i) => (
                              <div key={i} className="flex justify-between text-muted-foreground">
                                <span>Batch {ab.batch_id.slice(0, 4)}... : {ab.quantity} units @ ₦{ab.unit_price}</span>
                                <span>₦{ab.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>₦{getTotalPreview().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="m-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="p-4 bg-muted/20 border-t mt-auto">
                  {!allocation ? (
                    <Button className="w-full" onClick={handlePreview} disabled={loadingPreview}>
                      {loadingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Preview Allocation
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button variant="outline" className="w-1/3" onClick={() => setAllocation(null)} disabled={creating}>
                        Edit Cart
                      </Button>
                      <Button className="w-2/3" onClick={handleCreate} disabled={creating}>
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Confirm & Reserve
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
