'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCcw } from 'lucide-react'
import type {  RefundLog, Prescription  } from '@/lib/types'

interface RefundsTableProps {
  logs: RefundLog[]
  prescriptions: Prescription[] // To show receipt number
}

export function RefundsTable({ logs, prescriptions }: RefundsTableProps) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-destructive" />
          Refund Logs
        </CardTitle>
        <CardDescription>
          Immutable audit trail of all processed refunds and stock reversals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
            No refunds have been processed.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                <TableHead>Receipt No.</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-center">Restocked</TableHead>
                <TableHead className="text-right">Amount Refunded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => {
                const prescription = prescriptions.find(p => p.id === log.prescription_id)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {prescription?.receipt_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {log.item_name || 'Unknown Item'}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {log.quantity || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={log.reason}>
                      {log.reason}
                    </TableCell>
                    <TableCell className="text-center">
                      {log.restocked ? (
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      ₦{log.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
