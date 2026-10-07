'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { updateOrderStatus, type OTCOrder } from '@/app/actions/otc-orders'
import { Package, Truck, Store, MapPin, Phone, User, Clock, Loader2, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function OrderStatusBadge({ status }: { status: OTCOrder['order_status'] }) {
  const map: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    processing: { label: 'Processing', variant: 'secondary' },
    ready_for_pickup: { label: 'Ready for Pickup', variant: 'default' },
    out_for_delivery: { label: 'Out for Delivery', variant: 'default' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  }
  const config = map[status] || { label: status, variant: 'outline' }
  // Using standard shadcn variants, falling back for custom ones
  return <Badge variant={config.variant as any} className={
    config.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
    config.variant === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''
  }>{config.label}</Badge>
}

export function OrdersTable({ orders, role }: { orders: OTCOrder[], role: 'admin' | 'staff' }) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OTCOrder | null>(null)

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId)
      await updateOrderStatus(orderId, newStatus as OTCOrder['order_status'])
    } catch (err: any) {
      alert(err.message || 'Failed to update order status')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-primary/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Storefront Orders
          </CardTitle>
          <CardDescription>
            Manage online orders from the WhatsApp storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              No orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        {order.fulfillment_method === 'delivery' ? (
                          <><Truck className="w-4 h-4 text-blue-500" /> Delivery</>
                        ) : (
                          <><Store className="w-4 h-4 text-amber-500" /> Pickup</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ₦{order.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className={order.payment_status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {order.payment_status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {updating === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : null}
                        <Select 
                          value={order.order_status} 
                          onValueChange={(val) => handleStatusChange(order.id as string, val as string)}
                          disabled={updating === order.id || order.order_status === 'completed' || order.order_status === 'cancelled'}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                        <Info className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground block text-xs uppercase font-semibold tracking-wider">Customer</span>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {selectedOrder.customer_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {selectedOrder.customer_phone}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-muted-foreground block text-xs uppercase font-semibold tracking-wider">Fulfillment</span>
                  <div className="flex items-center gap-2">
                    {selectedOrder.fulfillment_method === 'delivery' ? (
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="capitalize">{selectedOrder.fulfillment_method}</span>
                  </div>
                  {selectedOrder.fulfillment_method === 'delivery' && selectedOrder.delivery_address && (
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{selectedOrder.delivery_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-muted-foreground block text-xs uppercase font-semibold tracking-wider border-b pb-2">Line Items</span>
                <div className="space-y-2">
                  {selectedOrder.line_items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">{item.name} {item.dose}</div>
                        <div className="text-xs text-muted-foreground">{item.quantity} × ₦{(item.unit_price || 0).toLocaleString()}</div>
                      </div>
                      <div className="font-semibold">
                        ₦{(item.subtotal || (item.quantity * (item.unit_price || 0))).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t font-bold text-lg">
                  <span>Total</span>
                  <span>₦{selectedOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Payment Reference</div>
                  <div className="font-mono">{selectedOrder.payment_reference || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-0.5">Receipt Number</div>
                  <div className="font-mono font-medium">{selectedOrder.receipt_number || 'Pending'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
