'use server'

import { getMockSettings, updateMockSettings, SystemSettings } from '@/lib/mock-data/settings'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'
import { requireAuth } from '@/lib/supabase/server'

export async function getSettings(): Promise<SystemSettings> {
  // In a real app this would query a supabase 'settings' table
  return getMockSettings()
}

export async function updateSettings(updates: Partial<SystemSettings>) {
  await requireAuth(['admin'])

  // Mock updating settings
  updateMockSettings(updates)
  
  // Re-evaluate alerts since thresholds might have changed
  await evaluateAlerts()
  
  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  return { success: true }
}
