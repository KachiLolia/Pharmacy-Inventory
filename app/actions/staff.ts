'use server'

import { requireAuth, createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdminClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Server configuration error: Admin client not available')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createStaffAccount(formData: FormData) {
  await requireAuth(['admin'])
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    return { success: true }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) throw new Error('Email and password required')

  const adminClient = getAdminClient()

  // The 03_auth_trigger.sql will automatically insert into app_users with role='staff'
  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  await requireAuth(['admin'])

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    return { success: true }
  }
  
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('app_users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function getStaffList() {
  await requireAuth(['admin'])
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    return [
      { id: 'mock-1', email: 'john.doe@pharmacy.com', is_active: true, role: 'staff' },
      { id: 'mock-2', email: 'jane.smith@pharmacy.com', is_active: false, role: 'staff' }
    ]
  }

  const adminClient = getAdminClient()
  
  const { data: { users }, error } = await adminClient.auth.admin.listUsers()
  if (error) throw new Error(error.message)

  const { data: appUsers, error: auError } = await adminClient.from('app_users').select('*')
  if (auError) throw new Error(auError.message)

  const staff = users
    .map(u => {
      const appUser = appUsers.find(a => a.id === u.id)
      return {
        id: u.id,
        email: u.email,
        is_active: appUser?.is_active ?? true,
        role: appUser?.role ?? 'staff'
      }
    })
    .filter(u => u.role === 'staff')

  return staff
}
