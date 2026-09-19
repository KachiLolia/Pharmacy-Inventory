'use server'

import { createClient } from '@/lib/supabase/server'
import { getSettings } from './settings'

export async function evaluateAlerts() {
  const supabase = await createClient()
  
  const { data: drugs, error: drugsError } = await supabase.from('drugs').select('*').eq('is_active', true)
  if (drugsError) throw new Error(drugsError.message)
    
  const { data: batches, error: batchesError } = await supabase.from('batches').select('*')
  if (batchesError) throw new Error(batchesError.message)
    
  const settings = await getSettings()
  
  const { data: activeAlerts, error: alertsError } = await supabase.from('alert_logs').select('*').eq('status', 'active')
  if (alertsError) throw new Error(alertsError.message)

  const now = new Date()
  let newAlertsCount = 0

  for (const drug of drugs) {
    const drugBatches = batches.filter((b: any) => b.drug_id === drug.id)
    
    // 1. Low Stock Evaluation
    let totalAvailable = 0
    for (const batch of drugBatches) {
      const isExpired = new Date(batch.expiry_date) <= now
      if (!isExpired) {
        totalAvailable += Math.max(0, batch.quantity_remaining - (batch.reserved_quantity || 0))
      }
    }

    const lowStockThreshold = drug.low_stock_threshold ?? settings.global_low_stock_threshold
    const existingLowStockAlert = activeAlerts?.find((a: any) => a.type === 'low_stock' && a.drug_id === drug.id)

    if (totalAvailable <= lowStockThreshold) {
      if (!existingLowStockAlert) {
        await supabase.from('alert_logs').insert({
          type: 'low_stock',
          drug_id: drug.id,
          status: 'active'
        })
        newAlertsCount++
      }
    } else {
      if (existingLowStockAlert) {
        await supabase.from('alert_logs').update({
          status: 'resolved',
          resolved_at: now.toISOString()
        }).eq('id', existingLowStockAlert.id)
      }
    }

    // 2. Expiry Evaluation
    const expiryWarningDays = drug.expiry_warning_days ?? settings.global_expiry_warning_days
    const expiryThresholdMs = expiryWarningDays * 24 * 60 * 60 * 1000

    for (const batch of drugBatches) {
      if (batch.quantity_remaining <= 0) continue

      const timeUntilExpiryMs = new Date(batch.expiry_date).getTime() - now.getTime()
      const existingExpiryAlert = activeAlerts?.find(
        (a: any) => a.type === 'expiry' && a.drug_id === drug.id && a.batch_id === batch.id
      )

      if (timeUntilExpiryMs <= expiryThresholdMs) {
        if (!existingExpiryAlert) {
          await supabase.from('alert_logs').insert({
            type: 'expiry',
            drug_id: drug.id,
            batch_id: batch.id,
            status: 'active'
          })
          newAlertsCount++
        }
      } else {
        if (existingExpiryAlert) {
          await supabase.from('alert_logs').update({
            status: 'resolved',
            resolved_at: now.toISOString()
          }).eq('id', existingExpiryAlert.id)
        }
      }
    }
  }

  // Also resolve expiry alerts for batches that hit 0 quantity
  const activeExpiryAlerts = activeAlerts?.filter((a: any) => a.type === 'expiry') || []
  for (const alert of activeExpiryAlerts) {
    const batch = batches.find((b: any) => b.id === alert.batch_id)
    if (!batch || batch.quantity_remaining <= 0) {
      await supabase.from('alert_logs').update({
        status: 'resolved',
        resolved_at: now.toISOString()
      }).eq('id', alert.id)
    }
  }

  return { success: true, newAlertsCount }
}

export async function getActiveAlerts() {
  await evaluateAlerts()
  
  const supabase = await createClient()
  
  const { data: alerts, error: alertsError } = await supabase.from('alert_logs').select('*').eq('status', 'active')
  if (alertsError) throw new Error(alertsError.message)
    
  const { data: drugs, error: drugsError } = await supabase.from('drugs').select('id, name, dose')
  if (drugsError) throw new Error(drugsError.message)
    
  const { data: batches, error: batchesError } = await supabase.from('batches').select('*')
  if (batchesError) throw new Error(batchesError.message)

  const viewData: any[] = []
  const now = new Date()

  for (const alert of alerts) {
    const drug = drugs.find((d: any) => d.id === alert.drug_id)
    if (!drug) continue

    if (alert.type === 'low_stock') {
      const drugBatches = batches.filter((b: any) => b.drug_id === drug.id && new Date(b.expiry_date) > now)
      const totalAvailable = drugBatches.reduce((sum: number, b: any) => sum + Math.max(0, b.quantity_remaining - (b.reserved_quantity || 0)), 0)
      
      viewData.push({
        id: alert.id,
        type: 'low_stock',
        drug_id: drug.id,
        drug_name: `${drug.name} ${drug.dose}`,
        quantity_remaining: totalAvailable,
        actionable: true
      })
    } else if (alert.type === 'expiry' && alert.batch_id) {
      const batch = batches.find((b: any) => b.id === alert.batch_id)
      if (!batch) continue
      
      const timeDiff = new Date(batch.expiry_date).getTime() - now.getTime()
      const days_until_expiry = Math.ceil(timeDiff / (1000 * 3600 * 24))

      viewData.push({
        id: alert.id,
        type: 'expiry',
        drug_id: drug.id,
        drug_name: `${drug.name} ${drug.dose}`,
        batch_number: batch.batch_number || 'N/A',
        days_until_expiry,
        actionable: true
      })
    }
  }

  return viewData
}
