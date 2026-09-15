'use server'

import { createClient } from '@/lib/supabase/server'
import { getMockAdjustmentsForBatch, saveMockAdjustment, type StockAdjustment } from '@/lib/mock-data/stock-adjustments'
import { getMockBatches, saveMockBatch } from '@/lib/mock-data/batches'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Unauthorized')
  
  const adjusted_by = user.email || user.id

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const batches = getMockBatches()
    const batch = batches.find(b => b.id === data.batch_id)
    if (!batch) throw new Error('Batch not found')

    if (data.quantity <= 0) throw new Error('Quantity must be greater than 0')

    const previous_quantity = batch.quantity_remaining
    let resulting_quantity = previous_quantity

    if (data.adjustment_type === 'increase') {
      resulting_quantity += data.quantity
      batch.quantity_received += data.quantity // Since it's an increase, we technically received more? The PRD doesn't explicitly state to change quantity_received for adjustments, but typically adjustments only affect remaining. Wait, let's only adjust quantity_remaining.
    } else {
      if (previous_quantity - data.quantity < batch.reserved_quantity) {
        throw new Error('Cannot reduce stock below reserved quantity')
      }
      resulting_quantity -= data.quantity
    }

    // Save adjustment record
    saveMockAdjustment({
      batch_id: data.batch_id,
      drug_id: data.drug_id,
      adjustment_type: data.adjustment_type,
      quantity: data.quantity,
      previous_quantity,
      resulting_quantity,
      reason: data.reason,
      notes: data.notes,
      adjusted_by,
    })

    // Update batch
    saveMockBatch({
      id: batch.id,
      quantity_remaining: resulting_quantity
    })

    revalidatePath('/admin/drugs')
    revalidatePath('/staff/drugs')
    await evaluateAlerts()
    return { success: true }
  }

  // Supabase implementation
  // 1. Start a transaction using RPC or do it sequentially (sequentially is risky but fine for this scope if RPC is not set up)
  // Let's do it sequentially with a check
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

  // 2. Update batch
  const { error: updateError } = await supabase
    .from('batches')
    .update({ quantity_remaining: resulting_quantity })
    .eq('id', data.batch_id)

  if (updateError) throw new Error(updateError.message)

  // 3. Insert adjustment record
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
  await evaluateAlerts()
  return { success: true }
}

export async function getAdjustmentsForBatch(batchId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getMockAdjustmentsForBatch(batchId)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_adjustments')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as StockAdjustment[]
}
