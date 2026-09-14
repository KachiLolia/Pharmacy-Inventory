export type Drug = {
  id: string
  name: string
  dose: string
  nafdac_number?: string
  category: string
  form: string
  unit_type: 'countable' | 'whole'
  pack_size?: number
  low_stock_threshold?: number
  expiry_warning_days?: number
  is_active: boolean
  created_at: string
}

const globalAny = globalThis as { mockDrugs?: Drug[] }

if (!globalAny.mockDrugs) {
  globalAny.mockDrugs = [
    {
      id: '1',
      name: 'Paracetamol',
      dose: '500mg',
      nafdac_number: 'A4-1234',
      category: 'Analgesics',
      form: 'tablet',
      unit_type: 'countable',
      pack_size: 100,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Amoxicillin',
      dose: '250mg/5ml',
      nafdac_number: 'B2-5678',
      category: 'Antibiotics',
      form: 'syrup',
      unit_type: 'whole',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]
}

export function getMockDrugs(): Drug[] {
  return globalAny.mockDrugs || []
}

export function saveMockDrug(drug: Partial<Drug>) {
  const drugs = getMockDrugs()
  if (drug.id) {
    const index = drugs.findIndex(d => d.id === drug.id)
    if (index !== -1) {
      drugs[index] = { ...drugs[index], ...drug }
      return drugs[index]
    }
  }
  const newDrug: Drug = {
    ...drug,
    id: Math.random().toString(36).substring(7),
    is_active: drug.is_active ?? true,
    created_at: new Date().toISOString()
  } as Drug
  drugs.push(newDrug)
  return newDrug
}
