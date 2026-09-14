export type Drug = {
  id: string
  name: string
  dose: string
  manufacturer?: string
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
      id: '1', name: 'Paracetamol', dose: '500mg', manufacturer: 'Emzor',
      category: 'Analgesics', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '2', name: 'Amoxicillin', dose: '250mg/5ml', manufacturer: 'Fidson',
      category: 'Antibiotics', form: 'syrup', unit_type: 'whole', is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '3', name: 'Paracetamol', dose: '500mg', manufacturer: 'GSK (Panadol)',
      category: 'Analgesics', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '4', name: 'Amoxicillin', dose: '500mg', manufacturer: 'GSK (Amoxil)',
      category: 'Antibiotics', form: 'capsule', unit_type: 'countable', pack_size: 500, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '5', name: 'Vitamin C', dose: '1000mg', manufacturer: 'Emzor',
      category: 'Vitamins', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '6', name: 'Vitamin C', dose: '1000mg', manufacturer: 'Nature\'s Field',
      category: 'Vitamins', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '7', name: 'Vitamin E', dose: '1000 IU', manufacturer: 'Nature\'s Field',
      category: 'Vitamins', form: 'capsule', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '8', name: 'Vitamin E', dose: '1000 IU', manufacturer: 'Green Life',
      category: 'Vitamins', form: 'capsule', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '9', name: 'Ibuprofen', dose: '400mg', manufacturer: 'Emzor',
      category: 'Analgesics', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '10', name: 'Ibuprofen', dose: '200mg', manufacturer: 'Reckitt (Nurofen)',
      category: 'Analgesics', form: 'tablet', unit_type: 'countable', pack_size: 50, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '11', name: 'Artemether/Lumefantrine', dose: '20/120mg', manufacturer: 'Lonart',
      category: 'Antimalarials', form: 'tablet', unit_type: 'countable', pack_size: 24, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '12', name: 'Artemether/Lumefantrine', dose: '20/120mg', manufacturer: 'Coartem',
      category: 'Antimalarials', form: 'tablet', unit_type: 'countable', pack_size: 24, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '13', name: 'Cough Syrup', dose: '100ml', manufacturer: 'Emolin',
      category: 'Expectorants', form: 'syrup', unit_type: 'whole', is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '14', name: 'Cough Syrup', dose: '100ml', manufacturer: 'Benylin',
      category: 'Expectorants', form: 'syrup', unit_type: 'whole', is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '15', name: 'Omeprazole', dose: '20mg', manufacturer: 'Emzor',
      category: 'Antacids', form: 'capsule', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '16', name: 'Omeprazole', dose: '20mg', manufacturer: 'AstraZeneca',
      category: 'Antacids', form: 'capsule', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '17', name: 'Metformin', dose: '500mg', manufacturer: 'Glucophage',
      category: 'Antidiabetics', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '18', name: 'Metformin', dose: '500mg', manufacturer: 'Emzor',
      category: 'Antidiabetics', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '19', name: 'Amlodipine', dose: '5mg', manufacturer: 'Norvasc',
      category: 'Antihypertensives', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '20', name: 'Amlodipine', dose: '5mg', manufacturer: 'Emzor',
      category: 'Antihypertensives', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '21', name: 'Cetirizine', dose: '10mg', manufacturer: 'Zyrtec',
      category: 'Antihistamines', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
    },
    {
      id: '22', name: 'Diclofenac', dose: '50mg', manufacturer: 'Voltaren',
      category: 'NSAIDs', form: 'tablet', unit_type: 'countable', pack_size: 100, is_active: true, created_at: new Date().toISOString()
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
