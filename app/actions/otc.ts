'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Drug } from '@/lib/types' // I might need to adjust imports

export type OTCListing = {
  id: string
  drug_id: string
  listed: boolean
  images: string[]
  description_override: string | null
  price_override: number | null
}

export type DrugWithListing = Drug & {
  listing?: OTCListing
}

export async function getOTCListings(): Promise<DrugWithListing[]> {
  const supabase = await createClient()

  // First fetch all drugs
  const { data: drugs, error: drugsError } = await supabase
    .from('drugs')
    .select('*')
    .order('name')

  if (drugsError) {
    console.error('Error fetching drugs:', drugsError)
    return []
  }

  // Fetch listings
  const { data: listings, error: listingsError } = await supabase
    .from('otc_listings')
    .select('*')

  if (listingsError) {
    // Note: if the table doesn't exist yet, this will error. 
    console.error('Error fetching listings:', listingsError)
    return drugs as DrugWithListing[]
  }

  const listingsMap = new Map(listings.map((l: any) => [l.drug_id, l]))

  return (drugs as Drug[]).map((drug) => ({
    ...drug,
    listing: listingsMap.get(drug.id) as OTCListing | undefined
  }))
}

export async function upsertOTCListing(drugId: string, updates: Partial<OTCListing>) {
  const supabase = await createClient()
  
  // Try to find existing
  const { data: existing } = await supabase
    .from('otc_listings')
    .select('id')
    .eq('drug_id', drugId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('otc_listings')
      .update(updates)
      .eq('drug_id', drugId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('otc_listings')
      .insert({ drug_id: drugId, ...updates })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/otc')
}

export async function toggleListing(drugId: string, listed: boolean) {
  return upsertOTCListing(drugId, { listed })
}
