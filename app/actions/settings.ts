'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { SystemSettings } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export async function getSettings(): Promise<SystemSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single()
  
  if (error) {
    // If the record doesn't exist for some reason, return safe defaults
    return {
      id: 1,
      admin_name: 'System Admin',
      admin_email: 'admin@pharmly.com',
      admin_phone: '+234 800 000 0000',
      pharmacy_name: 'Pharmly',
      pharmacy_address: '123 Health Ave, Medical District',
      pharmacy_phone: '+234 123 456 7890',
      pharmacy_email: 'hello@pharmly.com',
      pharmacy_logo_url: '',
      receipt_message: 'Thank you for your patronage!\nPlease keep this receipt for your records.',
      global_low_stock_threshold: 50,
      global_expiry_warning_days: 90,
      pending_prescription_timeout_mins: 30,
      default_payment_method: 'cash',
      enable_receipt_printing: true,
      allow_return_to_stock: true,
      email_notifications: true,
      sms_notifications: false,
      notification_email: 'admin@pharmly.com',
      notification_phone: '+234 800 000 0000',
      notify_low_stock: true,
      notify_expiry: true
    } as SystemSettings
  }
  
  return data as SystemSettings
}

export async function updateSettings(updates: Partial<SystemSettings>) {
  await requireAuth(['admin'])
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('id', 1)

  if (error) throw new Error(error.message)
  
  // Re-evaluate alerts since thresholds might have changed
  await evaluateAlerts()
  
  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  return { success: true }
}
