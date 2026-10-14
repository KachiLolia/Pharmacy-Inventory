'use server'

import { processAgentMessage } from '@/lib/ai/agent'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMockUser } from '@/lib/mock-auth'

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function sendMessageToAgent(message: string): Promise<string> {
  let userId = 'mock-admin-id'
  
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } else {
      const mockUser = await getMockUser()
      if (mockUser) userId = mockUser.id
    }

    const response = await processAgentMessage(userId, message)
    return response || '🤖 I have processed your request.'
  } catch (error: any) {
    console.error('Agent Action Error:', error)
    return `⚠️ Error: ${error.message || 'Unable to process request right now. Please try again.'}\n\nSUGGESTIONS:\n- What's the revenue for today?\n- Which drugs are low on stock?\n- Help`
  }
}

export async function clearAgentHistory(): Promise<boolean> {
  try {
    let userId = 'mock-admin-id'
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } else {
      const mockUser = await getMockUser()
      if (mockUser) userId = mockUser.id
    }

    if (isUUID(userId)) {
      const adminClient = await createAdminClient()
      await adminClient.from('whatsapp_sessions').delete().eq('user_id', userId)
    }
    return true
  } catch (error) {
    console.warn('Error clearing agent history:', error)
    return true
  }
}
