import { google } from '@ai-sdk/google'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

// Tools

const SYSTEM_PROMPT = `
You are Pharmly, an AI assistant for a pharmacy operations system. 
You are speaking directly to an Admin over a web chat copilot interface.

Your job is to answer business questions accurately using the provided tools.
- Keep your answers concise, formatted well for the web UI (using bolding where appropriate).
- If the user asks about stock levels, use the get_catalog tool and summarize.
- If the user asks about sales or metrics, use the get_metrics tool.
- If the user asks about pending orders, use the get_orders tool.

CRITICAL INSTRUCTION FOR ACTIONS (Adding/Restocking/Updating Prices/Archiving):
1. DO NOT call the execution tools (add_drug, restock_drug, update_price, archive_drug) immediately when a user asks to modify data.
2. FIRST, you MUST reply to the user stating EXACTLY what you are about to do (e.g. "You want to restock Paracetamol 500mg by 50 units at 500 NGN each. Reply YES to confirm.").
3. WAIT for the user to reply. 
4. ONLY call the execution tool if the user's VERY NEXT message is a clear confirmation (like "Yes", "Confirm", "Do it"). If they say no or change their mind, abort the action.

At the very end of EVERY natural language response you write, you MUST provide exactly 3 short, relevant follow-up questions the user might want to ask next. Format them exactly like this on separate lines:
SUGGESTIONS:
- Follow up question 1?
- Follow up question 2?
- Follow up question 3?

Current Date/Time: ${new Date().toLocaleString()}
`

export async function processAgentMessage(userId: string, incomingText: string): Promise<string> {
  const supabase = await createAdminClient()
  
  // 1. Fetch chat history
  let { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('user_id', userId)
    .single()

  let messages: any[] = []
  
  if (!session) {
    // Create new session if none exists
    const { data: newSession } = await supabase
      .from('whatsapp_sessions')
      .insert({ user_id: userId, chat_history: [] })
      .select()
      .single()
    session = newSession
  } else {
    messages = session.chat_history as any[] || []
  }

  // 2. Append the new message
  messages.push({ role: 'user', content: incomingText })

  let text = ''
  let currentMessages = [...messages]

  for (let step = 0; step < 5; step++) {
    // 3. Call Gemini via Vercel AI SDK
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPT,
      messages: currentMessages,
      tools: {
        get_metrics: tool({
          description: 'Get today\'s sales metrics and revenue.',
          parameters: z.object({}),
          // @ts-ignore
          execute: async () => {
            try {
              const today = format(new Date(), 'yyyy-MM-dd')
              const start = new Date(today)
              start.setHours(0, 0, 0, 0)
              const end = new Date(today)
              end.setHours(23, 59, 59, 999)
              
              const { data } = await supabase
                .from('prescriptions')
                .select('total_amount')
                .eq('status', 'completed')
                .gte('confirmed_at', start.toISOString())
                .lte('confirmed_at', end.toISOString())
              
              const total = (data || []).reduce((sum: number, p: any) => sum + p.total_amount, 0)
              return { today_revenue: total, transactions: (data || []).length }
            } catch (e: any) {
              return { error: 'Failed to fetch metrics: ' + e.message }
            }
          }
        }),
        get_catalog: tool({
          description: 'Get the full drug catalog to check stock levels, prices, and batches.',
          parameters: z.object({}),
          // @ts-ignore
          execute: async () => {
            try {
              const { data } = await supabase.from('drugs').select('*, batches(*)')
              return data
            } catch (e: any) {
              return { error: 'Failed to fetch catalog: ' + e.message }
            }
          }
        }),
        get_orders: tool({
          description: 'Get recent OTC online orders and their statuses.',
          parameters: z.object({}),
          // @ts-ignore
          execute: async () => {
            try {
              const { data } = await supabase.from('otc_orders').select('*').order('created_at', { ascending: false }).limit(10)
              return data
            } catch (e: any) {
              return { error: 'Failed to fetch orders: ' + e.message }
            }
          }
        }),
        
        // -- STAGE 16: ACTION TOOLS --
        
        add_drug: tool({
          description: 'Add a new drug to the catalog. ONLY call this AFTER the user has confirmed.',
          parameters: z.object({
            name: z.string(),
            dose: z.string(),
            form: z.string(),
            manufacturer: z.string().optional()
          }),
          // @ts-ignore
          execute: async (args: any) => {
            try {
              const { data, error } = await supabase.from('drugs').insert({
                name: args.name,
                dose: args.dose,
                form: args.form,
                manufacturer: args.manufacturer || null
              }).select().single()
              
              if (error) throw error

              await supabase.from('audit_logs').insert({
                action: 'drug_added',
                entity_type: 'drug',
                entity_id: data.id,
                user_id: userId,
                details: { ...args, channel: 'copilot' }
              })
              
              return { success: true, drug: data }
            } catch (e: any) {
              return { error: 'Failed to add drug: ' + e.message }
            }
          }
        }),

        restock_drug: tool({
          description: 'Add a new batch (restock) to an existing drug. ONLY call this AFTER the user has confirmed.',
          parameters: z.object({
            drug_id: z.string(),
            batch_number: z.string().optional(),
            quantity: z.number(),
            cost_price: z.number().optional(),
            selling_price: z.number(),
            expiry_date: z.string()
          }),
          // @ts-ignore
          execute: async (args: any) => {
            try {
              const { data, error } = await supabase.from('batches').insert({
                drug_id: args.drug_id,
                batch_number: args.batch_number || 'WA-' + Date.now(),
                quantity_received: args.quantity,
                quantity_remaining: args.quantity,
                cost_price_per_unit: args.cost_price || 0,
                selling_price_per_unit: args.selling_price,
                expiry_date: args.expiry_date,
                received_by: userId
              }).select().single()
              
              if (error) throw error

              await supabase.from('audit_logs').insert({
                action: 'batch_added',
                entity_type: 'batch',
                entity_id: data.id,
                user_id: userId,
                details: { ...args, channel: 'copilot' }
              })

              return { success: true, batch: data }
            } catch (e: any) {
              return { error: 'Failed to restock drug: ' + e.message }
            }
          }
        }),

        update_price: tool({
          description: 'Change the online price override for a drug on the OTC storefront. ONLY call this AFTER the user has confirmed.',
          parameters: z.object({
            drug_id: z.string(),
            new_price: z.number().nullable()
          }),
          // @ts-ignore
          execute: async (args: any) => {
            try {
              // Upsert the otc_listing
              const { error } = await supabase.from('otc_listings').upsert({
                drug_id: args.drug_id,
                price_override: args.new_price,
                is_listed: true
              })
              
              if (error) throw error

              await supabase.from('audit_logs').insert({
                action: 'price_changed',
                entity_type: 'otc_listing',
                entity_id: args.drug_id,
                user_id: userId,
                details: { new_price: args.new_price, channel: 'copilot' }
              })

              return { success: true }
            } catch (e: any) {
              return { error: 'Failed to update price: ' + e.message }
            }
          }
        }),

        archive_drug: tool({
          description: 'Archive a drug in the catalog so it is no longer active. ONLY call this AFTER the user has confirmed.',
          parameters: z.object({
            drug_id: z.string()
          }),
          // @ts-ignore
          execute: async (args: any) => {
            try {
              const { error } = await supabase.from('drugs').update({
                is_active: false
              }).eq('id', args.drug_id)
              
              if (error) throw error

              await supabase.from('audit_logs').insert({
                action: 'drug_archived',
                entity_type: 'drug',
                entity_id: args.drug_id,
                user_id: userId,
                details: { channel: 'copilot' }
              })

              return { success: true }
            } catch (e: any) {
              return { error: 'Failed to archive drug: ' + e.message }
            }
          }
        })
      }
    })

    if (result.toolResults && result.toolResults.length > 0) {
      if ((result as any).response && (result as any).response.messages) {
        currentMessages = currentMessages.concat((result as any).response.messages)
      } else {
        // Fallback for older Vercel AI SDKs without result.response.messages
        currentMessages.push({ role: 'assistant', content: result.text || '', toolCalls: result.toolCalls } as any)
        
        // Add each tool result as a tool message
        for (const tr of result.toolResults) {
          currentMessages.push({
            role: 'tool',
            content: [{
              type: 'tool-result',
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: (tr as any).result,
            }]
          } as any)
        }
      }
    } else {
      text = result.text
      break // Done!
    }
  }

  // 4. Save the new conversation state
  const updatedMessages = [...currentMessages]
  if (text) {
    updatedMessages.push({ role: 'assistant', content: text })
  }

  await supabase
    .from('whatsapp_sessions')
    .update({ chat_history: updatedMessages })
    .eq('user_id', userId)

  return text
}
