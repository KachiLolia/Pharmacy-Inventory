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
          <p className="text-muted-foreground text-sm">
            Manage which catalog drugs are listed publicly on your online storefront, configure online prices, and add product photos.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <SearchInput placeholder="Search drugs..." />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-foreground">Drug & Image</TableHead>
                <TableHead className="font-semibold text-foreground">Category</TableHead>
                <TableHead className="font-semibold text-foreground">Public Status</TableHead>
                <TableHead className="font-semibold text-foreground">Live Stock Sync</TableHead>
                <TableHead className="font-semibold text-foreground">Online Price</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrugs.map((drug) => {
                const listing = drug.listing
                const isListed = listing?.listed ?? false
                const hasImages = listing?.images && listing.images.length > 0
                
                const rowClassName = isListed ? "bg-primary/5 hover:bg-primary/10 transition-colors" : "opacity-75 hover:opacity-100 transition-opacity"

                return (
                  <TableRow key={drug.id} className={rowClassName}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {hasImages ? (
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden border bg-muted flex-shrink-0 shadow-xs">
                            <img
                              src={listing.images[0]}
                              alt={drug.name}
                              className="w-full h-full object-cover"
                            />
                            {listing.images.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-[9px] font-bold text-white px-1 rounded-tl">
                                +{listing.images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg border border-dashed flex items-center justify-center bg-muted/40 text-muted-foreground flex-shrink-0">
                            <ImageIcon className="w-4 h-4 opacity-40" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {drug.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {drug.dose} {drug.manufacturer ? `• ${drug.manufacturer}` : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{drug.category}</span>
                    </TableCell>
                    <TableCell>
                      {isListed ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none font-medium">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 shadow-none font-medium">Unlisted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {drug.is_out_of_stock ? (
                        <div>
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">
                            Out of Stock (0)
                          </Badge>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">Online: 'Out of Stock'</span>
                        </div>
                      ) : drug.is_low_stock ? (
                        <div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium">
                            Low Stock ({drug.available_stock} left)
                          </Badge>
                          {drug.has_expired_batches && (
                            <span className="text-[10px] text-destructive block mt-0.5">Expired batches excluded</span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">
                            {drug.available_stock} in stock
                          </Badge>
                          {drug.has_expired_batches && (
                            <span className="text-[10px] text-destructive block mt-0.5">Expired batches excluded</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {listing?.price_override ? (
                        <div className="font-medium text-primary">
                          ₦{listing.price_override.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground font-normal">(Override)</span>
                        </div>
                      ) : drug.live_batch_price ? (
                        <div className="font-medium text-foreground">
                          ₦{drug.live_batch_price.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground font-normal">(Live Batch)</span>
                        </div>
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No drugs found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredDrugs.map((drug) => {
          const listing = drug.listing
          const isListed = listing?.listed ?? false
          const hasImages = listing?.images && listing.images.length > 0

          return (
            <div 
              key={drug.id} 
              className={`p-4 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3 transition-colors ${
                isListed ? 'border-primary/20 bg-primary/[0.02]' : 'opacity-85'
              }`}
            >
              <div className="flex items-start gap-3">
                {hasImages ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border bg-muted flex-shrink-0 shadow-xs">
                    <img
                      src={listing.images[0]}
                      alt={drug.name}
                      className="w-full h-full object-cover"
                    />
                    {listing.images.length > 1 && (
                      <span className="absolute bottom-0 right-0 bg-black/75 text-[9px] font-bold text-white px-1 rounded-tl">
                        +{listing.images.length - 1}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed flex items-center justify-center bg-muted/40 text-muted-foreground flex-shrink-0">
                    <ImageIcon className="w-5 h-5 opacity-40" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground text-base truncate">{drug.name}</h4>
                    {isListed ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0">
                        Unlisted
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {drug.dose} • {drug.category}
                  </p>
                  <div className="mt-1.5 text-xs">
                    <span className="text-muted-foreground">Price: </span>
                    {listing?.price_override ? (
                      <span className="font-semibold text-primary">
                        ₦{listing.price_override.toLocaleString(undefined, {minimumFractionDigits: 2})} (Override)
                      </span>
                    ) : drug.live_batch_price ? (
                      <span className="font-semibold text-foreground">
                        ₦{drug.live_batch_price.toLocaleString(undefined, {minimumFractionDigits: 2})} (Live Batch)
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">Auto (Live Batch)</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {drug.is_out_of_stock ? (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0">
                        Out of Stock (0)
                      </Badge>
                    ) : drug.is_low_stock ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                        Low Stock ({drug.available_stock} left)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                        {drug.available_stock} in stock
                      </Badge>
                    )}
                    {drug.has_expired_batches && (
                      <span className="text-[10px] text-destructive font-medium">Expired batches excluded</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end">
                <ListingDialog drug={drug} listing={listing} />
              </div>
            </div>
          )
        })}

        {filteredDrugs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground rounded-xl border border-dashed">
            No drugs found matching your search.
          </div>
        )}
      </div>
    </div>
  )
}
