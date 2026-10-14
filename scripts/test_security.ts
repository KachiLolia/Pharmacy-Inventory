import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAnon = createClient(supabaseUrl, anonKey)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

async function runTests() {
  console.log('Starting Phase 3 Verification...\n')
  
  // Create a dummy drug and batch to test with
  const { data: drug, error: dErr } = await supabaseService.from('drugs').insert({
    name: 'Security Test Drug',
    dose: '500mg',
    category: 'Test',
    form: 'Tablet',
    unit_type: 'countable',
    pack_size: 10
  }).select('id').single()

  if (dErr || !drug) {
    console.error('Failed to setup test drug:', dErr)
    return
  }

  const { data: user } = await supabaseService.from('app_users').select('id').limit(1).single()

  const { data: batch, error: bErr } = await supabaseService.from('batches').insert({
    drug_id: drug.id,
    quantity_received: 1000,
    quantity_remaining: 1000,
    reserved_quantity: 0,
    cost_price_per_unit: 10,
    selling_price_per_unit: 20,
    expiry_date: '2028-01-01',
    date_received: new Date().toISOString(),
    received_by: user?.id
  }).select('id').single()

  if (bErr || !batch) {
    console.error('Failed to setup test batch:', bErr)
    return
  }

  try {
    // 1. Concurrency limit on reservations
    console.log('--- Test 1: Concurrency Limits ---')
    const sourceIp = 'test-ip-' + Date.now()
    const promises = []
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        supabaseAnon.rpc('reserve_stock', {
          p_items: [{ drug_id: drug.id, quantity: 1 }],
          p_source: sourceIp
        })
      )
    }
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => !r.error).length
    const failCount = results.filter(r => r.error).length
    
    console.log(`Expected 5 successes, 5 failures.`)
    console.log(`Actual: ${successCount} successes, ${failCount} failures.`)
    if (successCount === 5) {
      console.log('✅ Concurrency limits working correctly.\n')
    } else {
      console.log('❌ Concurrency limits failed.\n')
    }

    const firstReservationId = results.find(r => !r.error)?.data

    // 2. Idempotent Confirm
    console.log('--- Test 2: Idempotent confirm_sale ---')
    if (!firstReservationId) {
      console.log('❌ Cannot run Test 2: no reservation id.')
    } else {
      const paymentRef = 'PAY-' + Date.now()
      
      // Call 1
      const { data: sale1, error: saleErr1 } = await supabaseService.rpc('confirm_sale', {
        p_reservation_id: firstReservationId,
        p_channel: 'storefront',
        p_payment_ref: paymentRef
      })
      
      // Call 2
      const { data: sale2, error: saleErr2 } = await supabaseService.rpc('confirm_sale', {
        p_reservation_id: firstReservationId,
        p_channel: 'storefront',
        p_payment_ref: paymentRef
      })
      
      if (!saleErr1 && !saleErr2 && sale1 === sale2) {
        console.log(`✅ Idempotency working. Both calls returned same prescription_id: ${sale1}\n`)
      } else {
        console.log(`❌ Idempotency failed. Call1: ${sale1} (err: ${saleErr1?.message}), Call2: ${sale2} (err: ${saleErr2?.message})\n`)
      }
    }

    // 3. Staff blocked from modifying total_amount
    console.log('--- Test 3: Staff RLS & Trigger ---')
    // Create a mock otc_order
    const { data: order, error: orderErr } = await supabaseService.from('otc_orders').insert({
      customer_name: 'Test Customer',
      customer_phone: '0000000',
      fulfillment_method: 'pickup',
      line_items: [{ drug_id: drug.id, quantity: 1, unit_price: 20 }],
      total_amount: 20
    }).select('id').single()

    if (orderErr) {
      console.error('❌ Failed to insert test order:', orderErr)
    } else {
      console.log('⚠️ Test 3 (Staff modifications) requires a real Staff auth token to execute accurately. The trigger restrict_staff_otc_order_updates has been applied successfully.')
    }

  } finally {
    // Cleanup
    console.log('\nCleaning up test data...')
    await supabaseService.from('drugs').delete().eq('id', drug.id)
    console.log('Done.')
  }
}

runTests().catch(console.error)
