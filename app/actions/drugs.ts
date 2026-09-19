'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { getMockDrugs, saveMockDrug, type Drug } from '@/lib/mock-data/drugs'
import { revalidatePath } from 'next/cache'

import { getMockBatches } from '@/lib/mock-data/batches'

export type DrugWithStock = Drug & { current_stock: number, base_price?: number }

export async function getDrugs(includeInactive = false): Promise<DrugWithStock[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const allDrugs = getMockDrugs()
    const allBatches = getMockBatches()
    
    const drugsWithStock = allDrugs.map(drug => {
      const drugBatches = allBatches.filter(b => b.drug_id === drug.id)
      const stock = drugBatches
        .reduce((sum, b) => sum + (b.quantity_remaining - (b.reserved_quantity || 0)), 0)
        
      const activeBatches = drugBatches
        .filter(b => (b.quantity_remaining - (b.reserved_quantity || 0)) > 0 && new Date(b.expiry_date) >= new Date())
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
        
      const base_price = activeBatches.length > 0 ? activeBatches[0].selling_price_per_unit : undefined

      return { ...drug, current_stock: stock, base_price }
    })
    
    return includeInactive ? drugsWithStock : drugsWithStock.filter(d => d.is_active)
  }

  const supabase = await createClient()
  let query = supabase.from('drugs').select('*, batches(quantity_remaining)').order('name')
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

    // Remove the batches array so we just return the flat DrugWithStock
    const { batches, ...rest } = drug
    return { ...rest, current_stock: stock, base_price } as DrugWithStock
  })
}

export async function createOrUpdateDrug(data: Partial<Drug>) {
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
     saveMockDrug(data)
     revalidatePath('/admin/drugs')
     revalidatePath('/staff/drugs')
     return { success: true }
  }

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
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    saveMockDrug({ id, is_active: isActive })
    revalidatePath('/admin/drugs')
    revalidatePath('/staff/drugs')
    return { success: true }
  }

  const { error } = await supabase.from('drugs').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/drugs')
  revalidatePath('/staff/drugs')
  return { success: true }
}
