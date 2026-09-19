import { getDrugs, type DrugWithStock } from '@/app/actions/drugs'
import { getActiveAlerts } from '@/app/actions/alerts'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { DrugFormDialog } from './components/drug-form'
import { RestockFormDialog } from './components/restock-form'
import { BatchListDialog } from './components/batch-list'
import { Plus } from 'lucide-react'
// import type { Drug } from '@/lib/mock-data/drugs'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDrugsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string, q?: string }>
}) {
  const resolvedParams = await searchParams
  const activeTab = resolvedParams.tab || 'all'
  const searchQuery = (resolvedParams.q || '').toLowerCase()
  
  const allDrugs = await getDrugs(true) // include inactive
  const alerts = await getActiveAlerts()
  
  const drugs = allDrugs.filter(drug => {
    if (searchQuery) {
      const nameMatch = drug.name.toLowerCase().includes(searchQuery)
      const catMatch = drug.category.toLowerCase().includes(searchQuery)
      if (!nameMatch && !catMatch) return false
    }

    if (activeTab === 'all') return true
    
    if (activeTab === 'low_stock') return drug.has_low_stock
    if (activeTab === 'near_expiry') return drug.has_near_expiry
    if (activeTab === 'expired') return drug.has_expired
    
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Drug Catalog</h2>
          <p className="text-muted-foreground text-sm">Manage the central catalog of medications.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <SearchInput placeholder="Search drugs by name or category..." />
          <DrugFormDialog>
            <div className="inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-11 px-4 py-2 w-full sm:w-auto gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Add New Drug
            </div>
          </DrugFormDialog>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b pb-2">
        <Link href="/admin/drugs?tab=all">
          <Badge variant={activeTab === 'all' ? 'default' : 'secondary'} className="cursor-pointer">All Drugs</Badge>
        </Link>
        <Link href="/admin/drugs?tab=low_stock">
          <Badge variant={activeTab === 'low_stock' ? 'default' : 'secondary'} className="cursor-pointer">Low Stock</Badge>
        </Link>
        <Link href="/admin/drugs?tab=near_expiry">
          <Badge variant={activeTab === 'near_expiry' ? 'default' : 'secondary'} className="cursor-pointer">Near Expiry</Badge>
        </Link>
        <Link href="/admin/drugs?tab=expired">
          <Badge variant={activeTab === 'expired' ? 'default' : 'secondary'} className="cursor-pointer">Expired</Badge>
        </Link>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-foreground">Name & Dose</TableHead>
                <TableHead className="font-semibold text-foreground">Category</TableHead>
                <TableHead className="font-semibold text-foreground">Form</TableHead>
                <TableHead className="font-semibold text-foreground">Unit Type</TableHead>
                <TableHead className="font-semibold text-foreground">Stock</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drugs.map((drug: DrugWithStock) => {
                const isLowStock = drug.has_low_stock
                const isExpiring = drug.has_near_expiry || drug.has_expired
                
                let rowClassName = !drug.is_active ? "opacity-60 bg-muted/20" : "hover:bg-muted/10 transition-colors"
                if (drug.is_active && (isLowStock || isExpiring)) {
                  rowClassName = "bg-red-50/50 hover:bg-red-50 transition-colors"
                }

                return (
                  <TableRow key={drug.id} className={rowClassName}>
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {drug.name}
                        {isLowStock && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Low Stock</Badge>}
                        {isExpiring && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 h-5 px-1.5 text-[10px]">Expiring</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {drug.dose} {drug.manufacturer ? `• ${drug.manufacturer}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{drug.category}</TableCell>
                    <TableCell className="capitalize">{drug.form}</TableCell>
                    <TableCell>
                      {drug.unit_type === 'countable' ? (
                        <span className="text-sm text-muted-foreground">Pack of {drug.pack_size}</span>
                      ) : (
                        <span className="text-sm capitalize text-muted-foreground">{drug.unit_type}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {drug.current_stock > 0 ? (
                          <span className={isLowStock ? "text-red-600 font-bold" : ""}>{drug.current_stock.toLocaleString()}</span>
                        ) : (
                          <span className="text-destructive font-semibold">Out of Stock</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {drug.is_active ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none font-medium">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 shadow-none font-medium">Discontinued</Badge>
                      )}
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <BatchListDialog drug={drug}>
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                          Batches
                        </Button>
                      </BatchListDialog>
                      <RestockFormDialog drug={drug}>
                        <Button variant="outline" size="sm" className="h-8">
                          Restock
                        </Button>
                      </RestockFormDialog>
                      <DrugFormDialog drug={drug}>
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 px-3 text-primary hover:bg-primary/10 cursor-pointer">Edit</div>
                      </DrugFormDialog>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
              {drugs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No drugs found in the catalog. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {drugs.map((drug: DrugWithStock) => {
          const isLowStock = drug.has_low_stock
          const isExpiring = drug.has_near_expiry || drug.has_expired
          
          let cardClass = "overflow-hidden shadow-sm transition-all duration-300 border bg-card rounded-xl"
          let topBarClass = "h-1.5 bg-primary/20 w-full"
          
          if (!drug.is_active) {
            cardClass += " opacity-60"
            topBarClass = "h-1.5 bg-muted w-full"
          } else if (isLowStock || isExpiring) {
            cardClass += " bg-red-50/50"
            topBarClass = "h-1.5 bg-red-500 w-full"
          }

          return (
            <div key={drug.id} className={cardClass}>
              <div className={topBarClass} />
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground leading-tight flex items-center gap-2">
                      {drug.name}
                      {isLowStock && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Low Stock</Badge>}
                      {isExpiring && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 h-5 px-1.5 text-[10px]">Expiring</Badge>}
                    </h3>
                    <p className="text-muted-foreground text-xs mt-1">
                      {drug.dose}
                      {drug.manufacturer && <span className="ml-1.5">• {drug.manufacturer}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!drug.is_active ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500 shadow-none font-medium">Discontinued</Badge>
                    ) : drug.current_stock > 0 ? (
                      <span className={isLowStock ? "text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full" : "text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"}>
                        {drug.current_stock.toLocaleString()} in stock
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Out of Stock</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2 justify-end">
                  <BatchListDialog drug={drug}>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground flex-1">
                      Batches
                    </Button>
                  </BatchListDialog>
                  <RestockFormDialog drug={drug}>
                    <Button variant="outline" size="sm" className="h-8 flex-1">
                      Restock
                    </Button>
                  </RestockFormDialog>
                  <DrugFormDialog drug={drug}>
                    <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 px-3 text-primary hover:bg-primary/10 cursor-pointer flex-1 border border-primary/20">Edit</div>
                  </DrugFormDialog>
                </div>
              </div>
            </div>
          )
        })}

        {drugs.length === 0 && (
          <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No drugs found in the catalog.
          </div>
        )}
      </div>
    </div>
  )
}
