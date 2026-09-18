import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Box, Hourglass, AlertCircle } from 'lucide-react'
import { InventoryOverviewMetrics } from '@/app/actions/dashboard'

interface InventoryOverviewProps {
  metrics: InventoryOverviewMetrics
}

export function InventoryOverview({ metrics }: InventoryOverviewProps) {
  const { totalSKUs, inStock, lowStock, outOfStock, totalBatches, expiringSoon, expired } = metrics
  
  // Calculate percentages for the circular chart
  const inStockPct = totalSKUs > 0 ? (inStock / totalSKUs) * 100 : 0
  const lowStockPct = totalSKUs > 0 ? (lowStock / totalSKUs) * 100 : 0
  const outOfStockPct = totalSKUs > 0 ? (outOfStock / totalSKUs) * 100 : 0

  return (
    <Card className="border shadow-sm rounded-[24px] bg-white h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Inventory Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-4">
          
          {/* Left Side: Donut Chart & SKU breakdown */}
          <div className="flex items-center gap-6">
            {/* CSS Conic Gradient Donut Chart */}
            <div 
              className="w-32 h-32 rounded-full relative flex items-center justify-center"
              style={{
                background: `conic-gradient(#059669 0% ${inStockPct}%, #F59E0B ${inStockPct}% ${inStockPct + lowStockPct}%, #EF4444 ${inStockPct + lowStockPct}% 100%)`
              }}
            >
              <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{totalSKUs}</span>
                <span className="text-xs text-muted-foreground text-center leading-tight mt-1">Total<br/>SKUs</span>
              </div>
            </div>

            {/* Legend / Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <span className="text-sm text-muted-foreground">In Stock</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm">{inStock}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(inStockPct)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-muted-foreground">Low Stock</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm">{lowStock}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(lowStockPct)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-sm text-muted-foreground">Out of Stock</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm">{outOfStock}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(outOfStockPct)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-px h-32 bg-border"></div>

          {/* Right Side: Batch Details */}
          <div className="space-y-6 flex-1 w-full max-w-[200px]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Box className="w-4 h-4" />
                <span className="text-sm">Total Stock</span>
              </div>
              <span className="font-bold text-sm">{metrics.totalStock.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-1"></div>
                <span className="text-sm ml-0.5">Running low</span>
              </div>
              <span className="font-bold text-sm">{lowStock}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ml-1"></div>
                <span className="text-sm ml-0.5">Out of stock</span>
              </div>
              <span className="font-bold text-sm">{outOfStock}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hourglass className="w-4 h-4" />
                <span className="text-sm">Expiring soon</span>
              </div>
              <span className="font-bold text-sm">{expiringSoon}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Expired</span>
              </div>
              <span className="font-bold text-sm">{expired}</span>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
