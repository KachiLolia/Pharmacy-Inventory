'use server'

import { getMockPrescriptions, getMockPrescriptionItems } from '@/lib/mock-data/prescriptions'
import { getMockBatches } from '@/lib/mock-data/batches'
import { getMockDrugs } from '@/lib/mock-data/drugs'

export type AdminDashboardMetrics = {
  totalRevenueToday: number
  transactionCountToday: number
  inventoryValue: number
  topSellingDrugs: { drug_name: string; quantity: number }[]
  recentRestocks: { id: string; name: string; quantity: string; time: string; status: string }[]
}

export type StaffDashboardMetrics = {
  myRevenueToday: number
  myTransactionCountToday: number
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

function formatRelativeTime(dateString: string) {
  const diffInMs = new Date().getTime() - new Date(dateString).getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  if (diffInHours === 0) return 'Just now'
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''} ago`
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const prescriptions = getMockPrescriptions()
  const prescriptionItems = getMockPrescriptionItems()
  const batches = getMockBatches()
  const drugs = getMockDrugs()

  // 1. Revenue & Transactions Today
  const completedToday = prescriptions.filter(p => 
    p.status === 'completed' && 
    p.confirmed_at && 
    isToday(p.confirmed_at)
  )

  const transactionCountToday = completedToday.length
  const totalRevenueToday = completedToday.reduce((sum, p) => sum + p.total_amount, 0)

  // 2. Inventory Value
  // quantity_remaining * cost_price_per_unit
  const inventoryValue = batches.reduce((sum, b) => sum + (b.quantity_remaining * b.cost_price_per_unit), 0)

  // 3. Top Selling Drugs Today
  const topSellingDrugsMap: Record<string, number> = {}
  
  const completedPrescriptionIds = new Set(completedToday.map(p => p.id))
  const itemsToday = prescriptionItems.filter(item => completedPrescriptionIds.has(item.prescription_id))

  for (const item of itemsToday) {
    if (!topSellingDrugsMap[item.drug_id]) {
      topSellingDrugsMap[item.drug_id] = 0
    }
    topSellingDrugsMap[item.drug_id] += item.quantity
  }

  const topSellingDrugs = Object.keys(topSellingDrugsMap).map(drugId => {
    const drug = drugs.find(d => d.id === drugId)
    return {
      drug_name: drug ? `${drug.name} ${drug.dose}` : 'Unknown Drug',
      quantity: topSellingDrugsMap[drugId]
    }
  }).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  // 4. Recent Restocks (Last 5 batches)
  const sortedBatches = [...batches].sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime()).slice(0, 5)
  
  const recentRestocks = sortedBatches.map(b => {
    const drug = drugs.find(d => d.id === b.drug_id)
    return {
      id: b.id,
      name: drug ? `${drug.name} ${drug.dose}` : 'Unknown Drug',
      quantity: `+${b.quantity_received.toLocaleString()} units`,
      time: formatRelativeTime(b.date_received),
      status: 'Delivered'
    }
  })

  return {
    totalRevenueToday,
    transactionCountToday,
    inventoryValue,
    topSellingDrugs,
    recentRestocks
  }
}

export async function getStaffDashboardMetrics(staffId: string): Promise<StaffDashboardMetrics> {
  const prescriptions = getMockPrescriptions()

  const myCompletedToday = prescriptions.filter(p => 
    p.status === 'completed' && 
    p.created_by === staffId &&
    p.confirmed_at && 
    isToday(p.confirmed_at)
  )

  const myTransactionCountToday = myCompletedToday.length
  const myRevenueToday = myCompletedToday.reduce((sum, p) => sum + p.total_amount, 0)

  return {
    myRevenueToday,
    myTransactionCountToday
  }
}
