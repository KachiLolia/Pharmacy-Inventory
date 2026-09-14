export type PrescriptionStatus = 'pending' | 'completed' | 'cancelled'

export type Prescription = {
  id: string
  status: PrescriptionStatus
  total_amount: number
  created_by: string
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
}

const globalAny = globalThis as { 
  mockPrescriptions?: Prescription[],
  mockPrescriptionItems?: PrescriptionItem[]
}

if (!globalAny.mockPrescriptions) {
  globalAny.mockPrescriptions = []
}
if (!globalAny.mockPrescriptionItems) {
  globalAny.mockPrescriptionItems = []
}

export function getMockPrescriptions(): Prescription[] {
  return globalAny.mockPrescriptions || []
}

export function getMockPrescriptionItems(): PrescriptionItem[] {
  return globalAny.mockPrescriptionItems || []
}

export function saveMockPrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Prescription {
  const prescriptions = getMockPrescriptions()
  
  const newPrescription: Prescription = {
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
    ...item,
    id: Math.random().toString(36).substring(7),
  }
  
  items.push(newItem)
  return newItem
}

export function updateMockPrescriptionStatus(id: string, status: PrescriptionStatus) {
  const prescriptions = getMockPrescriptions()
  const prescription = prescriptions.find(p => p.id === id)
  if (prescription) {
    prescription.status = status
  }
}
