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

export type PrescriptionStatus = 'pending' | 'completed' | 'cancelled'
export type RefundStatus = 'none' | 'partial' | 'full'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | null

export type Prescription = {
  id: string
  status: PrescriptionStatus
  total_amount: number
  created_by: string
  created_at: string
  payment_method?: PaymentMethod
  receipt_number?: string
  confirmed_at?: string
  refund_status?: RefundStatus
  refunded_amount?: number
}

export type RefundLog = {
  id: string
  prescription_id: string
  processed_by: string
  item_name: string
  quantity: number
  reason: string
  amount: number
  restocked: boolean
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
  refunded_quantity?: number
}

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

export type SystemSettings = {
  id: number
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
  
  updated_at?: string
}

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
