'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { type Drug } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export type DrugWithStock = Drug & { 
  current_stock: number; 
  base_price?: number;
  has_low_stock: boolean;
  has_near_expiry: boolean;
  has_expired: boolean;
}

export async function getDrugs(includeInactive = false): Promise<DrugWithStock[]> {
  const supabase = await createClient()
  let query = supabase.from('drugs').select('*, batches(quantity_remaining, reserved_quantity, selling_price_per_unit, expiry_date)').order('name')
  if (!includeInactive) {
    query = query.eq('is_active', true)
  }
  
  const { data, error } = await query
  if (error) throw new Error(error.message)
    
  return data.map((drug: any) => {
    const stock = (drug.batches || []).reduce((sum: number, b: any) => sum + ((b.quantity_remaining || 0) - (b.reserved_quantity || 0)), 0)
    
    const activeBatches = (drug.batches || [])
      .filter((b: any) => (b.quantity_remaining - (b.reserved_quantity || 0)) > 0 && new Date(b.expiry_date) >= new Date())
      .sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      
    const base_price = activeBatches.length > 0 ? activeBatches[0].selling_price_per_unit : undefined

    const now = new Date()
    const warningThreshold = new Date()
    warningThreshold.setDate(warningThreshold.getDate() + (drug.expiry_warning_days || 90))

    const defaultLowStockThreshold = drug.unit_type === 'countable' ? (drug.pack_size || 50) : 20
    const has_low_stock = stock <= (drug.low_stock_threshold ?? defaultLowStockThreshold)
    const has_near_expiry = (drug.batches || []).some((b: any) => b.quantity_remaining > 0 && new Date(b.expiry_date) <= warningThreshold && new Date(b.expiry_date) > now)
    const has_expired = (drug.batches || []).some((b: any) => b.quantity_remaining > 0 && new Date(b.expiry_date) <= now)

    // Remove the batches array so we just return the flat DrugWithStock
    const { batches, ...rest } = drug
    return { ...rest, current_stock: stock, base_price, has_low_stock, has_near_expiry, has_expired } as DrugWithStock
  })
}

export async function createOrUpdateDrug(data: Partial<Drug>) {
  await requireAuth(['admin'])
  const supabase = await createClient()
  
  if (data.id) {
    const { error } = await supabase.from('drugs').update(data).eq('id', data.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('drugs').insert([data])
    if (error) throw new Error(error.message)
  }
  
  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  return { success: true }
}

export async function toggleDrugStatus(id: string, isActive: boolean) {
  await requireAuth(['admin'])
  const supabase = await createClient()

  const { error } = await supabase.from('drugs').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  return { success: true }
}
