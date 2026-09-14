'use server'

import { createClient } from '@/lib/supabase/server'
import { setMockUser, clearMockUser } from '@/lib/mock-auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Mock login for UI testing
    const role = email.includes('admin') ? 'admin' : 'staff'
    await setMockUser(role)
    redirect(`/${role}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: userData } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role === 'admin') {
      redirect('/admin')
    } else {
      redirect('/staff')
    }
  }
}
export async function logout() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await clearMockUser()
  } else {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/login')
}
