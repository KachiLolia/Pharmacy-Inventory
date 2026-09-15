export type AlertType = 'low_stock' | 'expiry'
export type AlertStatus = 'active' | 'resolved'

export type AlertLog = {
  id: string
  type: AlertType
  drug_id: string
  batch_id?: string // Only for expiry alerts
  status: AlertStatus
  notified_via_email: boolean
  notified_via_sms: boolean
  created_at: string
  resolved_at?: string
}

const globalAny = globalThis as { mockAlerts?: AlertLog[] }

if (!globalAny.mockAlerts) {
  globalAny.mockAlerts = []
}

export function getMockAlerts(): AlertLog[] {
  return globalAny.mockAlerts || []
}

export function saveMockAlert(alert: Omit<AlertLog, 'id' | 'created_at'>): AlertLog {
  const alerts = getMockAlerts()
  const newAlert: AlertLog = {
    ...alert,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString()
  }
  alerts.push(newAlert)
  return newAlert
}

export function updateMockAlert(id: string, updates: Partial<Omit<AlertLog, 'id' | 'created_at' | 'drug_id' | 'batch_id' | 'type'>>) {
  const alerts = getMockAlerts()
  const index = alerts.findIndex(a => a.id === id)
  if (index !== -1) {
    alerts[index] = { ...alerts[index], ...updates }
  }
}
