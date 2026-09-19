'use server'

import { getMockDrugs } from '@/lib/mock-data/drugs'
import { getMockBatches } from '@/lib/mock-data/batches'
import { getMockSettings } from '@/lib/mock-data/settings'
import { getMockAlerts, saveMockAlert, updateMockAlert, AlertLog } from '@/lib/mock-data/alerts'

// For real supabase deployment we would use createClient() but we rely on mock DB logic for now
// until Supabase is deployed.

export async function evaluateAlerts() {
  const drugs = getMockDrugs().filter(d => d.is_active)
  const batches = getMockBatches()
  const settings = getMockSettings()
  const alerts = getMockAlerts()

  const activeAlerts = alerts.filter(a => a.status === 'active')
  const newAlerts: AlertLog[] = []

  const now = new Date()

  for (const drug of drugs) {
    const drugBatches = batches.filter(b => b.drug_id === drug.id)
    
    // 1. Low Stock Evaluation
    let totalAvailable = 0
    for (const batch of drugBatches) {
      // Exclude expired batches from available stock calculation
      const isExpired = new Date(batch.expiry_date) <= now
      if (!isExpired) {
        totalAvailable += Math.max(0, batch.quantity_remaining - (batch.reserved_quantity || 0))
      }
    }

    const lowStockThreshold = drug.low_stock_threshold ?? settings.global_low_stock_threshold
    
    const existingLowStockAlert = activeAlerts.find(a => a.type === 'low_stock' && a.drug_id === drug.id)

    if (totalAvailable <= lowStockThreshold) {
      if (!existingLowStockAlert) {
        newAlerts.push(saveMockAlert({
          type: 'low_stock',
          drug_id: drug.id,
          status: 'active',
          notified_via_email: false,
          notified_via_sms: false
        }))
      }
    } else {
      if (existingLowStockAlert) {
        updateMockAlert(existingLowStockAlert.id, {
          status: 'resolved',
          resolved_at: now.toISOString()
        })
      }
    }

    // 2. Expiry Evaluation
    const expiryWarningDays = drug.expiry_warning_days ?? settings.global_expiry_warning_days
    const expiryThresholdMs = expiryWarningDays * 24 * 60 * 60 * 1000

    for (const batch of drugBatches) {
      if (batch.quantity_remaining <= 0) continue // Ignored if already empty

      const timeUntilExpiryMs = new Date(batch.expiry_date).getTime() - now.getTime()
      const existingExpiryAlert = activeAlerts.find(
        a => a.type === 'expiry' && a.drug_id === drug.id && a.batch_id === batch.id
      )

      if (timeUntilExpiryMs <= expiryThresholdMs) {
        if (!existingExpiryAlert) {
          newAlerts.push(saveMockAlert({
            type: 'expiry',
            drug_id: drug.id,
            batch_id: batch.id,
            status: 'active',
            notified_via_email: false,
            notified_via_sms: false
          }))
        }
      } else {
        if (existingExpiryAlert) {
          updateMockAlert(existingExpiryAlert.id, {
            status: 'resolved',
            resolved_at: now.toISOString()
          })
        }
      }
    }
  }

  // Also resolve expiry alerts for batches that hit 0 quantity
  const activeExpiryAlerts = activeAlerts.filter(a => a.type === 'expiry')
  for (const alert of activeExpiryAlerts) {
    const batch = batches.find(b => b.id === alert.batch_id)
    if (!batch || batch.quantity_remaining <= 0) {
      updateMockAlert(alert.id, {
        status: 'resolved',
        resolved_at: now.toISOString()
      })
    }
  }

  return { success: true, newAlerts }
}

export async function getActiveAlerts() {
  // Ensure the mock state is populated/updated before we fetch
  await evaluateAlerts()
  
  const alerts = getMockAlerts().filter(a => a.status === 'active')
  const drugs = getMockDrugs()
  const batches = getMockBatches()

  const viewData: any[] = []
  const now = new Date()

  for (const alert of alerts) {
    const drug = drugs.find(d => d.id === alert.drug_id)
    if (!drug) continue

    if (alert.type === 'low_stock') {
      const drugBatches = batches.filter(b => b.drug_id === drug.id && new Date(b.expiry_date) > now)
      const totalAvailable = drugBatches.reduce((sum, b) => sum + Math.max(0, b.quantity_remaining - (b.reserved_quantity || 0)), 0)
      
      viewData.push({
        id: alert.id,
        type: 'low_stock',
        drug_id: drug.id,
        drug_name: `${drug.name} ${drug.dose}`,
        quantity_remaining: totalAvailable,
        actionable: true
      })
    } else if (alert.type === 'expiry' && alert.batch_id) {
      const batch = batches.find(b => b.id === alert.batch_id)
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
