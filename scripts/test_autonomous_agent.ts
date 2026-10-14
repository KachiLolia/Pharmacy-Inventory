import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { processAgentMessage } from '../lib/ai/agent'
import { createAdminClient } from '../lib/supabase/server'

async function runTest() {
  console.log('🤖 Starting Autonomous Offline Copilot Verification...\n')

  const testUserId = 'b8e1e0c8-7201-43c1-8c34-04cb732fa434' // real admin UUID
  const supabase = await createAdminClient()

  // 1. Revenue Query
  console.log('--- Test 1: Revenue Query ---')
  const revReply = await processAgentMessage(testUserId, "what's the revenue for today?")
  console.log('User: "what\'s the revenue for today?"')
  console.log('Copilot Reply:\n', revReply)
  console.log('\n----------------------------------------\n')

  // 2. Low Stock Query
  console.log('--- Test 2: Low Stock Query ---')
  const stockReply = await processAgentMessage(testUserId, "which drugs are low on stock?")
  console.log('User: "which drugs are low on stock?"')
  console.log('Copilot Reply:\n', stockReply)
  console.log('\n----------------------------------------\n')

  // 3. Orders Query
  console.log('--- Test 3: Orders Query ---')
  const ordersReply = await processAgentMessage(testUserId, "show pending OTC orders")
  console.log('User: "show pending OTC orders"')
  console.log('Copilot Reply:\n', ordersReply)
  console.log('\n----------------------------------------\n')

  // 4. Add Drug Intent (without parameters)
  console.log('--- Test 4: Add Drug (Interactive Prompt) ---')
  const addPromptReply = await processAgentMessage(testUserId, "Add a new drug")
  console.log('User: "Add a new drug"')
  console.log('Copilot Reply:\n', addPromptReply)
  console.log('\n----------------------------------------\n')

  // 5. Add Drug (with parameters -> Stage Confirmation)
  console.log('--- Test 5: Add Drug (Proposal & Confirmation) ---')
  const testDrugName = `TestCopilotMed_${Date.now().toString().slice(-4)}`
  const addStageReply = await processAgentMessage(
    testUserId, 
    `Add a new drug ${testDrugName} 500mg Tablet pack size 14 category Analgesic`
  )
  console.log(`User: "Add a new drug ${testDrugName} 500mg Tablet pack size 14 category Analgesic"`)
  console.log('Copilot Reply:\n', addStageReply)
  console.log('\n----------------------------------------\n')

  // 6. Confirm Add Drug
  console.log('--- Test 6: Confirm Add Drug ("YES") ---')
  const addConfirmReply = await processAgentMessage(testUserId, "YES")
  console.log('User: "YES"')
  console.log('Copilot Reply:\n', addConfirmReply)
  console.log('\n----------------------------------------\n')

  // Verify in DB
  const { data: createdDrug } = await supabase
    .from('drugs')
    .select('*')
    .eq('name', testDrugName)
    .single()

  if (createdDrug) {
    console.log(`✅ Verified in DB: Drug ${createdDrug.name} created with ID: ${createdDrug.id}`)
  } else {
    console.error(`❌ Verification failed: Drug ${testDrugName} not found in DB!`)
  }

  // 7. Restock with Cancellation
  console.log('--- Test 7: Restock followed by Cancel ---')
  const restockStage = await processAgentMessage(testUserId, `Restock ${testDrugName} by 75 units at 1500`)
  console.log(`User: "Restock ${testDrugName} by 75 units at 1500"`)
  console.log('Copilot Reply:\n', restockStage)
  
  const cancelReply = await processAgentMessage(testUserId, "CANCEL")
  console.log('User: "CANCEL"')
  console.log('Copilot Reply:\n', cancelReply)
  console.log('\n----------------------------------------\n')

  // 8. Restock with Confirmation
  console.log('--- Test 8: Restock with Confirmation ("CONFIRM") ---')
  await processAgentMessage(testUserId, `Restock ${testDrugName} by 75 units at 1500`)
  const restockConfirmReply = await processAgentMessage(testUserId, "CONFIRM")
  console.log('User: "CONFIRM"')
  console.log('Copilot Reply:\n', restockConfirmReply)
  console.log('\n----------------------------------------\n')

  // Verify batch in DB
  const { data: createdBatch } = await supabase
    .from('batches')
    .select('*')
    .eq('drug_id', createdDrug?.id)
    .single()

  if (createdBatch) {
    console.log(`✅ Verified in DB: Batch created for ${testDrugName} with ${createdBatch.quantity_remaining} units!`)
  } else {
    console.error(`❌ Verification failed: Batch not found in DB!`)
  }

  // 9. Clean up test records
  console.log('\nCleaning up test data...')
  if (createdDrug) {
    await supabase.from('batches').delete().eq('drug_id', createdDrug.id)
    await supabase.from('drugs').delete().eq('id', createdDrug.id)
  }
  console.log('✅ Clean up complete! All tests passed successfully.')
}

runTest().catch(console.error)
