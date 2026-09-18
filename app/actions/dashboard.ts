'use server'

import { getMockPrescriptions, getMockPrescriptionItems } from '@/lib/mock-data/prescriptions'
import { getMockBatches } from '@/lib/mock-data/batches'
import { getMockDrugs } from '@/lib/mock-data/drugs'
import { getMockSettings } from '@/lib/mock-data/settings'

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
  myRevenueToday: number
  myTransactionCountToday: number
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

function calculateInventoryOverview(): InventoryOverviewMetrics {
  const drugs = getMockDrugs().filter(d => d.is_active)
  const batches = getMockBatches()
  const settings = getMockSettings()
  const now = new Date()

  let inStock = 0
  let lowStock = 0
  let outOfStock = 0
  let expiringSoon = 0
  let expired = 0
  let totalStock = 0

  for (const drug of drugs) {
    const drugBatches = batches.filter(b => b.drug_id === drug.id)
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
    if (batch.quantity_remaining <= 0) continue

    const timeUntilExpiryMs = new Date(batch.expiry_date).getTime() - now.getTime()
    const drug = drugs.find(d => d.id === batch.drug_id)
    const expiryWarningDays = drug?.expiry_warning_days ?? settings.global_expiry_warning_days
    const expiryThresholdMs = expiryWarningDays * 24 * 60 * 60 * 1000

    if (timeUntilExpiryMs <= 0) {
      expired++
    } else if (timeUntilExpiryMs <= expiryThresholdMs) {
      expiringSoon++
    }
  }

  return {
    totalSKUs: drugs.length,
    inStock,
    lowStock,
    outOfStock,
    totalBatches: batches.length,
    expiringSoon,
    expired,
    totalStock
  }
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const prescriptions = getMockPrescriptions()
  const prescriptionItems = getMockPrescriptionItems()
  const batches = getMockBatches()
  const drugs = getMockDrugs()

  const completedToday = prescriptions.filter(p => 
    p.status === 'completed' && 
    p.confirmed_at && 
    isToday(p.confirmed_at)
  )

  const transactionCountToday = completedToday.length
  const totalRevenueToday = completedToday.reduce((sum, p) => sum + p.total_amount, 0)

  const inventoryValue = batches.reduce((sum, b) => sum + (b.quantity_remaining * b.cost_price_per_unit), 0)

  const topSellingDrugsMap: Record<string, { quantity: number, revenue: number }> = {}
  const completedPrescriptionIds = new Set(completedToday.map(p => p.id))
  const itemsToday = prescriptionItems.filter(item => completedPrescriptionIds.has(item.prescription_id))

  for (const item of itemsToday) {
    if (!topSellingDrugsMap[item.drug_id]) {
      topSellingDrugsMap[item.drug_id] = { quantity: 0, revenue: 0 }
    }
    topSellingDrugsMap[item.drug_id].quantity += item.quantity
    topSellingDrugsMap[item.drug_id].revenue += item.subtotal
  }

  const topSellingDrugs = Object.keys(topSellingDrugsMap).map(drugId => {
    const drug = drugs.find(d => d.id === drugId)
    return {
      drug_name: drug ? `${drug.name} ${drug.dose}` : 'Unknown Drug',
      quantity: topSellingDrugsMap[drugId].quantity,
      revenue: topSellingDrugsMap[drugId].revenue
    }
  }).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  return {
    totalRevenueToday,
    transactionCountToday,
    inventoryValue,
    topSellingDrugs,
    inventoryOverview: calculateInventoryOverview()
  }
}

export async function getStaffDashboardMetrics(staffId: string): Promise<StaffDashboardMetrics> {
  const prescriptions = getMockPrescriptions()
  const prescriptionItems = getMockPrescriptionItems()
  const batches = getMockBatches()
  const drugs = getMockDrugs()

  const inventoryValue = batches.reduce((sum, b) => sum + (b.quantity_remaining * b.cost_price_per_unit), 0)

  const completedToday = prescriptions.filter(p => 
    p.status === 'completed' && 
    p.confirmed_at && 
    isToday(p.confirmed_at)
  )

  const myCompletedToday = completedToday.filter(p => p.created_by === staffId)

  const myTransactionCountToday = myCompletedToday.length
  const myRevenueToday = myCompletedToday.reduce((sum, p) => sum + p.total_amount, 0)

  // Top selling drugs (Global, per requirements we show general top selling)
  const topSellingDrugsMap: Record<string, { quantity: number, revenue: number }> = {}
  const completedPrescriptionIds = new Set(completedToday.map(p => p.id))
  const itemsToday = prescriptionItems.filter(item => completedPrescriptionIds.has(item.prescription_id))

  for (const item of itemsToday) {
    if (!topSellingDrugsMap[item.drug_id]) {
      topSellingDrugsMap[item.drug_id] = { quantity: 0, revenue: 0 }
    }
    topSellingDrugsMap[item.drug_id].quantity += item.quantity
    topSellingDrugsMap[item.drug_id].revenue += item.subtotal
  }

  const topSellingDrugs = Object.keys(topSellingDrugsMap).map(drugId => {
    const drug = drugs.find(d => d.id === drugId)
    return {
      drug_name: drug ? `${drug.name} ${drug.dose}` : 'Unknown Drug',
      quantity: topSellingDrugsMap[drugId].quantity,
      revenue: topSellingDrugsMap[drugId].revenue
    }
  }).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  return {
    myRevenueToday,
    myTransactionCountToday,
    topSellingDrugs,
    inventoryOverview: calculateInventoryOverview(),
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
  // Generate deterministic mock data based on the requested range
  const data: SalesChartDataPoint[] = []
  const now = new Date()
  
  if (range === 'today') {
    // Hourly data from 8 AM to current hour (or 8 PM)
    const currentHour = now.getHours()
    const startHour = 8
    const endHour = Math.max(currentHour, 12) // Show at least up to noon
    
    for (let h = startHour; h <= endHour; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      
      // Pseudo-random revenue between 10k and 50k
      const randomRevenue = Math.floor(10000 + (Math.sin(h) * Math.cos(h) * 20000) + 20000)
      
      data.push({
        name: `${hour12}${ampm}`,
        fullDate: `Today, ${hour12}:00 ${ampm}`,
        total: randomRevenue
      })
    }
  } else {
    // Daily data
    let days = 7
    if (range === '14d') days = 14
    if (range === '30d') days = 30
    if (range === '90d') days = 90
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' })
      const fullDate = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
      
      // Pseudo-random revenue based on date, between 200k and 600k
      const seed = date.getTime()
      const randomRevenue = Math.floor(200000 + (Math.sin(seed) * 200000) + 200000)
      
      data.push({
        name: range === '90d' || range === '30d' ? fullDate : dayName,
        fullDate: fullDate,
        total: role === 'Staff' ? randomRevenue * 0.3 : randomRevenue // Staff sees a smaller portion roughly
      })
    }
  }
  
  return data
}

