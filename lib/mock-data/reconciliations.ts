export type ReconciliationRecord = {
  id: string
  date_start: string
  date_end: string
  staff_id: string | null // null means all staff
  system_cash: number
  actual_cash: number
  system_pos: number
  actual_pos: number
  system_transfer: number
  actual_transfer: number
  created_at: string
  created_by: string // admin who saved it
}

const globalAny = globalThis as { mockReconciliations?: ReconciliationRecord[] }

if (!globalAny.mockReconciliations) {
  globalAny.mockReconciliations = []
}

export function getMockReconciliations(): ReconciliationRecord[] {
  return globalAny.mockReconciliations || []
}

export function saveMockReconciliation(record: Omit<ReconciliationRecord, 'id' | 'created_at'>): ReconciliationRecord {
  const records = getMockReconciliations()
  const newRecord: ReconciliationRecord = {
    ...record,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString()
  }
  records.push(newRecord)
  return newRecord
}
