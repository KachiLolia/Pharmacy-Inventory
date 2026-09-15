export type SystemSettings = {
  global_low_stock_threshold: number
  global_expiry_warning_days: number
}

const globalAny = globalThis as { mockSettings?: SystemSettings }

if (!globalAny.mockSettings) {
  globalAny.mockSettings = {
    global_low_stock_threshold: 50,
    global_expiry_warning_days: 90
  }
}

export function getMockSettings(): SystemSettings {
  return globalAny.mockSettings!
}

export function updateMockSettings(updates: Partial<SystemSettings>) {
  if (globalAny.mockSettings) {
    globalAny.mockSettings = { ...globalAny.mockSettings, ...updates }
  }
}
