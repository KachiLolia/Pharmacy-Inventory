'use server'

import { createClient, createAdminClient, requireAuth } from '@/lib/supabase/server'
import { getSettings } from './settings'

export type InventoryOverviewMetrics = {
  totalSKUs: number
  inStock: number
  lowStock: number
  outOfStock: number
  totalBatches: number
  expiringSoon: number
  expired: number
  totalStock: number
}

export type TopSellingDrug = { 
  drug_name: string
  quantity: number
  revenue: number 
}

export type AdminDashboardMetrics = {
  totalRevenueToday: number
  transactionCountToday: number
  inventoryValue: number
  topSellingDrugs: TopSellingDrug[]
  inventoryOverview: InventoryOverviewMetrics
}

export type StaffDashboardMetrics = {
  totalRevenueToday: number
  transactionCountToday: number
  topSellingDrugs: TopSellingDrug[]
  inventoryOverview: InventoryOverviewMetrics
  inventoryValue: number
}

function isToday(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

async function calculateInventoryOverviewAndValue() {
  const supabase = await createClient()
  const settings = await getSettings()
  
  const { data: drugs } = await supabase.from('drugs').select('id, expiry_warning_days, low_stock_threshold, unit_type, pack_size').eq('is_active', true)
  const { data: batches } = await supabase.from('batches').select('drug_id, quantity_remaining, reserved_quantity, expiry_date, cost_price_per_unit')

  let inStock = 0
  let lowStock = 0
  let outOfStock = 0
  let expiringSoon = 0
  let expired = 0
  let totalStock = 0
  let inventoryValue = 0

  const now = new Date()

  if (drugs && batches) {
    for (const drug of drugs) {
      const drugBatches = batches.filter((b: any) => b.drug_id === drug.id)
      let totalAvailable = 0

      for (const batch of drugBatches) {
        const isExpired = new Date(batch.expiry_date) <= now
        if (!isExpired) {
          totalAvailable += Math.max(0, batch.quantity_remaining - (batch.reserved_quantity || 0))
        }
      }

      totalStock += totalAvailable
      const lowStockThreshold = drug.low_stock_threshold ?? settings.global_low_stock_threshold

      if (totalAvailable === 0) {
        outOfStock++
      } else if (totalAvailable <= lowStockThreshold) {
        lowStock++
      } else {
        inStock++
      }
    }

    for (const batch of batches) {
      if (batch.quantity_remaining > 0) {
        inventoryValue += batch.quantity_remaining * batch.cost_price_per_unit
      }

      if (batch.quantity_remaining <= 0) continue

      const timeUntilExpiryMs = new Date(batch.expiry_date).getTime() - now.getTime()
      const drug = drugs.find((d: any) => d.id === batch.drug_id)
      const expiryWarningDays = drug?.expiry_warning_days ?? settings.global_expiry_warning_days
      const expiryThresholdMs = expiryWarningDays * 24 * 60 * 60 * 1000

      if (timeUntilExpiryMs <= 0) {
        expired++
      } else if (timeUntilExpiryMs <= expiryThresholdMs) {
        expiringSoon++
      }
    }
  }

  return {
    overview: {
      totalSKUs: drugs?.length || 0,
      inStock,
      lowStock,
      outOfStock,
      totalBatches: batches?.length || 0,
      expiringSoon,
      expired,
      totalStock
    },
    inventoryValue
  }
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const supabase = await createAdminClient()

  // Start of today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('id, total_amount, confirmed_at, refunded_amount')
    .eq('status', 'completed')
    .gte('confirmed_at', todayStart.toISOString())

  const totalRevenueToday = prescriptions?.reduce((sum: number, p: any) => sum + (p.total_amount - (p.refunded_amount || 0)), 0) || 0
  const transactionCountToday = prescriptions?.length || 0

  const { overview: inventoryOverview, inventoryValue } = await calculateInventoryOverviewAndValue()

  const { data: itemsToday } = await supabase
    .from('prescription_items')
    .select('drug_id, quantity, subtotal, drugs(name, dose), prescriptions!inner(status, confirmed_at)')
    .eq('prescriptions.status', 'completed')
    .gte('prescriptions.confirmed_at', todayStart.toISOString())

  const topSellingDrugsMap: Record<string, { name: string, quantity: number, revenue: number }> = {}

  if (itemsToday) {
    for (const item of itemsToday) {
      if (!topSellingDrugsMap[item.drug_id]) {
        topSellingDrugsMap[item.drug_id] = { 
          name: item.drugs ? `${item.drugs.name} ${item.drugs.dose}` : 'Unknown',
          quantity: 0, 
          revenue: 0 
        }
      }
      topSellingDrugsMap[item.drug_id].quantity += item.quantity
      topSellingDrugsMap[item.drug_id].revenue += item.subtotal
    }
  }

  const topSellingDrugs = Object.values(topSellingDrugsMap)
    .map(d => ({
      drug_name: d.name,
      quantity: d.quantity,
      revenue: d.revenue
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    totalRevenueToday,
    transactionCountToday,
    inventoryValue,
    topSellingDrugs,
    inventoryOverview
  }
}

export async function getStaffDashboardMetrics(staffId: string): Promise<StaffDashboardMetrics> {
  const supabase = await createAdminClient()

  // Start of today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const { data: myPrescriptions } = await supabase
    .from('prescriptions')
    .select('id, total_amount, confirmed_at, refunded_amount')
    .eq('status', 'completed')
    .gte('confirmed_at', todayStart.toISOString())

  const totalRevenueToday = myPrescriptions?.reduce((sum: number, p: any) => sum + (p.total_amount - (p.refunded_amount || 0)), 0) || 0
  const transactionCountToday = myPrescriptions?.length || 0

  const { overview: inventoryOverview, inventoryValue } = await calculateInventoryOverviewAndValue()

  // Top selling overall (global)
  const { data: itemsToday } = await supabase
    .from('prescription_items')
    .select('drug_id, quantity, subtotal, drugs(name, dose), prescriptions!inner(status, confirmed_at)')
    .eq('prescriptions.status', 'completed')
    .gte('prescriptions.confirmed_at', todayStart.toISOString())

  const topSellingDrugsMap: Record<string, { name: string, quantity: number, revenue: number }> = {}

  if (itemsToday) {
    for (const item of itemsToday) {
      if (!topSellingDrugsMap[item.drug_id]) {
        topSellingDrugsMap[item.drug_id] = { 
          name: item.drugs ? `${item.drugs.name} ${item.drugs.dose}` : 'Unknown',
          quantity: 0, 
          revenue: 0 
        }
      }
      topSellingDrugsMap[item.drug_id].quantity += item.quantity
      topSellingDrugsMap[item.drug_id].revenue += item.subtotal
    }
  }

  const topSellingDrugs = Object.values(topSellingDrugsMap)
    .map(d => ({
      drug_name: d.name,
      quantity: d.quantity,
      revenue: d.revenue
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    totalRevenueToday,
    transactionCountToday,
    topSellingDrugs,
    inventoryOverview,
    inventoryValue
  }
}

export type SalesChartDataPoint = {
  name: string
  fullDate: string
  total: number
}

export async function getSalesChartData(
  range: 'today' | '7d' | '14d' | '30d' | '90d',
  role: 'Admin' | 'Staff',
  staffId?: string
): Promise<SalesChartDataPoint[]> {
  const supabase = await createAdminClient()
  const data: SalesChartDataPoint[] = []
  const now = new Date()

  // We fetch actual data from supabase.
  let startDate = new Date()
  
  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0)
  } else if (range === '7d') {
    startDate.setDate(startDate.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
  } else if (range === '14d') {
    startDate.setDate(startDate.getDate() - 13)
    startDate.setHours(0, 0, 0, 0)
  } else if (range === '30d') {
    startDate.setDate(startDate.getDate() - 29)
    startDate.setHours(0, 0, 0, 0)
  } else if (range === '90d') {
    startDate.setDate(startDate.getDate() - 89)
    startDate.setHours(0, 0, 0, 0)
  }

  let query = supabase
    .from('prescriptions')
    .select('total_amount, confirmed_at')
    .eq('status', 'completed')
    .gte('confirmed_at', startDate.toISOString())
    .lte('confirmed_at', now.toISOString())

  const { data: salesData } = await query

  if (range === 'today') {
    const currentHour = now.getHours()
    const startHour = 8
    const endHour = Math.max(currentHour, 12)
    
    // Group by hour
    const hourlyTotals: Record<number, number> = {}
    salesData?.forEach((s: any) => {
      const h = new Date(s.confirmed_at).getHours()
      hourlyTotals[h] = (hourlyTotals[h] || 0) + s.total_amount
    })

    for (let h = startHour; h <= endHour; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      
      data.push({
        name: `${hour12}${ampm}`,
        fullDate: `Today, ${hour12}:00 ${ampm}`,
        total: hourlyTotals[h] || 0
      })
    }
  } else {
    // Group by day
    let days = 7
    if (range === '14d') days = 14
    if (range === '30d') days = 30
    if (range === '90d') days = 90
    
    const dailyTotals: Record<string, number> = {}
    salesData?.forEach((s: any) => {
      const d = new Date(s.confirmed_at)
      const key = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
      dailyTotals[key] = (dailyTotals[key] || 0) + s.total_amount
    })

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' })
      const fullDate = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
      
      data.push({
        name: range === '90d' || range === '30d' ? fullDate : dayName,
        fullDate: fullDate,
        total: dailyTotals[fullDate] || 0
      })
    }
  }
  
  return data
}
