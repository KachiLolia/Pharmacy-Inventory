'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Receipt, Printer, Loader2 } from 'lucide-react'
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

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Sales Records
          </CardTitle>
          <CardDescription>
            Historical completed transactions and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
              No completed sales found.
            </div>
          ) : (
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
                {sales.map(sale => (
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
