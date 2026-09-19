'use server'

import { requireAuth, createClient } from '@/lib/supabase/server'
import { type StockAdjustment } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export async function adjustStock(data: {
  batch_id: string
  drug_id: string
  adjustment_type: 'increase' | 'decrease'
  quantity: number
  reason: string
  notes?: string
}) {
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()
  const adjusted_by = user.id

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('quantity_remaining, reserved_quantity')
    .eq('id', data.batch_id)
    .single()

  if (batchError || !batch) throw new Error('Batch not found')

  if (data.quantity <= 0) throw new Error('Quantity must be greater than 0')

  const previous_quantity = batch.quantity_remaining
  let resulting_quantity = previous_quantity

  if (data.adjustment_type === 'increase') {
    resulting_quantity += data.quantity
  } else {
    if (previous_quantity - data.quantity < batch.reserved_quantity) {
      throw new Error('Cannot reduce stock below reserved quantity')
    }
    resulting_quantity -= data.quantity
  }

  // Update batch
  const { error: updateError } = await supabase
    .from('batches')
    .update({ quantity_remaining: resulting_quantity })
    .eq('id', data.batch_id)

  if (updateError) throw new Error(updateError.message)

  // Insert adjustment record
  const { error: insertError } = await supabase
    .from('stock_adjustments')
    .insert([{
      batch_id: data.batch_id,
      drug_id: data.drug_id,
      adjustment_type: data.adjustment_type,
      quantity: data.quantity,
      previous_quantity,
      resulting_quantity,
      reason: data.reason,
      notes: data.notes,
      adjusted_by,
    }])

  if (insertError) {
    console.error('Failed to insert adjustment record, but batch was updated:', insertError)
  }

  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  revalidatePath('/admin/reports')
  await evaluateAlerts()
  return { success: true }
}

export async function getAdjustmentsForBatch(batchId: string) {
  await requireAuth(['admin'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_adjustments')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as StockAdjustment[]
}
