export type StockAdjustment = {
  id: string
  batch_id: string
  drug_id: string
  adjustment_type: 'increase' | 'decrease'
  quantity: number // absolute value
  previous_quantity: number
  resulting_quantity: number
  reason: string
  notes?: string
  adjusted_by: string // user email or ID
  created_at: string
}

const globalAny = globalThis as { mockAdjustments?: StockAdjustment[] }

if (!globalAny.mockAdjustments) {
  globalAny.mockAdjustments = []
}

export function getMockAdjustments(): StockAdjustment[] {
  return globalAny.mockAdjustments || []
}

export function saveMockAdjustment(adjustment: Omit<StockAdjustment, 'id' | 'created_at'>) {
  const adjustments = getMockAdjustments()
  
  const newAdjustment: StockAdjustment = {
    ...adjustment,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString(),
  }
  
  adjustments.push(newAdjustment)
  return newAdjustment
}

export function getMockAdjustmentsForBatch(batchId: string): StockAdjustment[] {
  return getMockAdjustments()
    .filter(a => a.batch_id === batchId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // newest first
}
