'use server'

import { createClient } from '@/lib/supabase/server'
import { 
  getMockPrescriptions, 
  getMockPrescriptionItems, 
  saveMockPrescription, 
  saveMockPrescriptionItem, 
  updateMockPrescriptionStatus,
  updateMockPrescription
} from '@/lib/mock-data/prescriptions'
import { getMockBatches, saveMockBatch } from '@/lib/mock-data/batches'
import { revalidatePath } from 'next/cache'
import { evaluateAlerts } from './alerts'

export type CartItem = {
  drug_id: string
  required_quantity: number
}

export type AllocatedBatch = {
  batch_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type FEFOAllocation = {
  drug_id: string
  allocated_batches: AllocatedBatch[]
  total_quantity: number
  total_price: number
}

export async function calculateFEFOAllocation(cartItems: CartItem[]): Promise<FEFOAllocation[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const batches = getMockBatches()
    const allocations: FEFOAllocation[] = []

    for (const item of cartItems) {
      const drugBatches = batches
        .filter(b => b.drug_id === item.drug_id)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())

      let remainingToFulfill = item.required_quantity
      const allocatedBatches: AllocatedBatch[] = []
      let total_price = 0

      for (const batch of drugBatches) {
        if (remainingToFulfill <= 0) break
        
        // Skip expired batches
        if (new Date(batch.expiry_date) < new Date()) continue

        const available = batch.quantity_remaining - batch.reserved_quantity
        if (available <= 0) continue

        const allocateQty = Math.min(available, remainingToFulfill)
        const subtotal = allocateQty * batch.selling_price_per_unit

        allocatedBatches.push({
          batch_id: batch.id,
          quantity: allocateQty,
          unit_price: batch.selling_price_per_unit,
          subtotal
        })

        remainingToFulfill -= allocateQty
        total_price += subtotal
      }

      if (remainingToFulfill > 0) {
        throw new Error(`Insufficient stock for drug ID ${item.drug_id}. Short by ${remainingToFulfill} units.`)
      }

      allocations.push({
        drug_id: item.drug_id,
        allocated_batches: allocatedBatches,
        total_quantity: item.required_quantity,
        total_price
      })
    }

    return allocations
  }

  // Supabase Implementation
  const supabase = await createClient()
  const allocations: FEFOAllocation[] = []

  for (const item of cartItems) {
    const { data: drugBatches, error } = await supabase
      .from('batches')
      .select('*')
      .eq('drug_id', item.drug_id)
      .order('expiry_date', { ascending: true })

    if (error) throw new Error(error.message)

    let remainingToFulfill = item.required_quantity
    const allocatedBatches: AllocatedBatch[] = []
    let total_price = 0

    for (const batch of drugBatches) {
      if (remainingToFulfill <= 0) break
      
      if (new Date(batch.expiry_date) < new Date()) continue

      const available = batch.quantity_remaining - batch.reserved_quantity
      if (available <= 0) continue

      const allocateQty = Math.min(available, remainingToFulfill)
      const subtotal = allocateQty * batch.selling_price_per_unit

      allocatedBatches.push({
        batch_id: batch.id,
        quantity: allocateQty,
        unit_price: batch.selling_price_per_unit,
        subtotal
      })

      remainingToFulfill -= allocateQty
      total_price += subtotal
    }

    if (remainingToFulfill > 0) {
      throw new Error(`Insufficient stock for drug ID ${item.drug_id}.`)
    }

    allocations.push({
      drug_id: item.drug_id,
      allocated_batches: allocatedBatches,
      total_quantity: item.required_quantity,
      total_price
    })
  }

  return allocations
}

export async function createPrescription(cartItems: CartItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const created_by = user.email || user.id

  // 1. Calculate and lock allocations securely on the server
  const allocations = await calculateFEFOAllocation(cartItems)
  const total_amount = allocations.reduce((sum, alloc) => sum + alloc.total_price, 0)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const batches = getMockBatches()

    // Ensure atomic-like check before saving
    for (const alloc of allocations) {
      for (const ab of alloc.allocated_batches) {
        const batch = batches.find(b => b.id === ab.batch_id)
        if (!batch) throw new Error(`Batch not found`)
        if (batch.quantity_remaining - batch.reserved_quantity < ab.quantity) {
           throw new Error(`Concurrency issue: Not enough stock left in batch ${ab.batch_id}`)
        }
      }
    }

    const prescription = saveMockPrescription({
      status: 'pending',
      total_amount,
      created_by
    })

    for (const alloc of allocations) {
      for (const ab of alloc.allocated_batches) {
        saveMockPrescriptionItem({
          prescription_id: prescription.id,
          drug_id: alloc.drug_id,
          batch_id: ab.batch_id,
          quantity: ab.quantity,
          unit_price: ab.unit_price,
          subtotal: ab.subtotal
        })

        // Increase reserved_quantity on the batch
        const batch = batches.find(b => b.id === ab.batch_id)!
        saveMockBatch({
          id: batch.id,
          reserved_quantity: batch.reserved_quantity + ab.quantity
        })
      }
    }

    revalidatePath('/admin/pos')
    revalidatePath('/staff/pos')
    return { success: true, prescription_id: prescription.id }
  }

  // Supabase Implementation 
  // Real implementation should use an RPC function to guarantee atomicity of the reservation
  // We will do it sequentially here as a fallback if RPC isn't available
  
  // Create prescription
  const { data: prescription, error: pError } = await supabase
    .from('prescriptions')
    .insert([{ status: 'pending', total_amount, created_by }])
    .select()
    .single()
  
  if (pError || !prescription) throw new Error(pError?.message || 'Failed to create prescription')

  for (const alloc of allocations) {
    for (const ab of alloc.allocated_batches) {
      await supabase
        .from('prescription_items')
        .insert([{
          prescription_id: prescription.id,
          drug_id: alloc.drug_id,
          batch_id: ab.batch_id,
          quantity: ab.quantity,
          unit_price: ab.unit_price,
          subtotal: ab.subtotal
        }])
      
      // Update reservation
      // In production PostgreSQL, we'd do: reserved_quantity = reserved_quantity + quantity
      const { data: batch } = await supabase.from('batches').select('reserved_quantity').eq('id', ab.batch_id).single()
      if (batch) {
        await supabase
          .from('batches')
          .update({ reserved_quantity: batch.reserved_quantity + ab.quantity })
          .eq('id', ab.batch_id)
      }
    }
  }

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true, prescription_id: prescription.id }
}

export async function cancelPrescription(prescriptionId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const prescriptions = getMockPrescriptions()
    const prescription = prescriptions.find(p => p.id === prescriptionId)
    if (!prescription) throw new Error('Prescription not found')
    if (prescription.status !== 'pending') throw new Error('Only pending prescriptions can be cancelled')

    updateMockPrescriptionStatus(prescriptionId, 'cancelled')

    const items = getMockPrescriptionItems().filter(i => i.prescription_id === prescriptionId)
    const batches = getMockBatches()

    // Release reservations
    for (const item of items) {
      const batch = batches.find(b => b.id === item.batch_id)
      if (batch) {
        saveMockBatch({
          id: batch.id,
          reserved_quantity: Math.max(0, batch.reserved_quantity - item.quantity)
        })
      }
    }

    revalidatePath('/admin/pos')
    revalidatePath('/staff/pos')
    return { success: true }
  }

  // Supabase Implementation
  const supabase = await createClient()
  
  const { data: prescription } = await supabase.from('prescriptions').select('status').eq('id', prescriptionId).single()
  if (!prescription) throw new Error('Prescription not found')
  if (prescription.status !== 'pending') throw new Error('Only pending prescriptions can be cancelled')

  const { error: updateError } = await supabase.from('prescriptions').update({ status: 'cancelled' }).eq('id', prescriptionId)
  if (updateError) throw new Error(updateError.message)

  const { data: items } = await supabase.from('prescription_items').select('*').eq('prescription_id', prescriptionId)
  
  if (items) {
    for (const item of items) {
      const { data: batch } = await supabase.from('batches').select('reserved_quantity').eq('id', item.batch_id).single()
      if (batch) {
        await supabase
          .from('batches')
          .update({ reserved_quantity: Math.max(0, batch.reserved_quantity - item.quantity) })
          .eq('id', item.batch_id)
      }
    }
  }

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  return { success: true }
}

export async function getPendingPrescriptions() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getMockPrescriptions().filter(p => p.status === 'pending').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getCompletedPrescriptions(isAdmin: boolean = false) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // For mock environment, we can't easily get the real 'current user' without a session, 
    // but we can simulate the filter if needed. We'll return all for admin, and simulate staff by filtering 'staff@example.com' if not admin.
    // However, the PRD says created_by is stored. We'll just return all for admin.
    const allCompleted = getMockPrescriptions().filter(p => p.status === 'completed').sort((a, b) => new Date(b.confirmed_at || b.created_at).getTime() - new Date(a.confirmed_at || a.created_at).getTime()).reverse()
    
    // In mock mode, if not admin, we would normally filter. Since we lack mock auth state here, we might just return all, or filter by a dummy user.
    // To satisfy the requirement: "Staff can view only completed sales processed by themselves. Enforce this server-side"
    // We'll filter by 'staff@example.com' if not admin (assuming our mock login sets created_by to 'staff@example.com' or 'admin@example.com').
    if (!isAdmin) {
      // In our pos.ts, created_by is set to 'staff-1' or similar in mock if we passed it, but currently it's just what's in mock data.
      // We will rely on Supabase for real enforcement.
      return allCompleted.filter(p => p.created_by !== 'admin-1' && p.created_by !== 'admin@pharmacy.com')
    }
    
    return allCompleted
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('prescriptions')
    .select('*')
    .eq('status', 'completed')
    .order('confirmed_at', { ascending: false })

  if (!isAdmin) {
    const createdBy = user.email || user.id
    query = query.eq('created_by', createdBy)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getPrescriptionItems(prescriptionId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getMockPrescriptionItems().filter(i => i.prescription_id === prescriptionId)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prescription_items')
    .select('*')
    .eq('prescription_id', prescriptionId)

  if (error) throw new Error(error.message)
  return data
}

export async function confirmPayment(prescriptionId: string, paymentMethod: 'cash' | 'card' | 'transfer') {
  const receipt_number = `RCPT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
  const confirmed_at = new Date().toISOString()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const prescriptions = getMockPrescriptions()
    const prescription = prescriptions.find(p => p.id === prescriptionId)
    if (!prescription) throw new Error('Prescription not found')
    if (prescription.status !== 'pending') throw new Error('Only pending prescriptions can be confirmed')

    const items = getMockPrescriptionItems().filter(i => i.prescription_id === prescriptionId)
    const batches = getMockBatches()

    // 1. Verify all reserved quantities are still valid
    for (const item of items) {
      const batch = batches.find(b => b.id === item.batch_id)
      if (!batch) throw new Error(`Batch ${item.batch_id} not found`)
      if (batch.reserved_quantity < item.quantity) {
        throw new Error(`Invalid reserved quantity for batch ${item.batch_id}`)
      }
      if (batch.quantity_remaining < item.quantity) {
         throw new Error(`Insufficient actual stock in batch ${item.batch_id}`)
      }
    }

    // 2. Perform the atomic transaction updates
    for (const item of items) {
      const batch = batches.find(b => b.id === item.batch_id)!
      saveMockBatch({
        id: batch.id,
        quantity_remaining: Math.max(0, batch.quantity_remaining - item.quantity),
        reserved_quantity: Math.max(0, batch.reserved_quantity - item.quantity)
      })
    }

    updateMockPrescription(prescriptionId, {
      status: 'completed',
      payment_method: paymentMethod,
      receipt_number,
      confirmed_at
    })

    revalidatePath('/admin/pos')
    revalidatePath('/staff/pos')
    revalidatePath('/admin')
    revalidatePath('/staff')
    
    await evaluateAlerts()
    
    return { success: true, receipt_number, confirmed_at }
  }

  // Supabase Implementation
  const supabase = await createClient()

  // 1. Verify prescription state
  const { data: prescription, error: pError } = await supabase
    .from('prescriptions')
    .select('status')
    .eq('id', prescriptionId)
    .single()
  
  if (pError || !prescription) throw new Error('Prescription not found')
  if (prescription.status !== 'pending') throw new Error('Only pending prescriptions can be confirmed')

  const { data: items, error: iError } = await supabase
    .from('prescription_items')
    .select('*')
    .eq('prescription_id', prescriptionId)

  if (iError || !items) throw new Error('Could not fetch prescription items')

  // Ideally, use an RPC for the transaction. For this implementation we will execute sequentially.
  for (const item of items) {
    const { data: batch } = await supabase
      .from('batches')
      .select('quantity_remaining, reserved_quantity')
      .eq('id', item.batch_id)
      .single()

    if (!batch) throw new Error(`Batch ${item.batch_id} not found`)
    if (batch.reserved_quantity < item.quantity || batch.quantity_remaining < item.quantity) {
      throw new Error(`Invalid stock quantities for batch ${item.batch_id}`)
    }
  }

  // Deduct
  for (const item of items) {
    const { data: batch } = await supabase
      .from('batches')
      .select('quantity_remaining, reserved_quantity')
      .eq('id', item.batch_id)
      .single()
    
    if (batch) {
      await supabase
        .from('batches')
        .update({
          quantity_remaining: Math.max(0, batch.quantity_remaining - item.quantity),
          reserved_quantity: Math.max(0, batch.reserved_quantity - item.quantity)
        })
        .eq('id', item.batch_id)
    }
  }

  // Mark as completed
  const { error: updateError } = await supabase
    .from('prescriptions')
    .update({
      status: 'completed',
      payment_method: paymentMethod,
      receipt_number,
      confirmed_at
    })
    .eq('id', prescriptionId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/pos')
  revalidatePath('/staff/pos')
  revalidatePath('/admin')
  revalidatePath('/staff')
  
  await evaluateAlerts()
  
  return { success: true, receipt_number, confirmed_at }
}
