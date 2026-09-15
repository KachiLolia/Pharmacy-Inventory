import { getDrugs, type DrugWithStock } from '@/app/actions/drugs'
import { getActiveAlerts } from '@/app/actions/alerts'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
  searchParams: Promise<{ tab?: string }>
}) {
  const resolvedParams = await searchParams
  const activeTab = resolvedParams.tab || 'all'
  
  const allDrugs = await getDrugs(true) // include inactive
  const alerts = await getActiveAlerts()
  
  const drugs = allDrugs.filter(drug => {
    if (activeTab === 'all') return true
    
    const drugAlerts = alerts.filter(a => a.drug_id === drug.id)
    if (activeTab === 'low_stock') return drugAlerts.some(a => a.type === 'low_stock')
    if (activeTab === 'near_expiry') return drugAlerts.some(a => a.type === 'expiry' && (a.days_until_expiry ?? 0) > 0)
    if (activeTab === 'expired') return drugAlerts.some(a => a.type === 'expiry' && (a.days_until_expiry ?? 0) <= 0)
    
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Drug Catalog</h2>
          <p className="text-muted-foreground text-sm">Manage the central catalog of medications.</p>
        </div>
        <DrugFormDialog>
          <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full sm:w-auto gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add New Drug
          </div>
        </DrugFormDialog>
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

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
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
                const drugAlerts = alerts.filter(a => a.drug_id === drug.id)
                const isLowStock = drugAlerts.some(a => a.type === 'low_stock')
                const isExpiring = drugAlerts.some(a => a.type === 'expiry')
                
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No drugs found in the catalog. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
