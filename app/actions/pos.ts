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

  // 1. Calculate allocations securely on the server
  const allocations = await calculateFEFOAllocation(cartItems)
  
  // Flatten allocations into a JSON array for the RPC
  const rpcItems: any[] = []
  for (const alloc of allocations) {
    for (const ab of alloc.allocated_batches) {
      rpcItems.push({
        drug_id: alloc.drug_id,
        batch_id: ab.batch_id,
        quantity: ab.quantity
      })
    }
  }

  const { data, error } = await supabase.rpc('pos_create_prescription', { p_items: rpcItems })
  
  if (error) throw new Error(error.message)
  if (!data.success) throw new Error('Failed to create prescription')

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true, prescription_id: data.prescription_id }
}

export async function cancelPrescription(prescriptionId: string) {
  await requireAuth(['admin', 'staff'])
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('pos_cancel_prescription', { p_prescription_id: prescriptionId })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true }
}

export async function getPendingPrescriptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
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

  const { data, error } = await supabase.rpc('pos_confirm_payment', {
    p_prescription_id: prescriptionId,
    p_payment_method: paymentMethod
  })

  if (error) throw new Error(error.message)
  if (!data.success) throw new Error('Failed to confirm payment')

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  await evaluateAlerts()
  
  return { success: true, receipt_number: data.receipt_number, confirmed_at: data.confirmed_at }
}
