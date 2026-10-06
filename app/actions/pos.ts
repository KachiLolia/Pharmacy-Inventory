'use server'

import { createClient, createAdminClient, requireAuth } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export type CartItem = {
  drug_id: string
  required_quantity: number
}

export type AllocatedBatch = {
  batch_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type FEFOAllocation = {
  drug_id: string
  allocated_batches: AllocatedBatch[]
  total_quantity: number
  total_price: number
}

export async function calculateFEFOAllocation(cartItems: CartItem[]): Promise<FEFOAllocation[]> {
  const supabase = await createClient()
  const allocations: FEFOAllocation[] = []

  for (const item of cartItems) {
    const { data: drugBatches, error } = await supabase
      .from('batches')
      .select('*')
      .eq('drug_id', item.drug_id)
      .order('expiry_date', { ascending: true })

    if (error) throw new Error(error.message)

    let remainingToFulfill = item.required_quantity
    const allocatedBatches: AllocatedBatch[] = []
    let total_price = 0

    for (const batch of drugBatches) {
      if (remainingToFulfill <= 0) break
      
      if (new Date(batch.expiry_date) < new Date()) continue

      const available = batch.quantity_remaining - batch.reserved_quantity
      if (available <= 0) continue

      const allocateQty = Math.min(available, remainingToFulfill)
      const subtotal = allocateQty * batch.selling_price_per_unit

      allocatedBatches.push({
        batch_id: batch.id,
        quantity: allocateQty,
        unit_price: batch.selling_price_per_unit,
        subtotal
      })

      remainingToFulfill -= allocateQty
      total_price += subtotal
    }

    if (remainingToFulfill > 0) {
      throw new Error(`Insufficient stock for drug ID ${item.drug_id}.`)
    }

    allocations.push({
      drug_id: item.drug_id,
      allocated_batches: allocatedBatches,
      total_quantity: item.required_quantity,
      total_price
    })
  }

  return allocations
}

export async function createPrescription(cartItems: CartItem[]) {
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()

  const rpcItems = cartItems.map(item => ({
    drug_id: item.drug_id,
    quantity: item.required_quantity
  }))

  const { data, error } = await supabase.rpc('reserve_stock', { p_items: rpcItems, p_source: 'pos' })
  
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to create prescription')

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true, prescription_id: data }
}

export async function cancelPrescription(prescriptionId: string) {
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()
  
  const { error } = await supabase.rpc('release_hold', { p_reservation_id: prescriptionId })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true }
}

export async function getPendingPrescriptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('*, stock_reservation_items(quantity, unit_price)')
    .eq('status', 'pending')
    .eq('source', 'pos')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  
  return data.map((res: any) => {
    const total_amount = res.stock_reservation_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
    return {
      id: res.id,
      status: res.status,
      created_at: res.created_at,
      total_amount,
      created_by: 'Staff'
    }
  })
}

export async function getCompletedPrescriptions(isAdmin: boolean = false) {
  const { user } = await requireAuth(['admin', 'staff'])
  const supabase = await createAdminClient()

  let query = supabase
    .from('prescriptions')
    .select('*')
    .eq('status', 'completed')
    .order('confirmed_at', { ascending: false })

  // Fetch all completed sales, no staff-specific filtering as requested
  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getPrescriptionItems(prescriptionId: string) {
  const supabase = await createAdminClient()
  // Depending on whether it is pending (stock_reservations) or completed (prescriptions)
  // For POS pending UI, we query stock_reservation_items
  const { data: resData } = await supabase
    .from('stock_reservation_items')
    .select('*')
    .eq('reservation_id', prescriptionId)

  if (resData && resData.length > 0) {
    return resData.map((item: any) => ({ ...item, prescription_id: item.reservation_id }))
  }

  const { data, error } = await supabase
    .from('prescription_items')
    .select('*')
    .eq('prescription_id', prescriptionId)

  if (error) throw new Error(error.message)
  return data
}

export async function confirmPayment(prescriptionId: string, paymentMethod: 'cash' | 'card' | 'transfer') {
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('confirm_sale', {
    p_reservation_id: prescriptionId,
    p_channel: 'pos',
    p_payment_ref: paymentMethod
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to confirm payment')

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  await evaluateAlerts()
  
  // Actually we need to fetch the newly created prescription to get the receipt number if needed,
  // since confirm_sale returns the prescription_id now.
  const { data: saleData } = await supabase.from('prescriptions').select('receipt_number, confirmed_at').eq('id', data).single()

  return { success: true, receipt_number: saleData?.receipt_number || data, confirmed_at: saleData?.confirmed_at || new Date().toISOString() }
}
