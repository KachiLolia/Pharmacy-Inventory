'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { ReconciliationRecord } from '@/lib/types'
import { getSettings } from './settings'

export type ReportDateRange = {
  startDate: string
  endDate: string
}

async function checkAdmin() {
  await requireAuth(['admin'])
}

export type SalesReportData = {
  totalRevenue: number
  transactionCount: number
  cogs: number
  grossProfit: number
  byDrug: {
    drugId: string
    drugName: string
    brand: string
    quantitySold: number
    revenue: number
    profit: number
  }[]
}

export async function getSalesReport(range: ReportDateRange): Promise<SalesReportData> {
  await checkAdmin()
  const supabase = await createClient()

  // In production Supabase Postgres, timestamps are stored in UTC. We should make sure we're querying safely.
  // Converting the ISO date strings (e.g. 2024-01-01) to proper boundary ISO timestamps:
  const start = new Date(range.startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(range.endDate)
  end.setHours(23, 59, 59, 999)

  const { data: prescriptions, error: pError } = await supabase
    .from('prescriptions')
    .select('id, total_amount, created_by, confirmed_at, app_users(role)')
    .eq('status', 'completed')
    .gte('confirmed_at', start.toISOString())
    .lte('confirmed_at', end.toISOString())

  if (pError) throw new Error(pError.message)

  let totalRevenue = 0
  let totalCogs = 0

  const drugMap = new Map<string, SalesReportData['byDrug'][0]>()

  if (!prescriptions || prescriptions.length === 0) {
    return {
      totalRevenue: 0,
      transactionCount: 0,
      cogs: 0,
      grossProfit: 0,
      byDrug: []
    }
  }

  // Get items for all those prescriptions
  const prescriptionIds = prescriptions.map((p: any) => p.id)
  
  const { data: items, error: iError } = await supabase
    .from('prescription_items')
    .select('*, drugs(name, dose, manufacturer), batches(cost_price_per_unit)')
    .in('prescription_id', prescriptionIds)

  if (iError) throw new Error(iError.message)

  for (const p of prescriptions) {
    totalRevenue += p.total_amount

    const pItems = items?.filter((i: any) => i.prescription_id === p.id) || []
    for (const item of pItems) {
      const cost = item.batches ? item.batches.cost_price_per_unit : 0
      const itemCogs = cost * item.quantity
      const itemRevenue = item.subtotal
      const itemProfit = itemRevenue - itemCogs

      totalCogs += itemCogs

      // Drug tracking
      const drugName = item.drugs ? `${item.drugs.name} ${item.drugs.dose}` : 'Unknown Drug'
      const brand = item.drugs?.manufacturer || 'Unknown Brand'

      if (!drugMap.has(item.drug_id)) {
        drugMap.set(item.drug_id, {
          drugId: item.drug_id,
          drugName,
          brand,
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

  const byDrug = Array.from(drugMap.values()).sort((a, b) => b.revenue - a.revenue)

  return {
    totalRevenue,
    transactionCount: prescriptions.length,
    cogs: totalCogs,
    grossProfit: totalRevenue - totalCogs,
    byDrug
  }
}

export type StockReportItem = {
  drugId: string
  drugName: string
  brand: string
  qtyIssued: number
  qtySold: number
  qtyLeft: number
  totalValue: number
}

export async function getStockReport(): Promise<StockReportItem[]> {
  await checkAdmin()
  const supabase = await createClient()
  
  const { data: drugs } = await supabase.from('drugs').select('id, name, dose, manufacturer').eq('is_active', true)
  const { data: batches } = await supabase.from('batches').select('*')
  
  // To get qty sold exactly, query all prescription items for completed prescriptions
  const { data: pItems } = await supabase
    .from('prescription_items')
    .select('drug_id, quantity, prescriptions!inner(status)')
    .eq('prescriptions.status', 'completed')
  
  const report: StockReportItem[] = []

  if (drugs && batches) {
    for (const drug of drugs) {
      const drugBatches = batches.filter((b: any) => b.drug_id === drug.id)
      let qtyIssued = 0
      let qtyLeft = 0
      let totalValue = 0

      for (const batch of drugBatches) {
        qtyIssued += (batch.quantity_received || 0)
        qtyLeft += (batch.quantity_remaining || 0)
        totalValue += ((batch.quantity_remaining || 0) * (batch.cost_price_per_unit || 0))
      }

      // Calculate qty sold from prescription items
      let qtySold = 0
      if (pItems) {
        qtySold = pItems
          .filter((i: any) => i.drug_id === drug.id)
          .reduce((sum: number, item: any) => sum + item.quantity, 0)
      }

      if (qtyIssued > 0 || qtyLeft > 0) {
        report.push({
          drugId: drug.id,
          drugName: `${drug.name} ${drug.dose}`,
          brand: drug.manufacturer || 'Unknown Brand',
          qtyIssued,
          qtySold,
          qtyLeft,
          totalValue
        })
      }
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
  const supabase = await createClient()
  
  const start = new Date(range.startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(range.endDate)
  end.setHours(23, 59, 59, 999)

  let query = supabase
    .from('prescriptions')
    .select('payment_method, total_amount')
    .eq('status', 'completed')
    .gte('confirmed_at', start.toISOString())
    .lte('confirmed_at', end.toISOString())

  if (staffId) {
    query = query.eq('created_by', staffId)
  }

  const { data: prescriptions, error } = await query
  
  if (error) throw new Error(error.message)

  let cash = 0
  let pos = 0
  let transfer = 0

  if (prescriptions) {
    for (const p of prescriptions) {
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
  const { user } = await requireAuth(['admin'])
  const supabase = await createClient()
  
  const { error } = await supabase.from('reconciliations').insert([{
    date_start: record.date_start,
    date_end: record.date_end,
    staff_id: record.staff_id,
    system_cash: record.system_cash,
    actual_cash: record.actual_cash,
    system_pos: record.system_pos,
    actual_pos: record.actual_pos,
    system_transfer: record.system_transfer,
    actual_transfer: record.actual_transfer,
    created_by: user.id
  }])
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/reports')
  return { success: true }
}

export async function getReconciliationHistory(): Promise<ReconciliationRecord[]> {
  await checkAdmin()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reconciliations')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) throw new Error(error.message)
  
  return data
}
