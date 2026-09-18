'use server'

import { getMockPrescriptions, getMockPrescriptionItems } from '@/lib/mock-data/prescriptions'
import { getMockBatches } from '@/lib/mock-data/batches'
import { getMockDrugs } from '@/lib/mock-data/drugs'
import { getMockUser } from '@/lib/mock-auth'
import { getMockReconciliations, saveMockReconciliation, ReconciliationRecord } from '@/lib/mock-data/reconciliations'

export type ReportDateRange = {
  startDate: string
  endDate: string
}

const checkAdmin = async () => {
  const user = await getMockUser()
  if (user?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required.')
  }
}

export type SalesReportData = {
  totalRevenue: number
  transactionCount: number
  cogs: number
  grossProfit: number
  byDrug: {
    drugId: string
    drugName: string
    quantitySold: number
    revenue: number
    profit: number
  }[]
  byStaff: {
    staffId: string
    staffName: string
    transactionCount: number
    revenue: number
    profit: number
  }[]
}

export async function getSalesReport(range: ReportDateRange): Promise<SalesReportData> {
  await checkAdmin()
  const prescriptions = getMockPrescriptions().filter(p => p.status === 'completed')
  const items = getMockPrescriptionItems()
  const batches = getMockBatches()
  const drugs = getMockDrugs()


  const start = new Date(range.startDate).getTime()
  const end = new Date(range.endDate).getTime()

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!p.confirmed_at) return false
    const d = new Date(p.confirmed_at).getTime()
    return d >= start && d <= end
  })

  let totalRevenue = 0
  let totalCogs = 0

  const drugMap = new Map<string, SalesReportData['byDrug'][0]>()
  const staffMap = new Map<string, SalesReportData['byStaff'][0]>()

  for (const p of filteredPrescriptions) {
    totalRevenue += p.total_amount
    
    // Staff tracking
    if (!staffMap.has(p.created_by)) {
      staffMap.set(p.created_by, {
        staffId: p.created_by,
        staffName: p.created_by.charAt(0).toUpperCase() + p.created_by.slice(1).replace('-', ' '),
        transactionCount: 0,
        revenue: 0,
        profit: 0
      })
    }
    const staff = staffMap.get(p.created_by)!
    staff.transactionCount++
    staff.revenue += p.total_amount

    const pItems = items.filter(i => i.prescription_id === p.id)
    for (const item of pItems) {
      // Find the batch to get the historical cost price
      const batch = batches.find(b => b.id === item.batch_id)
      const cost = batch ? batch.cost_price_per_unit : 0
      const itemCogs = cost * item.quantity
      const itemRevenue = item.subtotal
      const itemProfit = itemRevenue - itemCogs

      totalCogs += itemCogs

      staff.profit += itemProfit

      // Drug tracking
      const drug = drugs.find(d => d.id === item.drug_id)
      const drugName = drug ? `${drug.name} ${drug.dose}` : 'Unknown Drug'

      if (!drugMap.has(item.drug_id)) {
        drugMap.set(item.drug_id, {
          drugId: item.drug_id,
          drugName,
          quantitySold: 0,
          revenue: 0,
          profit: 0
        })
      }
      const drugStat = drugMap.get(item.drug_id)!
      drugStat.quantitySold += item.quantity
      drugStat.revenue += itemRevenue
      drugStat.profit += itemProfit
    }
  }

  // Filter out staff with no sales
  const byStaff = Array.from(staffMap.values()).filter(s => s.transactionCount > 0)
  const byDrug = Array.from(drugMap.values()).sort((a, b) => b.revenue - a.revenue)

  return {
    totalRevenue,
    transactionCount: filteredPrescriptions.length,
    cogs: totalCogs,
    grossProfit: totalRevenue - totalCogs,
    byDrug,
    byStaff
  }
}

export type StockReportItem = {
  drugId: string
  drugName: string
  totalQuantity: number
  totalValue: number
  expiringBatches: number
}

export async function getStockReport(): Promise<StockReportItem[]> {
  await checkAdmin()
  const drugs = getMockDrugs().filter(d => d.is_active)
  const batches = getMockBatches()
  const now = new Date()

  const report: StockReportItem[] = []

  for (const drug of drugs) {
    const drugBatches = batches.filter(b => b.drug_id === drug.id)
    let totalQuantity = 0
    let totalValue = 0
    let expiringBatches = 0

    const expiryWarningDays = drug.expiry_warning_days ?? 90 // Default to 90 if no global settings available easily here
    const expiryThresholdMs = expiryWarningDays * 24 * 60 * 60 * 1000

    for (const batch of drugBatches) {
      if (batch.quantity_remaining <= 0) continue

      const isExpired = new Date(batch.expiry_date) <= now
      if (!isExpired) {
        // Physical inventory includes reserved quantity as it's still physically in the store until confirmed
        totalQuantity += batch.quantity_remaining
        totalValue += (batch.quantity_remaining * batch.cost_price_per_unit)

        const timeUntilExpiryMs = new Date(batch.expiry_date).getTime() - now.getTime()
        if (timeUntilExpiryMs <= expiryThresholdMs) {
          expiringBatches++
        }
      }
    }

    if (totalQuantity > 0 || expiringBatches > 0) {
      report.push({
        drugId: drug.id,
        drugName: `${drug.name} ${drug.dose}`,
        totalQuantity,
        totalValue,
        expiringBatches
      })
    }
  }

  return report.sort((a, b) => b.totalValue - a.totalValue)
}

export type ExpectedReconciliationTotals = {
  cash: number
  pos: number
  transfer: number
  total: number
}

export async function getExpectedReconciliation(range: ReportDateRange, staffId: string | null): Promise<ExpectedReconciliationTotals> {
  await checkAdmin()
  const prescriptions = getMockPrescriptions().filter(p => p.status === 'completed')
  
  const start = new Date(range.startDate).getTime()
  const end = new Date(range.endDate).getTime()

  let cash = 0
  let pos = 0
  let transfer = 0

  for (const p of prescriptions) {
    if (!p.confirmed_at) continue
    const d = new Date(p.confirmed_at).getTime()
    if (d >= start && d <= end) {
      if (staffId && p.created_by !== staffId) continue

      if (p.payment_method === 'cash') cash += p.total_amount
      if (p.payment_method === 'card') pos += p.total_amount
      if (p.payment_method === 'transfer') transfer += p.total_amount
    }
  }

  return {
    cash,
    pos,
    transfer,
    total: cash + pos + transfer
  }
}

export async function saveReconciliation(record: Omit<ReconciliationRecord, 'id' | 'created_at'>) {
  await checkAdmin()
  return saveMockReconciliation(record)
}

export async function getReconciliationHistory(): Promise<ReconciliationRecord[]> {
  await checkAdmin()
  return getMockReconciliations().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
