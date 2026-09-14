export type Batch = {
  id: string
  drug_id: string
  batch_number?: string
  quantity_received: number
  quantity_remaining: number
  reserved_quantity: number
  cost_price_per_unit: number
  selling_price_per_unit: number
  manufacturing_date?: string
  expiry_date: string
  date_received: string
  received_by: string
}

const globalAny = globalThis as { mockBatches?: Batch[] }

if (!globalAny.mockBatches) {
  // Let's seed some batches for our mock drugs (Paracetamol ID: '1', Amoxicillin ID: '2')
  globalAny.mockBatches = [
    {
      id: 'batch-1',
      drug_id: '1', // Paracetamol
      batch_number: 'PAR-001',
      quantity_received: 5, // 5 packs of 100
      quantity_remaining: 5,
      reserved_quantity: 0,
      cost_price_per_unit: 1000.00, // Cost per pack
      selling_price_per_unit: 1500.00, // Selling price per pack
      manufacturing_date: '2023-01-01',
      expiry_date: '2027-01-01',
      date_received: new Date().toISOString(),
      received_by: 'admin-1',
    },
    {
      id: 'batch-2',
      drug_id: '1', // Paracetamol (newer batch)
      batch_number: 'PAR-002',
      quantity_received: 10, // 10 packs of 100
      quantity_remaining: 10,
      reserved_quantity: 0,
      cost_price_per_unit: 1100.00, // Price went up
      selling_price_per_unit: 1600.00,
      manufacturing_date: '2023-06-01',
      expiry_date: '2027-06-01',
      date_received: new Date().toISOString(),
      received_by: 'admin-1',
    },
    {
      id: 'batch-3',
      drug_id: '2', // Amoxicillin (whole unit)
      batch_number: 'AMX-999',
      quantity_received: 50,
      quantity_remaining: 50,
      reserved_quantity: 0,
      cost_price_per_unit: 500.00,
      selling_price_per_unit: 750.00,
      expiry_date: '2027-12-01', // Expiring sooner
      date_received: new Date().toISOString(),
      received_by: 'admin-1',
    }
  ]
}

export function getMockBatches(): Batch[] {
  return globalAny.mockBatches || []
}

export function saveMockBatch(batch: Partial<Batch>) {
  const batches = getMockBatches()
  
  if (batch.id) {
    const index = batches.findIndex(b => b.id === batch.id)
    if (index !== -1) {
      batches[index] = { ...batches[index], ...batch } as Batch
      return batches[index]
    }
  }
  
  // Try to find an identical batch to merge (same drug, prices, and dates)
  if (!batch.id && batch.drug_id && batch.cost_price_per_unit && batch.selling_price_per_unit && batch.expiry_date) {
    const existing = batches.find(b => 
      b.drug_id === batch.drug_id && 
      b.cost_price_per_unit === batch.cost_price_per_unit &&
      b.selling_price_per_unit === batch.selling_price_per_unit &&
      b.expiry_date === batch.expiry_date &&
      b.batch_number === batch.batch_number // Optional match
    )
    
    if (existing && batch.quantity_received) {
      existing.quantity_received += batch.quantity_received
      existing.quantity_remaining += batch.quantity_received
      return existing
    }
  }

  const newBatch: Batch = {
    ...batch,
    id: Math.random().toString(36).substring(7),
    quantity_remaining: batch.quantity_received || 0,
    reserved_quantity: 0,
    date_received: new Date().toISOString(),
  } as Batch
  
  batches.push(newBatch)
  return newBatch
}

export function getMockBatchesForDrug(drugId: string): Batch[] {
  return getMockBatches().filter(b => b.drug_id === drugId).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
}
