import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMockUser } from '../mock-auth'

export async function createClient() {
  const cookieStore = await cookies()

  // Return a mock client if no env vars exist
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      auth: {
        getUser: async () => {
          const user = await getMockUser()
          return { data: { user }, error: null }
        },
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => {
              const user = await getMockUser()
              if (table === 'app_users' && user) {
                return { data: { role: user.role, is_active: true }, error: null }
              }
              return { data: null, error: null }
            }
          })
        })
      })
    } as unknown as ReturnType<typeof createServerClient>
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function requireAuth(allowedRoles?: ('admin' | 'staff')[]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    const mockUser = await getMockUser()
    if (!mockUser) throw new Error('Unauthorized')
    if (allowedRoles && !allowedRoles.includes(mockUser.role)) throw new Error('Forbidden')
    return { user: { id: mockUser.id, email: mockUser.email }, role: mockUser.role }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) throw new Error('User profile not found')
  if (allowedRoles && !allowedRoles.includes(userData.role)) throw new Error('Forbidden: Insufficient role')

  return { user, role: userData.role }
}
