'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getSalesReport, getStockReport, getExpectedReconciliation, saveReconciliation, getReconciliationHistory, SalesReportData, StockReportItem, ExpectedReconciliationTotals } from '@/app/actions/reports'
import { ReconciliationRecord } from '@/lib/mock-data/reconciliations'
import { format } from 'date-fns'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [salesData, setSalesData] = useState<SalesReportData | null>(null)
  const [stockData, setStockData] = useState<StockReportItem[]>([])
  
  // Reconciliation state
  const [reconStaffId, setReconStaffId] = useState<string>('all')
  const [expectedTotals, setExpectedTotals] = useState<ExpectedReconciliationTotals | null>(null)
  const [actualCash, setActualCash] = useState<string>('')
  const [actualPos, setActualPos] = useState<string>('')
  const [actualTransfer, setActualTransfer] = useState<string>('')
  const [isSavingRecon, setIsSavingRecon] = useState(false)

  // Fetch logic based on range
  const getDateBounds = (range: string) => {
    const now = new Date()
    let start = new Date()
    start.setHours(0, 0, 0, 0)
    
    if (range === 'week') {
      start.setDate(now.getDate() - 7)
    } else if (range === 'month') {
      start.setMonth(now.getMonth() - 1)
    } else if (range === 'all') {
      start = new Date(0) // beginning of time
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString()
    }
  }

  useEffect(() => {
    const bounds = getDateBounds(dateRange)
    getSalesReport(bounds).then(setSalesData)
    getStockReport().then(setStockData)
    getExpectedReconciliation(bounds, reconStaffId === 'all' ? null : reconStaffId).then(setExpectedTotals)
  }, [dateRange, reconStaffId])

  const handleSaveReconciliation = async () => {
    if (!expectedTotals) return
    setIsSavingRecon(true)
    const bounds = getDateBounds(dateRange)
    await saveReconciliation({
      date_start: bounds.startDate,
      date_end: bounds.endDate,
      staff_id: reconStaffId === 'all' ? null : reconStaffId,
      system_cash: expectedTotals.cash,
      actual_cash: Number(actualCash) || 0,
      system_pos: expectedTotals.pos,
      actual_pos: Number(actualPos) || 0,
      system_transfer: expectedTotals.transfer,
      actual_transfer: Number(actualTransfer) || 0,
      created_by: 'admin'
    })
    setIsSavingRecon(false)
    alert('Reconciliation saved successfully.')
    setActualCash('')
    setActualPos('')
    setActualTransfer('')
  }

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`

  return (
    <div className="flex-1 space-y-6 p-6 pb-20 md:pb-8 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Reconciliation</h1>
          <p className="text-muted-foreground mt-1">Analytics, inventory valuation, and end-of-day balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(val: string | null) => val && setDateRange(val as any)}>
            <SelectTrigger className="w-[180px] bg-white rounded-xl">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past 7 Days</SelectItem>
              <SelectItem value="month">Past 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sales" className="flex-col space-y-6 w-full">
        <div className="w-full">
          <TabsList className="bg-transparent p-0 h-auto w-full flex flex-wrap gap-2 justify-start sm:justify-center">
            <TabsTrigger value="sales" className="flex-1 sm:flex-none border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 rounded-xl shadow-sm">Sales & Profit</TabsTrigger>
            <TabsTrigger value="stock" className="flex-1 sm:flex-none border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 rounded-xl shadow-sm">Stock Report</TabsTrigger>
            <TabsTrigger value="recon" className="flex-1 sm:flex-none border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 rounded-xl shadow-sm">EOD Reconciliation</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales" className="space-y-6">
          {salesData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatMoney(salesData.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.transactionCount}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cost of Goods (COGS)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-muted-foreground">{formatMoney(salesData.cogs)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{formatMoney(salesData.grossProfit)}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader>
                    <CardTitle>Sales by Drug</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Drug</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.byDrug.map(d => (
                            <TableRow key={d.drugId}>
                              <TableCell className="font-medium">{d.drugName}</TableCell>
                              <TableCell className="text-right">{d.quantitySold}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.revenue)}</TableCell>
                              <TableCell className="text-right text-emerald-600">{formatMoney(d.profit)}</TableCell>
                            </TableRow>
                          ))}
                          {salesData.byDrug.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No sales data found.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="sm:hidden space-y-3">
                      {salesData.byDrug.map(d => (
                        <div key={d.drugId} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{d.drugName}</div>
                            <div className="text-xs text-muted-foreground">Qty: {d.quantitySold}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatMoney(d.revenue)}</div>
                            <div className="text-xs text-emerald-600">+{formatMoney(d.profit)}</div>
                          </div>
                        </div>
                      ))}
                      {salesData.byDrug.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No sales data found.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader>
                    <CardTitle>Sales by Staff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead className="text-right">Trans.</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.byStaff.map(s => (
                            <TableRow key={s.staffId}>
                              <TableCell className="font-medium">{s.staffName}</TableCell>
                              <TableCell className="text-right">{s.transactionCount}</TableCell>
                              <TableCell className="text-right">{formatMoney(s.revenue)}</TableCell>
                              <TableCell className="text-right text-emerald-600">{formatMoney(s.profit)}</TableCell>
                            </TableRow>
                          ))}
                           {salesData.byStaff.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No staff sales data found.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="sm:hidden space-y-3">
                      {salesData.byStaff.map(s => (
                        <div key={s.staffId} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{s.staffName}</div>
                            <div className="text-xs text-muted-foreground">{s.transactionCount} transactions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatMoney(s.revenue)}</div>
                            <div className="text-xs text-emerald-600">+{formatMoney(s.profit)}</div>
                          </div>
                        </div>
                      ))}
                      {salesData.byStaff.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No staff sales data found.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <Card className="rounded-[24px] shadow-sm">
            <CardHeader>
              <CardTitle>Inventory Valuation</CardTitle>
              <CardDescription>Current physical stock across all batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Inventory Value</div>
                <div className="text-3xl font-bold text-primary">
                  {formatMoney(stockData.reduce((acc, item) => acc + item.totalValue, 0))}
                </div>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-center">Expiring Batches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.map(d => (
                      <TableRow key={d.drugId}>
                        <TableCell className="font-medium">{d.drugName}</TableCell>
                        <TableCell className="text-right">{d.totalQuantity}</TableCell>
                        <TableCell className="text-right">{formatMoney(d.totalValue)}</TableCell>
                        <TableCell className="text-center">
                          {d.expiringBatches > 0 ? (
                            <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">
                              {d.expiringBatches}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {stockData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No active inventory found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="sm:hidden space-y-3">
                {stockData.map(d => (
                  <div key={d.drugId} className="flex justify-between items-start p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{d.drugName}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Qty: {d.totalQuantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-primary">{formatMoney(d.totalValue)}</div>
                      {d.expiringBatches > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {d.expiringBatches} expiring
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stockData.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No active inventory found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="space-y-6">
          <Card className="rounded-[24px] shadow-sm">
            <CardHeader>
              <CardTitle>End-of-Day Reconciliation</CardTitle>
              <CardDescription>Compare expected system totals against actual counted cash and settlements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 max-w-sm">
                <label className="text-sm font-medium mb-1.5 block">Filter by Staff</label>
                <Select value={reconStaffId} onValueChange={(val: string | null) => val && setReconStaffId(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {salesData?.byStaff.map(s => (
                      <SelectItem key={s.staffId} value={s.staffId}>{s.staffName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {expectedTotals && (
                <>
                  {/* Desktop View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Method</TableHead>
                          <TableHead className="text-right">System Expected</TableHead>
                          <TableHead className="text-right w-[200px]">Actual Counted</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Cash Row */}
                        <TableRow>
                          <TableCell className="font-medium">Cash</TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono">{formatMoney(expectedTotals.cash)}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="text-right font-mono"
                              value={actualCash}
                              onChange={(e) => setActualCash(e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const diff = (Number(actualCash) || 0) - expectedTotals.cash
                              return <span className={diff < 0 ? "text-red-500 font-bold" : diff > 0 ? "text-amber-500 font-bold" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </TableCell>
                        </TableRow>
                        
                        {/* POS/Card Row */}
                        <TableRow>
                          <TableCell className="font-medium">POS / Card</TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono">{formatMoney(expectedTotals.pos)}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="text-right font-mono"
                              value={actualPos}
                              onChange={(e) => setActualPos(e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const diff = (Number(actualPos) || 0) - expectedTotals.pos
                              return <span className={diff < 0 ? "text-red-500 font-bold" : diff > 0 ? "text-amber-500 font-bold" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </TableCell>
                        </TableRow>
                        
                        {/* Transfer Row */}
                        <TableRow>
                          <TableCell className="font-medium">Bank Transfer</TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono">{formatMoney(expectedTotals.transfer)}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="text-right font-mono"
                              value={actualTransfer}
                              onChange={(e) => setActualTransfer(e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const diff = (Number(actualTransfer) || 0) - expectedTotals.transfer
                              return <span className={diff < 0 ? "text-red-500 font-bold" : diff > 0 ? "text-amber-500 font-bold" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </TableCell>
                        </TableRow>
                        
                        {/* Total Row */}
                        <TableRow className="bg-muted/30">
                          <TableCell className="font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold font-mono">{formatMoney(expectedTotals.total)}</TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            {formatMoney((Number(actualCash) || 0) + (Number(actualPos) || 0) + (Number(actualTransfer) || 0))}
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            {(() => {
                              const actualTotal = (Number(actualCash) || 0) + (Number(actualPos) || 0) + (Number(actualTransfer) || 0)
                              const diff = actualTotal - expectedTotals.total
                              return <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="sm:hidden space-y-4">
                    {/* Cash Card */}
                    <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">Cash</div>
                        <div className="text-sm text-muted-foreground font-mono">Expected: {formatMoney(expectedTotals.cash)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">Actual Counted</label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="font-mono text-lg"
                            value={actualCash}
                            onChange={(e) => setActualCash(e.target.value)}
                          />
                        </div>
                        <div className="text-right w-1/3">
                          <label className="text-xs text-muted-foreground block mb-1">Difference</label>
                          <div className="font-mono font-bold pt-2">
                            {(() => {
                              const diff = (Number(actualCash) || 0) - expectedTotals.cash
                              return <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* POS Card */}
                    <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">POS / Card</div>
                        <div className="text-sm text-muted-foreground font-mono">Expected: {formatMoney(expectedTotals.pos)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">Actual Counted</label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="font-mono text-lg"
                            value={actualPos}
                            onChange={(e) => setActualPos(e.target.value)}
                          />
                        </div>
                        <div className="text-right w-1/3">
                          <label className="text-xs text-muted-foreground block mb-1">Difference</label>
                          <div className="font-mono font-bold pt-2">
                            {(() => {
                              const diff = (Number(actualPos) || 0) - expectedTotals.pos
                              return <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Card */}
                    <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">Bank Transfer</div>
                        <div className="text-sm text-muted-foreground font-mono">Expected: {formatMoney(expectedTotals.transfer)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">Actual Counted</label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="font-mono text-lg"
                            value={actualTransfer}
                            onChange={(e) => setActualTransfer(e.target.value)}
                          />
                        </div>
                        <div className="text-right w-1/3">
                          <label className="text-xs text-muted-foreground block mb-1">Difference</label>
                          <div className="font-mono font-bold pt-2">
                            {(() => {
                              const diff = (Number(actualTransfer) || 0) - expectedTotals.transfer
                              return <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                              </span>
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total Card */}
                    <div className="border-2 border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3 mt-4">
                      <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                        <div className="font-bold">Total Expected</div>
                        <div className="font-bold font-mono text-lg">{formatMoney(expectedTotals.total)}</div>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                        <div className="font-bold">Total Counted</div>
                        <div className="font-bold font-mono text-lg">
                          {formatMoney((Number(actualCash) || 0) + (Number(actualPos) || 0) + (Number(actualTransfer) || 0))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <div className="font-bold text-muted-foreground">Difference</div>
                        <div className="font-bold font-mono text-xl">
                          {(() => {
                            const actualTotal = (Number(actualCash) || 0) + (Number(actualPos) || 0) + (Number(actualTransfer) || 0)
                            const diff = actualTotal - expectedTotals.total
                            return <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                              {diff > 0 ? '+' : ''}{formatMoney(diff)}
                            </span>
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-8 flex justify-end">
                <Button onClick={handleSaveReconciliation} disabled={isSavingRecon}>
                  {isSavingRecon ? 'Saving...' : 'Save Reconciliation'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] shadow-sm mt-6">
            <CardHeader>
              <CardTitle>Reconciliation History</CardTitle>
            </CardHeader>
            <CardContent>
              <ReconciliationHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

function ReconciliationHistoryTable() {
  const [history, setHistory] = useState<ReconciliationRecord[]>([])
  
  const loadHistory = () => {
    getReconciliationHistory().then(setHistory)
  }

  useEffect(() => {
    loadHistory()
    // A proper solution might use an event bus or context to refresh this 
    // when a new reconciliation is saved, but we'll keep it simple here.
    const interval = setInterval(loadHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`

  return (
    <>
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Saved On</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Staff Filter</TableHead>
              <TableHead className="text-right">Total Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map(record => {
              const sysTotal = record.system_cash + record.system_pos + record.system_transfer
              const actualTotal = record.actual_cash + record.actual_pos + record.actual_transfer
              const diff = actualTotal - sysTotal
              
              return (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>
                    {format(new Date(record.date_start), 'MMM d, yyyy')} - {format(new Date(record.date_end), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{record.staff_id === null ? 'All Staff' : 'Filtered'}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                     <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                        {diff > 0 ? '+' : ''}{formatMoney(diff)}
                      </span>
                  </TableCell>
                </TableRow>
              )
            })}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No saved reconciliations found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sm:hidden space-y-3">
        {history.map(record => {
          const sysTotal = record.system_cash + record.system_pos + record.system_transfer
          const actualTotal = record.actual_cash + record.actual_pos + record.actual_transfer
          const diff = actualTotal - sysTotal
          
          return (
            <div key={record.id} className="p-4 border rounded-xl bg-card space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(record.date_start), 'MMM d, yy')} - {format(new Date(record.date_end), 'MMM d, yy')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium bg-muted px-2 py-1 rounded-md mb-1 inline-block">
                    {record.staff_id === null ? 'All Staff' : 'Filtered'}
                  </div>
                  <div className="font-mono font-bold text-sm">
                    <span className={diff < 0 ? "text-red-500" : diff > 0 ? "text-amber-500" : "text-emerald-500"}>
                      {diff > 0 ? '+' : ''}{formatMoney(diff)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {history.length === 0 && (
          <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No saved reconciliations found.</div>
        )}
      </div>
    </>
  )
}
