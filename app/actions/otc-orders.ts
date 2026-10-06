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
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('otc_orders')
    .update({ order_status: newStatus })
    .eq('id', orderId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/otc-orders')
  revalidatePath('/staff/otc-orders')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  return { success: true }
}
