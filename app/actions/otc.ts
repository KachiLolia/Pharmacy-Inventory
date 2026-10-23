'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Drug } from '@/lib/types'

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
  total_stock: number
  available_stock: number
  has_expired_batches: boolean
  is_out_of_stock: boolean
  is_low_stock: boolean
  live_batch_price?: number
}

export async function getOTCListings(): Promise<DrugWithListing[]> {
  const supabase = await createClient()

  // 1. Fetch all drugs
  const { data: drugs, error: drugsError } = await supabase
    .from('drugs')
    .select('*')
    .order('name')

  if (drugsError) {
    console.error('Error fetching drugs:', drugsError)
    return []
  }

  // 2. Fetch listings
  const { data: listings, error: listingsError } = await supabase
    .from('otc_listings')
    .select('*')

  if (listingsError) {
    console.error('Error fetching listings:', listingsError)
  }

  // 3. Fetch batches to sync real-time physical inventory & expiry state
  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select('drug_id, quantity_remaining, expiry_date, selling_price_per_unit')

  if (batchesError) {
    console.error('Error fetching batches for OTC listings:', batchesError)
  }

  const listingsMap = new Map((listings || []).map((l: any) => [l.drug_id, l]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group batches by drug_id
  const batchesByDrug = new Map<string, any[]>()
  for (const b of (batches || [])) {
    const list = batchesByDrug.get(b.drug_id) || []
    list.push(b)
    batchesByDrug.set(b.drug_id, list)
  }

  return (drugs as Drug[]).map((drug) => {
    const drugBatches = batchesByDrug.get(drug.id) || []

    let totalStock = 0
    let availableStock = 0
    let hasExpiredBatches = false
    let earliestActivePrice: number | undefined = undefined
    let earliestExpiry: Date | null = null

    for (const b of drugBatches) {
      totalStock += b.quantity_remaining
      const exp = new Date(b.expiry_date)
      if (exp >= today) {
        if (b.quantity_remaining > 0) {
          availableStock += b.quantity_remaining
          if (!earliestExpiry || exp < earliestExpiry) {
            earliestExpiry = exp
            earliestActivePrice = b.selling_price_per_unit
          }
        }
      } else {
        if (b.quantity_remaining > 0) {
          hasExpiredBatches = true
        }
      }
    }

    const lowStockThreshold = drug.low_stock_threshold ?? 10
    const isOutOfStock = availableStock <= 0
    const isLowStock = availableStock > 0 && availableStock <= lowStockThreshold

    return {
      ...drug,
      listing: listingsMap.get(drug.id) as OTCListing | undefined,
      total_stock: totalStock,
      available_stock: availableStock,
      has_expired_batches: hasExpiredBatches,
      is_out_of_stock: isOutOfStock,
      is_low_stock: isLowStock,
      live_batch_price: earliestActivePrice
    }
  })
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
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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

export async function uploadOTCImage(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File | null
    if (!file) {
      return { success: false, error: 'No image file provided.' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image (PNG, JPG, WEBP, etc.).' }
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size exceeds the 5MB limit.' }
    }

    const drugId = (formData.get('drugId') as string) || 'general'
    const ext = file.name.split('.').pop() || 'jpg'
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`
    const filePath = `drugs/${drugId}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabase: any
    if (serviceRoleKey && supabaseUrl) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    } else {
      supabase = await createClient()
    }

    const { error: uploadError } = await supabase.storage
      .from('otc_images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from('otc_images')
      .getPublicUrl(filePath)

    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('Upload error:', err)
    return { success: false, error: err.message || 'Failed to upload image.' }
  }
}

export async function deleteOTCImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (imageUrl.includes('/otc_images/')) {
      const parts = imageUrl.split('/otc_images/')
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1].split('?')[0])
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let supabase: any
        if (serviceRoleKey && supabaseUrl) {
          const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
          supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
          })
        } else {
          supabase = await createClient()
        }
        await supabase.storage.from('otc_images').remove([filePath])
      }
    }
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete image from storage:', err)
    return { success: false, error: err.message }
  }
}
