export type PrescriptionStatus = 'pending' | 'completed' | 'cancelled'
export type RefundStatus = 'none' | 'partial' | 'full'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | null

export type Prescription = {
  id: string
  status: PrescriptionStatus
  total_amount: number
  created_by: string
  created_at: string
  payment_method?: PaymentMethod
  receipt_number?: string
  confirmed_at?: string
  refund_status?: RefundStatus
  refunded_amount?: number
}

export type RefundLog = {
  id: string
  prescription_id: string
  processed_by: string
  item_name: string
  quantity: number
  reason: string
  amount: number
  restocked: boolean
  created_at: string
}

export type PrescriptionItem = {
  id: string
  prescription_id: string
  drug_id: string
  batch_id: string
  quantity: number
  unit_price: number
  subtotal: number
  refunded_quantity?: number
}

const globalAny = globalThis as { 
  mockPrescriptions?: Prescription[],
  mockPrescriptionItems?: PrescriptionItem[],
  mockRefundLogs?: RefundLog[]
}

if (!globalAny.mockPrescriptions) {
  const today = new Date()
  const todayIso = today.toISOString()
  
  // Create some mock sales for today for testing dashboards
  globalAny.mockPrescriptions = [
    {
      id: 'mock-sale-1',
      status: 'completed',
      total_amount: 3000,
      created_by: 'staff-1',
      created_at: todayIso,
      payment_method: 'cash',
      receipt_number: 'RCPT-001',
      confirmed_at: todayIso,
      refund_status: 'none'
    },
    {
      id: 'mock-sale-2',
      status: 'completed',
      total_amount: 4500,
      created_by: 'staff-2',
      created_at: todayIso,
      payment_method: 'card',
      receipt_number: 'RCPT-002',
      confirmed_at: todayIso,
      refund_status: 'none'
    },
    {
      id: 'mock-sale-3',
      status: 'completed',
      total_amount: 1500,
      created_by: 'staff-1',
      created_at: todayIso,
      payment_method: 'transfer',
      receipt_number: 'RCPT-003',
      confirmed_at: todayIso,
      refund_status: 'none'
    }
  ]
}

if (!globalAny.mockPrescriptionItems) {
  // Add items for the mock sales
  globalAny.mockPrescriptionItems = [
    { id: 'item-1', prescription_id: 'mock-sale-1', drug_id: '1', batch_id: 'batch-1', quantity: 2, unit_price: 1500, subtotal: 3000 },
    { id: 'item-2', prescription_id: 'mock-sale-2', drug_id: '1', batch_id: 'batch-1', quantity: 1, unit_price: 1500, subtotal: 1500 },
    { id: 'item-3', prescription_id: 'mock-sale-2', drug_id: '2', batch_id: 'batch-2', quantity: 2, unit_price: 1500, subtotal: 3000 },
    { id: 'item-4', prescription_id: 'mock-sale-3', drug_id: '17', batch_id: 'batch-17', quantity: 1, unit_price: 1500, subtotal: 1500 }
  ]
}

if (!globalAny.mockRefundLogs) {
  globalAny.mockRefundLogs = []
}

export function getMockPrescriptions(): Prescription[] {
  return globalAny.mockPrescriptions || []
}

export function getMockPrescriptionItems(): PrescriptionItem[] {
  return globalAny.mockPrescriptionItems || []
}

export function getMockRefundLogs(): RefundLog[] {
  const logs = globalAny.mockRefundLogs || []
  
  // Patch old legacy records created before the schema update
  logs.forEach(log => {
    if (!log.item_name) {
      log.item_name = 'Amoxicillin 250mg' // generic fallback for old records
    }
    if (!log.quantity) {
      log.quantity = log.amount / 1500 // rough guess based on amount
    }
  })
  
  return logs
}

export function saveMockPrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Prescription {
  const prescriptions = getMockPrescriptions()
  
  const newPrescription: Prescription = {
    refund_status: 'none',
    refunded_amount: 0,
    ...prescription,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString(),
  }
  
  prescriptions.push(newPrescription)
  return newPrescription
}

export function saveMockPrescriptionItem(item: Omit<PrescriptionItem, 'id'>): PrescriptionItem {
  const items = getMockPrescriptionItems()
  
  const newItem: PrescriptionItem = {
    refunded_quantity: 0,
    ...item,
    id: Math.random().toString(36).substring(7),
  }
  
  items.push(newItem)
  return newItem
}

export function saveMockRefundLog(log: Omit<RefundLog, 'id' | 'created_at'>): RefundLog {
  const logs = getMockRefundLogs()
  const newLog = {
    ...log,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString()
  }
  logs.push(newLog)
  return newLog
}

export function updateMockPrescription(id: string, updates: Partial<Omit<Prescription, 'id' | 'created_at' | 'created_by' | 'total_amount'>>) {
  const prescriptions = getMockPrescriptions()
  const index = prescriptions.findIndex(p => p.id === id)
  if (index !== -1) {
    prescriptions[index] = { ...prescriptions[index], ...updates }
  }
}

export function updateMockPrescriptionItem(id: string, updates: Partial<Omit<PrescriptionItem, 'id' | 'prescription_id' | 'drug_id' | 'batch_id'>>) {
  const items = getMockPrescriptionItems()
  const index = items.findIndex(i => i.id === id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates }
  }
}

export function updateMockPrescriptionStatus(id: string, status: PrescriptionStatus) {
  updateMockPrescription(id, { status })
}

