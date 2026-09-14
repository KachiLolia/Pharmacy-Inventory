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
    { id: 'batch-1', drug_id: '1', batch_number: 'PAR-001', quantity_received: 10, quantity_remaining: 10, reserved_quantity: 0, cost_price_per_unit: 1000, selling_price_per_unit: 1500, expiry_date: '2027-01-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-2', drug_id: '2', batch_number: 'AMX-001', quantity_received: 20, quantity_remaining: 20, reserved_quantity: 0, cost_price_per_unit: 600, selling_price_per_unit: 800, expiry_date: '2027-02-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-3', drug_id: '3', batch_number: 'PAR-002', quantity_received: 5, quantity_remaining: 5, reserved_quantity: 0, cost_price_per_unit: 1200, selling_price_per_unit: 1700, expiry_date: '2027-03-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-4', drug_id: '4', batch_number: 'AMX-002', quantity_received: 15, quantity_remaining: 15, reserved_quantity: 0, cost_price_per_unit: 800, selling_price_per_unit: 1200, expiry_date: '2027-04-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-5', drug_id: '5', batch_number: 'VIT-001', quantity_received: 50, quantity_remaining: 50, reserved_quantity: 0, cost_price_per_unit: 400, selling_price_per_unit: 600, expiry_date: '2027-05-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-6', drug_id: '6', batch_number: 'VIT-002', quantity_received: 30, quantity_remaining: 30, reserved_quantity: 0, cost_price_per_unit: 500, selling_price_per_unit: 750, expiry_date: '2027-06-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-7', drug_id: '7', batch_number: 'VITE-001', quantity_received: 20, quantity_remaining: 20, reserved_quantity: 0, cost_price_per_unit: 1500, selling_price_per_unit: 2200, expiry_date: '2027-07-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-8', drug_id: '8', batch_number: 'VITE-002', quantity_received: 25, quantity_remaining: 25, reserved_quantity: 0, cost_price_per_unit: 1400, selling_price_per_unit: 2000, expiry_date: '2027-08-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-9', drug_id: '9', batch_number: 'IBU-001', quantity_received: 40, quantity_remaining: 40, reserved_quantity: 0, cost_price_per_unit: 500, selling_price_per_unit: 800, expiry_date: '2027-09-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-10', drug_id: '10', batch_number: 'IBU-002', quantity_received: 10, quantity_remaining: 10, reserved_quantity: 0, cost_price_per_unit: 700, selling_price_per_unit: 1000, expiry_date: '2027-10-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-11', drug_id: '11', batch_number: 'ART-001', quantity_received: 60, quantity_remaining: 60, reserved_quantity: 0, cost_price_per_unit: 800, selling_price_per_unit: 1200, expiry_date: '2027-11-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-12', drug_id: '12', batch_number: 'ART-002', quantity_received: 45, quantity_remaining: 45, reserved_quantity: 0, cost_price_per_unit: 900, selling_price_per_unit: 1400, expiry_date: '2027-12-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-13', drug_id: '13', batch_number: 'COU-001', quantity_received: 35, quantity_remaining: 35, reserved_quantity: 0, cost_price_per_unit: 1100, selling_price_per_unit: 1600, expiry_date: '2028-01-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-14', drug_id: '14', batch_number: 'COU-002', quantity_received: 20, quantity_remaining: 20, reserved_quantity: 0, cost_price_per_unit: 1300, selling_price_per_unit: 1800, expiry_date: '2028-02-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-15', drug_id: '15', batch_number: 'OME-001', quantity_received: 25, quantity_remaining: 25, reserved_quantity: 0, cost_price_per_unit: 400, selling_price_per_unit: 700, expiry_date: '2028-03-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-16', drug_id: '16', batch_number: 'OME-002', quantity_received: 15, quantity_remaining: 15, reserved_quantity: 0, cost_price_per_unit: 500, selling_price_per_unit: 800, expiry_date: '2028-04-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-17', drug_id: '17', batch_number: 'MET-001', quantity_received: 30, quantity_remaining: 30, reserved_quantity: 0, cost_price_per_unit: 1000, selling_price_per_unit: 1500, expiry_date: '2028-05-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-18', drug_id: '18', batch_number: 'MET-002', quantity_received: 40, quantity_remaining: 40, reserved_quantity: 0, cost_price_per_unit: 800, selling_price_per_unit: 1200, expiry_date: '2028-06-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-19', drug_id: '19', batch_number: 'AML-001', quantity_received: 20, quantity_remaining: 20, reserved_quantity: 0, cost_price_per_unit: 600, selling_price_per_unit: 900, expiry_date: '2028-07-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-20', drug_id: '20', batch_number: 'AML-002', quantity_received: 15, quantity_remaining: 15, reserved_quantity: 0, cost_price_per_unit: 500, selling_price_per_unit: 800, expiry_date: '2028-08-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-21', drug_id: '21', batch_number: 'CET-001', quantity_received: 50, quantity_remaining: 50, reserved_quantity: 0, cost_price_per_unit: 300, selling_price_per_unit: 500, expiry_date: '2028-09-01', date_received: new Date().toISOString(), received_by: 'admin-1' },
    { id: 'batch-22', drug_id: '22', batch_number: 'DIC-001', quantity_received: 25, quantity_remaining: 25, reserved_quantity: 0, cost_price_per_unit: 400, selling_price_per_unit: 600, expiry_date: '2028-10-01', date_received: new Date().toISOString(), received_by: 'admin-1' }
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
