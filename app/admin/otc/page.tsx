import { getOTCListings } from '@/app/actions/otc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { Store, Image as ImageIcon } from 'lucide-react'
import { ListingDialog } from './components/listing-dialog'

export const dynamic = 'force-dynamic'

export default async function AdminOTCPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const resolvedParams = await searchParams
  const searchQuery = (resolvedParams.q || '').toLowerCase()
  
  const drugs = await getOTCListings()
  
  const filteredDrugs = drugs.filter(drug => {
    if (searchQuery) {
      const nameMatch = drug.name.toLowerCase().includes(searchQuery)
      const catMatch = drug.category.toLowerCase().includes(searchQuery)
      if (!nameMatch && !catMatch) return false
    }
    return true
  })

  return (
     <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" /> OTC Store Listings
          </h2>
          <p className="text-muted-foreground text-sm">Manage which catalog drugs are listed publicly on your online storefront.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <SearchInput placeholder="Search drugs..." />
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-foreground">Drug</TableHead>
                <TableHead className="font-semibold text-foreground">Category</TableHead>
                <TableHead className="font-semibold text-foreground">Public Status</TableHead>
                <TableHead className="font-semibold text-foreground">Online Price</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrugs.map((drug) => {
                const listing = drug.listing
                const isListed = listing?.listed ?? false
                
                let rowClassName = isListed ? "bg-primary/5 hover:bg-primary/10 transition-colors" : "opacity-70 hover:opacity-100 transition-opacity"

                return (
                  <TableRow key={drug.id} className={rowClassName}>
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {drug.name}
                        {listing?.images && listing.images.length > 0 && (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {drug.dose} {drug.manufacturer ? `• ${drug.manufacturer}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{drug.category}</TableCell>
                    <TableCell>
                      {isListed ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none font-medium">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 shadow-none font-medium">Unlisted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {listing?.price_override ? (
                        <div className="font-medium text-primary">₦{listing.price_override.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground font-normal">(Override)</span></div>
                      ) : (
                        <div className="text-muted-foreground text-sm italic">Auto (Live Price)</div>
                      )}
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                       <ListingDialog drug={drug} listing={listing} />
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
              {filteredDrugs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No drugs found matching your search.
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
