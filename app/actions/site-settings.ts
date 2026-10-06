'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type StorefrontSettings = {
  id: number
  pharmacy_name: string
  logo_url: string | null
  homepage_text: string | null
  about_us_text: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  color_primary: string | null
  color_secondary: string | null
  delivery_fee: number
  pcn_licence_number: string | null
  display_pcn: boolean
}

export async function getStorefrontSettings(): Promise<StorefrontSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('storefront_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.error('Error fetching storefront settings:', error)
    return null
  }

  return data as StorefrontSettings
}

export async function updateStorefrontSettings(updates: Partial<StorefrontSettings>) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('storefront_settings')
    .update(updates)
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/site-settings')
}
