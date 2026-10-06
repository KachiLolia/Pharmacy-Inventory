import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMockUser } from '../mock-auth'

let mockWhatsappNumber = '+2348104731632' // default to the user's number for convenience
const mockWhatsappSessions: Record<string, any> = {}

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
      from: (table: string) => {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          gte: () => chain,
          lte: () => chain,
          insert: (payload: any) => {
            if (table === 'whatsapp_sessions') {
              mockWhatsappSessions[payload.user_id] = { ...payload, id: 'mock-session', updated_at: new Date().toISOString() }
            }
            return chain
          },
          update: (payload: any) => {
            if (table === 'app_users' && payload.whatsapp_number) {
              mockWhatsappNumber = payload.whatsapp_number
            }
            if (table === 'whatsapp_sessions') {
              // Just update the first session for mock
              const firstKey = Object.keys(mockWhatsappSessions)[0]
              if (firstKey) {
                mockWhatsappSessions[firstKey] = { ...mockWhatsappSessions[firstKey], ...payload, updated_at: new Date().toISOString() }
              }
            }
            return chain
          },
          delete: () => chain,
          single: async () => {
            if (table === 'app_users') {
              return { 
                data: { 
                  id: 'mock-admin-id', 
                  role: 'admin', 
                  is_active: true, 
                  whatsapp_number: mockWhatsappNumber 
                }, 
                error: null 
              }
            }
            if (table === 'whatsapp_sessions') {
              // We don't have the user_id in single() easily, so just return the first or default
              const firstSession = Object.values(mockWhatsappSessions)[0]
              return { data: firstSession || null, error: null }
            }
            return { data: null, error: null }
          },
          then: (resolve: any) => resolve({ data: [], error: null })
        }
        return chain
      },
      rpc: async (fnName: string, args: any) => {
        return { data: 'mock-id-1234', error: null }
      }
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

export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
    return await createClient() // fallback
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
