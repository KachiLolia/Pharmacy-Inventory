import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Generate deterministic UUID v5 namespace based on my pharmacy app
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

function generateDeterministicUuid(seed: string) {
  // Simple UUID v5 equivalent for our deterministic seeding
  const hash = crypto.createHash('sha1').update(NAMESPACE + seed).digest('hex')
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-5${hash.substring(13, 16)}-8${hash.substring(17, 20)}-${hash.substring(20, 32)}`
}

// We will map old string IDs to generated UUIDs
const drugIdMap = new Map<string, string>()
const batchIdMap = new Map<string, string>()
const prescriptionIdMap = new Map<string, string>()
const userIdMap = new Map<string, string>()

async function seedData() {
  console.log('Starting seed migration...')

  // 1. Users
  console.log('Migrating Auth Users...')
  const usersToSeed = [
    { email: 'admin@pharmly.com', role: 'admin', originalId: 'admin-1', name: 'System Admin' },
    { email: 'staff1@pharmly.com', role: 'staff', originalId: 'staff-1', name: 'Staff Member 1' },
    { email: 'staff2@pharmly.com', role: 'staff', originalId: 'staff-2', name: 'Staff Member 2' }
  ]

  for (const user of usersToSeed) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: user.role, name: user.name }
    })
    
    if (authErr && authErr.message.includes('already been registered')) {
       // If exists, find them
       const { data: existingUsers } = await supabase.auth.admin.listUsers()
       const existingUser = existingUsers.users.find(u => u.email === user.email)
       if (existingUser) {
         userIdMap.set(user.originalId, existingUser.id)
       }
    } else if (authErr) {
       console.error('Error creating user:', authErr.message)
    } else if (authUser?.user) {
       userIdMap.set(user.originalId, authUser.user.id)
       // Wait a sec for the trigger to insert into app_users
       await new Promise(resolve => setTimeout(resolve, 500))
       // Admin role trigger will set it to admin automatically for admin@pharmly.com
    }
  }

  console.log('User Mapping:', Object.fromEntries(userIdMap))

  // Ensure Admin exists to fallback if user ID missing
  let fallbackAdminId = Array.from(userIdMap.values())[0]

  // Read mock data dynamically (assuming we just import them, but since we are running via tsx, we can do it)
  const { getMockDrugs } = await import('../lib/mock-data/drugs')
  const { getMockBatches } = await import('../lib/mock-data/batches')
  const { getMockPrescriptions, getMockPrescriptionItems, getMockRefundLogs } = await import('../lib/mock-data/prescriptions')
  const { getMockAlerts } = await import('../lib/mock-data/alerts')
  const { getMockReconciliations } = await import('../lib/mock-data/reconciliations')
  const { getMockSettings } = await import('../lib/mock-data/settings')
  
  // 2. Settings
  console.log('Migrating Settings...')
  const settings = getMockSettings()
  await supabase.from('system_settings').upsert({ id: 1, ...settings })
  
  // 3. Drugs
  console.log('Migrating Drugs...')
  const drugs = getMockDrugs()
  const drugsToInsert = drugs.map(d => {
    const newId = generateDeterministicUuid('drug-' + d.id)
    drugIdMap.set(d.id, newId)
    return {
      id: newId,
      name: d.name,
      dose: d.dose,
      manufacturer: d.manufacturer,
      nafdac_number: d.nafdac_number,
      category: d.category,
      form: d.form,
      unit_type: d.unit_type,
      pack_size: d.pack_size,
      low_stock_threshold: d.low_stock_threshold,
      expiry_warning_days: d.expiry_warning_days,
      is_active: d.is_active,
      created_at: d.created_at
    }
  })
  const { error: drugErr } = await supabase.from('drugs').upsert(drugsToInsert, { onConflict: 'id' })
  if (drugErr) console.error('Drug Error:', drugErr.message)

  // 4. Batches
  console.log('Migrating Batches...')
  const batches = getMockBatches()
  const batchesToInsert = batches.map(b => {
    const newId = generateDeterministicUuid('batch-' + b.id)
    batchIdMap.set(b.id, newId)
    return {
      id: newId,
      drug_id: drugIdMap.get(b.drug_id),
      batch_number: b.batch_number,
      quantity_received: b.quantity_received,
      quantity_remaining: b.quantity_remaining,
      reserved_quantity: b.reserved_quantity,
      cost_price_per_unit: b.cost_price_per_unit,
      selling_price_per_unit: b.selling_price_per_unit,
      manufacturing_date: b.manufacturing_date || null,
      expiry_date: b.expiry_date,
      date_received: b.date_received,
      received_by: userIdMap.get(b.received_by) || fallbackAdminId
    }
  })
  const { error: batchErr } = await supabase.from('batches').upsert(batchesToInsert, { onConflict: 'id' })
  if (batchErr) console.error('Batch Error:', batchErr.message)

  // 5. Prescriptions
  console.log('Migrating Prescriptions...')
  const prescriptions = getMockPrescriptions()
  const prescriptionsToInsert = prescriptions.map(p => {
    const newId = generateDeterministicUuid('prescription-' + p.id)
    prescriptionIdMap.set(p.id, newId)
    return {
      id: newId,
      status: p.status,
      total_amount: p.total_amount,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      created_by: userIdMap.get(p.created_by) || fallbackAdminId,
      created_at: p.created_at,
      confirmed_at: p.confirmed_at || null,
      refund_status: p.refund_status || 'none',
      refunded_amount: p.refunded_amount || 0
    }
  })
  const { error: rxErr } = await supabase.from('prescriptions').upsert(prescriptionsToInsert, { onConflict: 'id' })
  if (rxErr) console.error('Prescription Error:', rxErr.message)

  // 6. Prescription Items
  console.log('Migrating Prescription Items...')
  const items = getMockPrescriptionItems()
  const itemsToInsert = items.map(i => {
    const newId = generateDeterministicUuid('item-' + i.id)
    return {
      id: newId,
      prescription_id: prescriptionIdMap.get(i.prescription_id),
      drug_id: drugIdMap.get(i.drug_id),
      batch_id: batchIdMap.get(i.batch_id),
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      refunded_quantity: i.refunded_quantity || 0
    }
  })
  const { error: itemErr } = await supabase.from('prescription_items').upsert(itemsToInsert, { onConflict: 'id' })
  if (itemErr) console.error('Item Error:', itemErr.message)
  
  // 7. Refund Logs
  const refunds = getMockRefundLogs()
  if (refunds.length > 0) {
      console.log('Migrating Refunds...')
      const refundsToInsert = refunds.map(r => ({
          id: generateDeterministicUuid('refund-' + r.id),
          prescription_id: prescriptionIdMap.get(r.prescription_id),
          processed_by: userIdMap.get(r.processed_by) || fallbackAdminId,
          item_name: r.item_name,
          quantity: r.quantity,
          reason: r.reason,
          amount: r.amount,
          restocked: r.restocked,
          created_at: r.created_at
      }))
      const { error: rErr } = await supabase.from('refund_logs').upsert(refundsToInsert, { onConflict: 'id' })
      if (rErr) console.error('Refund Error:', rErr.message)
  }

  // 8. Alerts
  const alerts = getMockAlerts()
  if (alerts.length > 0) {
      console.log('Migrating Alerts...')
      const alertsToInsert = alerts.map(a => ({
          id: generateDeterministicUuid('alert-' + a.id),
          type: a.type,
          drug_id: drugIdMap.get(a.drug_id),
          batch_id: a.batch_id ? batchIdMap.get(a.batch_id) : null,
          status: a.status,
          notified_via_email: a.notified_via_email,
          notified_via_sms: a.notified_via_sms,
          created_at: a.created_at,
          resolved_at: a.resolved_at || null
      }))
      const { error: aErr } = await supabase.from('alert_logs').upsert(alertsToInsert, { onConflict: 'id' })
      if (aErr) console.error('Alert Error:', aErr.message)
  }

  // 9. Reconciliations
  const reconciliations = getMockReconciliations()
  if (reconciliations.length > 0) {
      console.log('Migrating Reconciliations...')
      const reconsToInsert = reconciliations.map(r => ({
          id: generateDeterministicUuid('recon-' + r.id),
          date_start: r.date_start,
          date_end: r.date_end,
          staff_id: r.staff_id ? userIdMap.get(r.staff_id) : null,
          system_cash: r.system_cash,
          actual_cash: r.actual_cash,
          system_pos: r.system_pos,
          actual_pos: r.actual_pos,
          system_transfer: r.system_transfer,
          actual_transfer: r.actual_transfer,
          created_by: userIdMap.get(r.created_by) || fallbackAdminId,
          created_at: r.created_at
      }))
      const { error: recErr } = await supabase.from('reconciliations').upsert(reconsToInsert, { onConflict: 'id' })
      if (recErr) console.error('Reconciliation Error:', recErr.message)
  }

  console.log('Migration Completed Successfully!')
}

seedData().catch(console.error)
