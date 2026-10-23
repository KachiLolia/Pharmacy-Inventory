'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type OTCOrder = {
  id: string
  customer_name: string
  customer_phone: string
  fulfillment_method: 'pickup' | 'delivery'
  delivery_address: string | null
  line_items: any[]
  total_amount: number
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'pending' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled'
  receipt_number: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
}

export async function getOTCOrders(statusFilter?: OTCOrder['order_status']) {
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()

  let query = supabase
    .from('otc_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('order_status', statusFilter)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data as OTCOrder[]
}

export async function updateOrderStatus(orderId: string, newStatus: OTCOrder['order_status']) {
  const { user } = await requireAuth(['admin', 'staff'])
  const supabase = await createClient()

  if (newStatus === 'completed') {
    // Atomically complete the order, decrement inventory from batches (FEFO),
    // and write the sale ledger record to public.prescriptions with payment_method: 'online'
    const { error: rpcErr } = await supabase.rpc('complete_otc_order', {
      p_order_id: orderId,
      p_user_id: user.id
    })

    if (rpcErr) {
      console.error('Error completing OTC order via RPC:', rpcErr)
      throw new Error(rpcErr.message || 'Failed to complete order and deduct stock.')
    }
  } else {
    // If order is cancelled, release any lingering stock reservations
    if (newStatus === 'cancelled') {
      try {
        const { data: order } = await supabase
          .from('otc_orders')
          .select('line_items')
          .eq('id', orderId)
          .single()

        if (order?.line_items && Array.isArray(order.line_items)) {
          for (const item of order.line_items) {
            if (item.reservation_id) {
              await supabase.rpc('release_hold', { p_reservation_id: item.reservation_id })
            }
          }
        }
      } catch (cancelErr) {
        console.warn('Hold release on cancellation skipped:', cancelErr)
      }
    }

    const { error } = await supabase
      .from('otc_orders')
      .update({ order_status: newStatus })
      .eq('id', orderId)

    if (error) throw new Error(error.message)
  }

  // Refresh low stock & expiry alert evaluations
  try {
    const { evaluateAlerts } = await import('@/app/actions/alerts')
    await evaluateAlerts()
  } catch (alertErr) {
    console.warn('Alert evaluation skipped:', alertErr)
  }

  revalidatePath('/admin/otc-orders')
  revalidatePath('/staff/otc-orders')
  revalidatePath('/admin/sales')
  revalidatePath('/staff/sales')
  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  revalidatePath('/admin/otc')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  return { success: true }
}
