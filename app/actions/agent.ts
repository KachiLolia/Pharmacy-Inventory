'use server'

import { processAgentMessage } from '@/lib/ai/agent'
import { createClient } from '@/lib/supabase/server'
import { getMockUser } from '@/lib/mock-auth'

export async function sendMessageToAgent(message: string) {
  let userId = 'mock-admin-id'
  
  // Use actual user ID if available
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } else {
    const mockUser = await getMockUser()
    if (mockUser) userId = mockUser.id
  }

  try {
    const response = await processAgentMessage(userId, message)
    return response
  } catch (error: any) {
    console.error('Agent Action Error:', error)
    throw new Error(error.message || 'Unknown server error')
  }
}

export async function clearAgentHistory() {
  let userId = 'mock-admin-id'
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } else {
    const mockUser = await getMockUser()
    if (mockUser) userId = mockUser.id
  }

  const supabase = await createClient()
  await supabase.from('whatsapp_sessions').delete().eq('user_id', userId)
  return true
}
