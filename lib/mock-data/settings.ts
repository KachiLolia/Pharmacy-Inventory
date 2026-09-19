export type SystemSettings = {
  // Profile
  admin_name: string
  admin_email: string
  admin_phone: string
  
  // Pharmacy Info
  pharmacy_name: string
  pharmacy_address: string
  pharmacy_phone: string
  pharmacy_email: string
  pharmacy_logo_url: string
  receipt_message: string

  // Inventory
  global_low_stock_threshold: number
  global_expiry_warning_days: number

  // POS & Sales
  pending_prescription_timeout_mins: number
  default_payment_method: string
  enable_receipt_printing: boolean

  // Refunds
  allow_return_to_stock: boolean

  // Notifications
  email_notifications: boolean
  sms_notifications: boolean
  notification_email: string
  notification_phone: string
  notify_low_stock: boolean
  notify_expiry: boolean
}

const globalAny = globalThis as { mockSettings?: SystemSettings }

if (!globalAny.mockSettings) {
  globalAny.mockSettings = {
    admin_name: 'System Admin',
    admin_email: 'admin@pharmly.com',
    admin_phone: '+234 800 000 0000',
    pharmacy_name: 'Pharmly',
    pharmacy_address: '123 Health Ave, Medical District',
    pharmacy_phone: '+234 123 456 7890',
    pharmacy_email: 'hello@pharmly.com',
    pharmacy_logo_url: '',
    receipt_message: 'Thank you for your patronage!\nPlease keep this receipt for your records.',
    global_low_stock_threshold: 50,
    global_expiry_warning_days: 90,
    pending_prescription_timeout_mins: 30,
    default_payment_method: 'cash',
    enable_receipt_printing: true,
    allow_return_to_stock: true,
    email_notifications: true,
    sms_notifications: false,
    notification_email: 'admin@pharmly.com',
    notification_phone: '+234 800 000 0000',
    notify_low_stock: true,
    notify_expiry: true
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
