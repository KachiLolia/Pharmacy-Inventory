'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getSalesReport, getStockReport, getExpectedReconciliation, saveReconciliation, getReconciliationHistory, SalesReportData, StockReportItem, ExpectedReconciliationTotals } from '@/app/actions/reports'
import { ReconciliationRecord } from '@/lib/types'
import { format } from 'date-fns'
import { Download, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<SalesReportData | null>(null)
  const [stockData, setStockData] = useState<StockReportItem[]>([])
  
  // Sales Date Range
  const [salesStartDate, setSalesStartDate] = useState<string>('')
  const [salesEndDate, setSalesEndDate] = useState<string>('')
  const [salesSearchQuery, setSalesSearchQuery] = useState('')

  // Stock Search
  const [stockSearchQuery, setStockSearchQuery] = useState('')

  // Sorting state
  const [salesSort, setSalesSort] = useState<{ key: keyof SalesReportData['byDrug'][0], dir: 'asc' | 'desc' } | null>(null)
  const [stockSort, setStockSort] = useState<{ key: keyof StockReportItem, dir: 'asc' | 'desc' } | null>(null)

  // Reconciliation state
  const [reconStaffId, setReconStaffId] = useState<string>('all')
  const [reconStartDate, setReconStartDate] = useState<string>('')
  const [reconEndDate, setReconEndDate] = useState<string>('')
  const [expectedTotals, setExpectedTotals] = useState<ExpectedReconciliationTotals | null>(null)
  const [actualCash, setActualCash] = useState<string>('')
  const [actualPos, setActualPos] = useState<string>('')
  const [actualTransfer, setActualTransfer] = useState<string>('')
  const [isSavingRecon, setIsSavingRecon] = useState(false)

  // Fetch Logic
  const getBounds = (start: string, end: string) => {
    let startDateObj = new Date()
    startDateObj.setHours(0, 0, 0, 0)
    let endDateObj = new Date()
    endDateObj.setHours(23, 59, 59, 999)

    if (start) {
      startDateObj = new Date(start)
      startDateObj.setHours(0, 0, 0, 0)
    }
    if (end) {
      endDateObj = new Date(end)
      endDateObj.setHours(23, 59, 59, 999)
    }

    return {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString()
    }
  }

  useEffect(() => {
    const bounds = getBounds(salesStartDate, salesEndDate)
    getSalesReport(bounds).then(setSalesData)
  }, [salesStartDate, salesEndDate])

  useEffect(() => {
    getStockReport().then(setStockData)
  }, [])

  useEffect(() => {
    const bounds = getBounds(reconStartDate, reconEndDate)
    getExpectedReconciliation(bounds, reconStaffId === 'all' ? null : reconStaffId).then(setExpectedTotals)
  }, [reconStartDate, reconEndDate, reconStaffId])

  const handleSaveReconciliation = async () => {
    if (!expectedTotals) return
    setIsSavingRecon(true)
    const bounds = getBounds(reconStartDate, reconEndDate)
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

  const handleSortSales = (key: keyof SalesReportData['byDrug'][0]) => {
    setSalesSort(prev => {
      if (prev?.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' }
        return null // turn off sorting
      }
      return { key, dir: 'asc' }
    })
  }

  const handleSortStock = (key: keyof StockReportItem) => {
    setStockSort(prev => {
      if (prev?.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' }
        return null
      }
      return { key, dir: 'asc' }
    })
  }

  const renderSortIcon = (currentSort: { key: string, dir: 'asc' | 'desc' } | null, key: string) => {
    if (currentSort?.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground opacity-50" />
    return currentSort.dir === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />
  }

  // Filtering Data
  const filteredSalesData = useMemo(() => {
    if (!salesData) return null
    let data = salesData.byDrug
    if (salesSearchQuery) {
      const q = salesSearchQuery.toLowerCase()
      data = data.filter(d => d.drugName.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q))
    }
    if (salesSort) {
      data = [...data].sort((a, b) => {
        const valA = a[salesSort.key]
        const valB = b[salesSort.key]
        if (valA < valB) return salesSort.dir === 'asc' ? -1 : 1
        if (valA > valB) return salesSort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return {
      ...salesData,
      byDrug: data
    }
  }, [salesData, salesSearchQuery, salesSort])

  const filteredStockData = useMemo(() => {
    let data = stockData
    if (stockSearchQuery) {
      const q = stockSearchQuery.toLowerCase()
      data = data.filter(d => d.drugName.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q))
    }
    if (stockSort) {
      data = [...data].sort((a, b) => {
        const valA = a[stockSort.key]
        const valB = b[stockSort.key]
        if (valA < valB) return stockSort.dir === 'asc' ? -1 : 1
        if (valA > valB) return stockSort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return data
  }, [stockData, stockSearchQuery, stockSort])

  // CSV Downloads
  const downloadSalesCSV = () => {
    if (!filteredSalesData) return
    const headers = ['Drug', 'Brand', 'Qty Sold', 'Revenue', 'Profit']
    const rows = filteredSalesData.byDrug.map(d => [
      `"${d.drugName}"`,
      `"${d.brand}"`,
      d.quantitySold,
      d.revenue.toFixed(2),
      d.profit.toFixed(2)
    ])
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    triggerDownload(csvContent, 'sales_report')
  }

  const downloadStockCSV = () => {
    const headers = ['Drug', 'Brand', 'Qty Issued', 'Qty Sold', 'Qty Left', 'Total Value']
    const rows = filteredStockData.map(d => [
      `"${d.drugName}"`,
      `"${d.brand}"`,
      d.qtyIssued,
      d.qtySold,
      d.qtyLeft,
      d.totalValue.toFixed(2)
    ])
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    triggerDownload(csvContent, 'stock_report')
  }

  const triggerDownload = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${prefix}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 space-y-6 p-6 pb-20 md:pb-8 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Reconciliation</h1>
          <p className="text-muted-foreground mt-1">Analytics, inventory valuation, and end-of-day balances.</p>
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
          {filteredSalesData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatMoney(filteredSalesData.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredSalesData.transactionCount}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cost of Goods (COGS)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-muted-foreground">{formatMoney(filteredSalesData.cogs)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{formatMoney(filteredSalesData.grossProfit)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[24px] shadow-sm w-full">
                <CardHeader className="flex flex-col md:flex-row md:items-start justify-between pb-4 gap-4">
                  <div>
                    <CardTitle>Sales by Drug</CardTitle>
                    <CardDescription>Breakdown of sales and profit per item.</CardDescription>
                  </div>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search drug or brand..."
                        value={salesSearchQuery}
                        onChange={(e) => setSalesSearchQuery(e.target.value)}
                        className="h-8 pl-8 w-full md:w-[200px] lg:w-[250px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
                          <Filter className="h-4 w-4" />
                          Date Filter
                          {(salesStartDate || salesEndDate) && <span className="flex h-2 w-2 rounded-full bg-primary" />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium">From Date</label>
                            <Input 
                              type="date" 
                              value={salesStartDate} 
                              onChange={e => setSalesStartDate(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium">To Date</label>
                            <Input 
                              type="date" 
                              value={salesEndDate} 
                              onChange={e => setSalesEndDate(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          {(salesStartDate || salesEndDate) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => { setSalesStartDate(''); setSalesEndDate(''); }}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none" onClick={downloadSalesCSV}>
                        <Download className="h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortSales('drugName')}>Drug{renderSortIcon(salesSort, 'drugName')}</TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortSales('brand')}>Brand{renderSortIcon(salesSort, 'brand')}</TableHead>
                          <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortSales('quantitySold')}>Qty Sold{renderSortIcon(salesSort, 'quantitySold')}</TableHead>
                          <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortSales('revenue')}>Revenue{renderSortIcon(salesSort, 'revenue')}</TableHead>
                          <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortSales('profit')}>Profit{renderSortIcon(salesSort, 'profit')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesData.byDrug.map(d => (
                          <TableRow key={d.drugId}>
                            <TableCell className="font-medium">{d.drugName}</TableCell>
                            <TableCell className="text-muted-foreground">{d.brand}</TableCell>
                            <TableCell className="text-right">{d.quantitySold}</TableCell>
                            <TableCell className="text-right font-medium">{formatMoney(d.revenue)}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold">{formatMoney(d.profit)}</TableCell>
                          </TableRow>
                        ))}
                        {filteredSalesData.byDrug.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No sales data found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden space-y-3">
                    {filteredSalesData.byDrug.map(d => (
                      <div key={d.drugId} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{d.drugName}</div>
                          <div className="text-xs text-muted-foreground">{d.brand}</div>
                          <div className="text-xs text-muted-foreground mt-1">Qty: {d.quantitySold}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatMoney(d.revenue)}</div>
                          <div className="text-xs font-bold text-emerald-600 mt-1">+{formatMoney(d.profit)}</div>
                        </div>
                      </div>
                    ))}
                    {filteredSalesData.byDrug.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No sales data found.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <Card className="rounded-[24px] shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-start justify-between pb-4 gap-4">
              <div>
                <CardTitle>Inventory Valuation</CardTitle>
                <CardDescription>Current physical stock and movements across all batches</CardDescription>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search drug or brand..."
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    className="h-8 pl-8 w-full md:w-[200px] lg:w-[250px]"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none" onClick={downloadStockCSV}>
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Inventory Value</div>
                <div className="text-3xl font-bold text-primary">
                  {formatMoney(filteredStockData.reduce((acc, item) => acc + item.totalValue, 0))}
                </div>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('drugName')}>Drug{renderSortIcon(stockSort, 'drugName')}</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('brand')}>Brand{renderSortIcon(stockSort, 'brand')}</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('qtyIssued')}>Qty Issued{renderSortIcon(stockSort, 'qtyIssued')}</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('qtySold')}>Qty Sold{renderSortIcon(stockSort, 'qtySold')}</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('qtyLeft')}>Qty Left{renderSortIcon(stockSort, 'qtyLeft')}</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSortStock('totalValue')}>Total Value{renderSortIcon(stockSort, 'totalValue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStockData.map(d => (
                      <TableRow key={d.drugId}>
                        <TableCell className="font-medium">{d.drugName}</TableCell>
                        <TableCell className="text-muted-foreground">{d.brand}</TableCell>
                        <TableCell className="text-right">{d.qtyIssued}</TableCell>
                        <TableCell className="text-right">{d.qtySold}</TableCell>
                        <TableCell className="text-right font-bold">{d.qtyLeft}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(d.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredStockData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No active inventory found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="sm:hidden space-y-3">
                {filteredStockData.map(d => (
                  <div key={d.drugId} className="flex flex-col gap-2 p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{d.drugName}</div>
                        <div className="text-xs text-muted-foreground">{d.brand}</div>
                      </div>
                      <div className="text-right font-medium text-primary">{formatMoney(d.totalValue)}</div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 border-t pt-2">
                      <div className="text-center"><span className="block font-medium text-foreground">{d.qtyIssued}</span> Issued</div>
                      <div className="text-center"><span className="block font-medium text-foreground">{d.qtySold}</span> Sold</div>
                      <div className="text-center"><span className="block font-bold text-foreground">{d.qtyLeft}</span> Left</div>
                    </div>
                  </div>
                ))}
                {filteredStockData.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">No active inventory found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="space-y-6">
          <Card className="rounded-[24px] shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-start justify-between pb-4 gap-4">
              <div>
                <CardTitle>End-of-Day Reconciliation</CardTitle>
                <CardDescription>Compare expected system totals against actual counted cash and settlements.</CardDescription>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
                    <Filter className="h-4 w-4" />
                    Date Filter
                    {(reconStartDate || reconEndDate) && <span className="flex h-2 w-2 rounded-full bg-primary" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">From Date</label>
                      <Input 
                        type="date" 
                        value={reconStartDate} 
                        onChange={e => setReconStartDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">To Date</label>
                      <Input 
                        type="date" 
                        value={reconEndDate} 
                        onChange={e => setReconEndDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    {(reconStartDate || reconEndDate) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => { setReconStartDate(''); setReconEndDate(''); }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                    {/* Note: since byStaff was removed from salesData, this part needs updating. For now we use actual user list or remove staff filter. We'll leave it as "All Staff" only if not available. */}
                    <SelectItem value="system">System (Staff options disabled)</SelectItem>
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
