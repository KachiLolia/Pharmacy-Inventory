import { cookies } from 'next/headers'

// This is a temporary mock auth implementation for testing UI and RBAC
// when Supabase credentials are not yet available.

export type MockRole = 'admin' | 'staff'

export async function setMockUser(role: MockRole) {
  const cookieStore = await cookies()
  cookieStore.set('mock_role', role, { path: '/' })
}

export async function clearMockUser() {
  const cookieStore = await cookies()
  cookieStore.delete('mock_role')
}

export async function getMockUser() {
  const cookieStore = await cookies()
  const role = cookieStore.get('mock_role')?.value as MockRole | undefined
  if (role) {
    return { id: 'mock-user-id', role, email: `${role}@example.com` }
  }
  return null
}
