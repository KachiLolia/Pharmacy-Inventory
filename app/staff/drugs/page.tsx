import { getDrugs, type DrugWithStock } from '@/app/actions/drugs'
import { getActiveAlerts } from '@/app/actions/alerts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
// import type { Drug } from '@/lib/mock-data/drugs'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StaffDrugsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const resolvedParams = await searchParams
  const activeTab = resolvedParams.tab || 'all'

  const allDrugs = await getDrugs(false) // active only for staff
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
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Drug Catalog</h2>
        <p className="text-muted-foreground text-sm">Browse available medications and forms.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search drugs by name or category..." className="pl-9 h-11 bg-white shadow-sm rounded-xl" />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 border-b pb-2 sm:border-none sm:pb-0">
          <Link href="/staff/drugs?tab=all">
            <Badge variant={activeTab === 'all' ? 'default' : 'secondary'} className="cursor-pointer">All</Badge>
          </Link>
          <Link href="/staff/drugs?tab=low_stock">
            <Badge variant={activeTab === 'low_stock' ? 'default' : 'secondary'} className="cursor-pointer">Low Stock</Badge>
          </Link>
          <Link href="/staff/drugs?tab=near_expiry">
            <Badge variant={activeTab === 'near_expiry' ? 'default' : 'secondary'} className="cursor-pointer">Near Expiry</Badge>
          </Link>
          <Link href="/staff/drugs?tab=expired">
            <Badge variant={activeTab === 'expired' ? 'default' : 'secondary'} className="cursor-pointer">Expired</Badge>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drugs.map((drug: DrugWithStock) => {
          const drugAlerts = alerts.filter(a => a.drug_id === drug.id)
          const isLowStock = drugAlerts.some(a => a.type === 'low_stock')
          const isExpiring = drugAlerts.some(a => a.type === 'expiry')
          
          let cardClass = "overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border-none rounded-[24px]"
          let topBarClass = "h-1.5 bg-primary/20 w-full"
          
          if (isLowStock || isExpiring) {
            cardClass += " bg-red-50/50"
            topBarClass = "h-1.5 bg-red-500 w-full"
          }

          return (
            <Card key={drug.id} className={cardClass}>
              <div className={topBarClass} />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground leading-tight flex items-center gap-2">
                      {drug.name}
                      {isLowStock && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Low Stock</Badge>}
                      {isExpiring && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 h-5 px-1.5 text-[10px]">Expiring</Badge>}
                    </h3>
                    <p className="text-primary font-medium">
                      {drug.dose}
                      {drug.manufacturer && <span className="text-muted-foreground font-normal ml-1.5">• {drug.manufacturer}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground capitalize font-medium">
                      {drug.form}
                    </Badge>
                    {drug.current_stock > 0 ? (
                      <span className={isLowStock ? "text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full" : "text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"}>
                        {drug.current_stock.toLocaleString()} in stock
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Out of Stock</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border/40 flex justify-between items-center text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">{drug.category}</span>
                  {drug.unit_type === 'countable' ? (
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-md">Sold Per Pill</span>
                  ) : (
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-md">Sold Whole</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {drugs.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No active drugs found in the catalog.
          </div>
        )}
      </div>
    </div>
  )
}
