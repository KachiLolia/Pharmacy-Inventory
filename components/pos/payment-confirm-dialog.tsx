'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { confirmPayment, getPrescriptionItems } from '@/app/actions/pos'
import type {  Prescription, PrescriptionItem  } from '@/lib/types'
import type { DrugWithStock } from '@/app/actions/drugs'
import { ReceiptPrinter } from './receipt-printer'
import { Loader2, CheckCircle2, CreditCard, Banknote, Building, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PaymentConfirmDialogProps {
  prescription: Prescription
  drugs: DrugWithStock[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PaymentMethod = 'cash' | 'card' | 'transfer'

export function PaymentConfirmDialog({ prescription, drugs, open, onOpenChange }: PaymentConfirmDialogProps) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [completedPrescription, setCompletedPrescription] = useState<Prescription | null>(null)
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && completedPrescription) {
      // If closing after completion, reset state and refresh
      setCompletedPrescription(null)
      setMethod(null)
      setItems([])
      router.refresh()
    }
    onOpenChange(isOpen)
  }

  const handleConfirm = async () => {
    if (!method) return
    setLoading(true)
    setError(null)
    try {
      // Fetch items first so we have them for the receipt
      const fetchedItems = await getPrescriptionItems(prescription.id)
      setItems(fetchedItems)

      const result = await confirmPayment(prescription.id, method)
      
      setCompletedPrescription({
        ...prescription,
        status: 'completed',
        payment_method: method,
        receipt_number: result.receipt_number,
        confirmed_at: result.confirmed_at
      })
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {!completedPrescription ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                Select the payment method used to collect <strong className="text-foreground">₦{prescription.total_amount.toFixed(2)}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-4">
              <Button
                variant={method === 'cash' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setMethod('cash')}
                disabled={loading}
              >
                <Banknote className="h-6 w-6" />
                <span>Cash</span>
              </Button>
              <Button
                variant={method === 'card' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setMethod('card')}
                disabled={loading}
              >
                <CreditCard className="h-6 w-6" />
                <span>POS / Card</span>
              </Button>
              <Button
                variant={method === 'transfer' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setMethod('transfer')}
                disabled={loading}
              >
                <Building className="h-6 w-6" />
                <span>Transfer</span>
              </Button>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!method || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                Transaction Complete
              </DialogTitle>
              <DialogDescription>
                Payment confirmed and stock deducted.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center gap-4 bg-muted/20 rounded-lg my-4">
              <p className="text-sm text-muted-foreground">Receipt Number</p>
              <p className="font-mono text-lg font-bold">{completedPrescription.receipt_number}</p>
            </div>

            {/* Hidden Receipt component for printing */}
            <ReceiptPrinter 
              prescription={completedPrescription} 
              items={items} 
              drugs={drugs} 
            />

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
