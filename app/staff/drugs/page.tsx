import { getDrugs, type DrugWithStock } from '@/app/actions/drugs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
// import type { Drug } from '@/lib/mock-data/drugs'

export const dynamic = 'force-dynamic'

export default async function StaffDrugsPage() {
  const drugs = await getDrugs(false) // active only for staff

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Drug Catalog</h2>
        <p className="text-muted-foreground text-sm">Browse available medications and forms.</p>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search drugs by name or category..." className="pl-9 h-11 bg-white shadow-sm rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drugs.map((drug: DrugWithStock) => (
          <Card key={drug.id} className="overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border-none rounded-[24px]">
            <div className="h-1.5 bg-primary/20 w-full" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-foreground leading-tight">{drug.name}</h3>
                  <p className="text-primary font-medium">{drug.dose}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground capitalize font-medium">
                    {drug.form}
                  </Badge>
                  {drug.current_stock > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{drug.current_stock.toLocaleString()} in stock</span>
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
        ))}

        {drugs.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No active drugs found in the catalog.
          </div>
        )}
      </div>
    </div>
  )
}
