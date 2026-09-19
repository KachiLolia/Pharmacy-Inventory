'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import type { Batch } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export async function getBatchesForDrug(drugId: string) {
  // Fallback removed

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('drug_id', drugId)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function restockDrug(data: Partial<Batch>) {
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()
  
  // Fallback removed

  // 1. Try to find a matching batch to merge
  const { data: existingBatch } = await supabase
    .from('batches')
    .select('id, quantity_received, quantity_remaining')
    .eq('drug_id', data.drug_id)
    .eq('cost_price_per_unit', data.cost_price_per_unit)
    .eq('selling_price_per_unit', data.selling_price_per_unit)
    .eq('expiry_date', data.expiry_date)
    .eq('batch_number', data.batch_number || null)
    .single()

  if (existingBatch && data.quantity_received) {
    // Merge
    const { error } = await supabase
      .from('batches')
      .update({
        quantity_received: existingBatch.quantity_received + data.quantity_received,
        quantity_remaining: existingBatch.quantity_remaining + data.quantity_received
      })
      .eq('id', existingBatch.id)

    if (error) throw new Error(error.message)
  } else {
    // Create new
    const { error } = await supabase.from('batches').insert([{
      ...data,
      received_by: user.id,
      quantity_remaining: data.quantity_received,
      reserved_quantity: 0
    }])
    if (error) throw new Error(error.message)
  }
  
  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  await evaluateAlerts()
  return { success: true }
}
