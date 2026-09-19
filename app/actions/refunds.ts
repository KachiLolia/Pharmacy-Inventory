'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export type RefundItemParams = {
  itemId: string
  quantityToRefund: number
}

export async function getRefundLogs() {
  await requireAuth(['admin'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('refund_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function processRefund(
  prescriptionId: string, 
  refundItems: RefundItemParams[], 
  restock: boolean, 
  reason: string
) {
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()

  if (!reason || reason.trim() === '') {
    throw new Error('A reason is required to process a refund')
  }

  // SUPABASE IMPLEMENTATION
  const { data: prescription, error: pError } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .single()

  if (pError || !prescription) throw new Error('Prescription not found')
  if (prescription.status !== 'completed') throw new Error('Only completed sales can be refunded')

  const { data: items, error: iError } = await supabase
    .from('prescription_items')
    .select('*, drugs(name, dose)')
    .eq('prescription_id', prescriptionId)

  if (iError || !items) throw new Error('Could not fetch prescription items')

  let totalRefundAmount = 0
  const processedRefunds: { item_id: string, amount: number, qty: number, batch_id: string, item_name: string }[] = []

  // 1. Validation
  for (const reqItem of refundItems) {
    if (reqItem.quantityToRefund <= 0) continue

    const item = items.find((i: any) => i.id === reqItem.itemId)
    if (!item) throw new Error(`Item ${reqItem.itemId} not found`)

    const alreadyRefunded = item.refunded_quantity || 0
    const availableToRefund = item.quantity - alreadyRefunded

    if (reqItem.quantityToRefund > availableToRefund) {
      throw new Error(`Cannot refund more than was sold for item ${item.id}`)
    }

    if (restock) {
      const { data: batch } = await supabase.from('batches').select('expiry_date').eq('id', item.batch_id).single()
      if (!batch) throw new Error(`Original batch ${item.batch_id} not found`)
      
      if (new Date(batch.expiry_date) < new Date()) {
        throw new Error('Cannot return items to an expired batch')
      }
    }

    const itemName = item.drugs ? `${item.drugs.name} ${item.drugs.dose}` : 'Unknown Item'

    const refundAmount = reqItem.quantityToRefund * item.unit_price
    totalRefundAmount += refundAmount
    processedRefunds.push({ 
      item_id: item.id, 
      amount: refundAmount, 
      qty: reqItem.quantityToRefund, 
      batch_id: item.batch_id,
      item_name: itemName
    })
  }

  if (totalRefundAmount === 0) throw new Error('No items selected for refund')

  // 2. Execution
  for (const refund of processedRefunds) {
    const item = items.find((i: any) => i.id === refund.item_id)!
    
    await supabase
      .from('prescription_items')
      .update({ refunded_quantity: (item.refunded_quantity || 0) + refund.qty })
      .eq('id', refund.item_id)

    if (restock) {
      const { data: batch } = await supabase.from('batches').select('quantity_remaining').eq('id', refund.batch_id).single()
      if (batch) {
        await supabase
          .from('batches')
          .update({ quantity_remaining: batch.quantity_remaining + refund.qty })
          .eq('id', refund.batch_id)
      }
    }

    await supabase
      .from('refund_logs')
      .insert([{
        prescription_id: prescriptionId,
        processed_by: user.id, // Supabase user ID
        item_name: refund.item_name,
        quantity: refund.qty,
        reason,
        amount: refund.amount,
        restocked: restock
      }])
  }

  const currentRefundedAmount = prescription.refunded_amount || 0
  const newRefundedAmount = currentRefundedAmount + totalRefundAmount
  const isFullRefund = newRefundedAmount >= prescription.total_amount

  await supabase
    .from('prescriptions')
    .update({
      refunded_amount: newRefundedAmount,
      refund_status: isFullRefund ? 'full' : 'partial'
    })
    .eq('id', prescriptionId)

  revalidatePath('/admin/sales')
  revalidatePath('/staff/sales')
  revalidatePath('/admin/pos')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  await evaluateAlerts()
  
  return { success: true, refunded_amount: totalRefundAmount }
}
