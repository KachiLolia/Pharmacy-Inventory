import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function verify() {
  console.log('--- Verification Report ---')
  
  const tables = [
    'drugs', 
    'batches', 
    'prescriptions', 
    'prescription_items', 
    'refund_logs', 
    'stock_adjustments', 
    'alert_logs', 
    'reconciliations',
    'app_users',
    'system_settings'
  ]

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`Error fetching count for ${table}:`, error.message)
    } else {
      console.log(`Table '${table}' record count: ${count}`)
    }
  }

  // Check Auth Users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log('\nAuth Users Details (from auth.users):', authUsers.users.map(u => ({ id: u.id, email: u.email, role: u.user_metadata?.role })))

  const { data: users, error: errUsers } = await supabase.from('app_users').select('id, role')
  console.log('\nApp Users Details (from public.app_users):', users, 'Error:', errUsers)

  // Check quantities
  const { data: batches } = await supabase.from('batches').select('quantity_remaining')
  const totalStock = batches?.reduce((acc, b) => acc + b.quantity_remaining, 0)
  console.log('Total quantity_remaining across all batches:', totalStock)

  // Check financial
  const { data: prescriptions } = await supabase.from('prescriptions').select('total_amount')
  const totalRevenue = prescriptions?.reduce((acc, p) => acc + Number(p.total_amount), 0)
  console.log('Total Revenue (from prescriptions):', totalRevenue)
}

verify().catch(console.error)
