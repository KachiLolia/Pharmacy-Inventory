'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cancelPrescription } from '@/app/actions/pos'
import type { Prescription } from '@/lib/mock-data/prescriptions'
import type { DrugWithStock } from '@/app/actions/drugs'
import { Loader2, XCircle, Clock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PaymentConfirmDialog } from './payment-confirm-dialog'

export function PendingPrescriptions({ prescriptions, drugs }: { prescriptions: Prescription[], drugs: DrugWithStock[] }) {
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingPrescription, setConfirmingPrescription] = useState<Prescription | null>(null)

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this prescription? This will release the reserved stock.")) return
    
    setCancellingId(id)
    try {
      await cancelPrescription(id)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to cancel prescription.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-primary/5 mt-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Prescriptions
        </CardTitle>
        <CardDescription>
          Prescriptions waiting for payment confirmation. Stock is currently reserved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
            No pending prescriptions found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Prescription ID</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Staff/Admin</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {new Date(p.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {p.id.toUpperCase()}
                  </TableCell>
                  <TableCell className="font-bold">
                    ₦{p.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.created_by}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCancel(p.id)}
                        disabled={cancellingId === p.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                      >
                        {cancellingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setConfirmingPrescription(p)}
                        disabled={cancellingId === p.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm Payment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {confirmingPrescription && (
        <PaymentConfirmDialog
          prescription={confirmingPrescription}
          drugs={drugs}
          open={!!confirmingPrescription}
          onOpenChange={(open) => {
            if (!open) setConfirmingPrescription(null)
          }}
        />
      )}
    </Card>
  )
}
