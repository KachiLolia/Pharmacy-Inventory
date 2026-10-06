import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkState() {
  console.log('--- LATEST PRESCRIPTION ---')
  const { data: pres, error: presError } = await supabase
    .from('prescriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (presError) console.error(presError)
  console.log(pres)

  if (pres && pres.length > 0) {
    console.log('\n--- PRESCRIPTION ITEMS ---')
    const { data: items, error: itemsError } = await supabase
      .from('prescription_items')
      .select('*, drugs(name, dose)')
      .eq('prescription_id', pres[0].id)
    
    if (itemsError) console.error(itemsError)
    console.log(items)

    console.log('\n--- BATCHES ---')
    for (const item of items || []) {
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', item.batch_id)
        .single()
      
      if (batchError) console.error(batchError)
      console.log(`Batch ${batch.batch_number}: remaining = ${batch.quantity_remaining}, reserved = ${batch.reserved_quantity}`)
    }
  }
}

checkState()
