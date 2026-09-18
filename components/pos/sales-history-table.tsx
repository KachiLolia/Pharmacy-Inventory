'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Receipt, Printer, Loader2, Download, Filter, Search } from 'lucide-react'
import type { Prescription, PrescriptionItem } from '@/lib/mock-data/prescriptions'
import type { DrugWithStock } from '@/app/actions/drugs'
import { getPrescriptionItems } from '@/app/actions/pos'
import { ReceiptPrinter } from './receipt-printer'
import { RefundDialog } from './refund-dialog'

interface SalesHistoryTableProps {
  sales: Prescription[]
  drugs: DrugWithStock[]
  isAdmin?: boolean
}

export function SalesHistoryTable({ sales, drugs, isAdmin = false }: SalesHistoryTableProps) {
  const [selectedSale, setSelectedSale] = useState<Prescription | null>(null)
  const [refundSale, setRefundSale] = useState<Prescription | null>(null)
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const handleViewReceipt = async (sale: Prescription) => {
    setSelectedSale(sale)
    await loadItems(sale.id)
  }

  const handleOpenRefund = async (sale: Prescription) => {
    setRefundSale(sale)
    await loadItems(sale.id)
  }

  const loadItems = async (prescriptionId: string) => {
    setLoadingItems(true)
    try {
      const fetchedItems = await getPrescriptionItems(prescriptionId)
      setItems(fetchedItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingItems(false)
    }
  }

  const closeReceipt = () => {
    setSelectedSale(null)
    setItems([])
  }

  const handlePrint = () => {
    window.print()
  }

  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSales = sales.filter(sale => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesReceipt = sale.receipt_number?.toLowerCase().includes(query)
      const matchesAmount = sale.total_amount.toString().includes(query)
      if (!matchesReceipt && !matchesAmount) return false
    }

    if (!startDate && !endDate) return true
    const saleDate = new Date(sale.confirmed_at || sale.created_at)
    
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (saleDate < start) return false
    }
    
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (saleDate > end) return false
    }
    
    return true
  })

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Receipt No', 'Cashier', 'Method', 'Total Amount']
    const rows = filteredSales.map(s => [
      `"${new Date(s.confirmed_at || s.created_at).toLocaleString()}"`,
      s.receipt_number || 'N/A',
      s.created_by,
      s.payment_method || 'N/A',
      s.total_amount.toFixed(2)
    ])
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_records_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-primary/5">
        <CardHeader className="flex flex-col md:flex-row md:items-start justify-between pb-4 gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Sales Records
            </CardTitle>
            <CardDescription className="mt-1.5">
              Historical completed transactions and receipts.
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search receipt or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 w-full md:w-[200px] lg:w-[250px]"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
                  <Filter className="h-4 w-4" />
                  Filter
                  {(startDate || endDate) && <span className="flex h-2 w-2 rounded-full bg-primary" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">From Date</label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">To Date</label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
  
              <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none" onClick={handleDownloadCSV}>
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
              No completed sales found for this period.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(sale.confirmed_at || sale.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">
                          {sale.receipt_number || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {sale.created_by}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {sale.payment_method || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₦{sale.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewReceipt(sale)}
                          >
                            View Receipt
                          </Button>
                          
                          {isAdmin && sale.refund_status !== 'full' && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleOpenRefund(sale)}
                            >
                              Process Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredSales.map(sale => (
                  <div key={sale.id} className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-lg text-primary">₦{sale.total_amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(sale.confirmed_at || sale.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-medium bg-muted px-2 py-1 rounded-md">
                          {sale.receipt_number || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize mt-2 flex justify-end gap-1 items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                          {sale.payment_method || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewReceipt(sale)}
                      >
                        Receipt
                      </Button>
                      
                      {isAdmin && sale.refund_status !== 'full' && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleOpenRefund(sale)}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && closeReceipt()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipt Details
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loadingItems ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedSale ? (
              <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
                <ReceiptPrinter 
                  prescription={selectedSale} 
                  items={items} 
                  drugs={drugs} 
                  visible={true}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={closeReceipt}>Close</Button>
            <Button onClick={handlePrint} className="gap-2" disabled={loadingItems}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RefundDialog 
        prescription={refundSale}
        items={items}
        drugs={drugs}
        open={!!refundSale}
        onOpenChange={(open) => {
          if (!open) {
            setRefundSale(null)
            setItems([])
          }
        }}
        onSuccess={() => {
          setRefundSale(null)
          setItems([])
        }}
      />
    </>
  )
}
