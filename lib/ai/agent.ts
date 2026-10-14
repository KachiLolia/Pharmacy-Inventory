import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export interface PendingAction {
  type: 'add_drug' | 'restock' | 'update_price' | 'archive_drug'
  data: Record<string, any>
  summary: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system_state'
  content?: string
  pending_action?: PendingAction | null
  timestamp?: string
}

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(amount)
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// In-memory fallback if session table cannot be accessed
const memorySessionStore: Record<string, { messages: ChatMessage[]; pending_action: PendingAction | null }> = {}

/**
 * Intelligent, fully autonomous local Copilot engine.
 * Runs 100% locally with zero external API dependencies (no Gemini, no Claude).
 * Answers live queries from Supabase and takes verified catalog actions.
 */
export async function processAgentMessage(rawUserId: string, incomingText: string): Promise<string> {
  const supabase = await createAdminClient()
  const trimmed = incomingText.trim()
  const lower = trimmed.toLowerCase()

  // 1. Resolve a valid user UUID for foreign key safety
  let userId = rawUserId
  if (!isUUID(userId)) {
    try {
      const { data: adminUser } = await supabase
        .from('app_users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()
      if (adminUser?.id) {
        userId = adminUser.id
      } else {
        const { data: anyUser } = await supabase.from('app_users').select('id').limit(1).single()
        if (anyUser?.id) userId = anyUser.id
      }
    } catch {
      // Keep rawUserId as fallback
    }
  }

  // 2. Fetch or initialize session context
  let pendingAction: PendingAction | null = null
  let chatHistory: ChatMessage[] = []

  try {
    if (isUUID(userId)) {
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (session) {
        chatHistory = (session.chat_history as any[]) || []
        // Find if there is an active pending action in state
        const stateMsg = chatHistory.slice().reverse().find(m => m.role === 'system_state')
        if (stateMsg?.pending_action) {
          pendingAction = stateMsg.pending_action
        }
      } else {
        await supabase
          .from('whatsapp_sessions')
          .insert({ user_id: userId, chat_history: [] })
      }
    }
  } catch (err) {
    console.warn('Database session fetch error, using memory fallback:', err)
  }

  // Check in-memory store if DB didn't yield pending action
  if (!pendingAction && memorySessionStore[userId]?.pending_action) {
    pendingAction = memorySessionStore[userId].pending_action
  }

  let responseText = ''
  let newPendingAction: PendingAction | null = pendingAction

  // ==========================================
  // 3. HANDLE CONFIRMATION OF PENDING ACTION
  // ==========================================
  const isConfirm = /^(yes|yep|yeah|confirm|proceed|do it|sure|ok|okay|go ahead|1|accept)$/i.test(lower)
  const isCancel = /^(no|nope|cancel|abort|stop|nevermind|never mind|dont|don't|nah)$/i.test(lower)

  if (pendingAction && isConfirm) {
    responseText = await executeConfirmedAction(supabase, userId, pendingAction)
    newPendingAction = null
  } else if (pendingAction && isCancel) {
    responseText = `❌ **Action Cancelled**\n\nThe pending action (**${pendingAction.summary}**) has been safely discarded. No changes were made to the catalog or inventory.\n\nSUGGESTIONS:\n- What's the revenue for today?\n- Which drugs are low on stock?\n- View drug catalog`
    newPendingAction = null
  } else {
    // ==========================================
    // 4. NATURAL LANGUAGE INTENT DISPATCHER
    // ==========================================

    // A. Revenue / Sales Metrics
    if (/revenue|sales|how much.*make|earnings|financial|metrics|income|total.*today/.test(lower)) {
      responseText = await handleRevenueQuery(supabase)
    }
    // B. Low Stock / Out of Stock Alerts
    else if (/low.*stock|running out|out of stock|reorder|shortage|critical stock|inventory alert/.test(lower)) {
      responseText = await handleLowStockQuery(supabase)
    }
    // C. OTC Online Orders
    else if (/order|otc.*order|pending.*order|storefront order|delivery|deliveries|pickups|pickup/.test(lower)) {
      responseText = await handleOrdersQuery(supabase)
    }
    // D. Action: Add New Drug
    else if (/add.*drug|new drug|create.*drug|insert.*drug/.test(lower)) {
      const result = await handleAddDrugIntent(supabase, trimmed)
      responseText = result.text
      if (result.pendingAction) newPendingAction = result.pendingAction
    }
    // E. Action: Restock / Add Batch
    else if (/restock|add.*batch|receive.*batch|stock.*up/.test(lower)) {
      const result = await handleRestockIntent(supabase, trimmed)
      responseText = result.text
      if (result.pendingAction) newPendingAction = result.pendingAction
    }
    // F. Action: Price Override / Update Price
    else if (/change.*price|update.*price|price.*override|set.*price|new price/.test(lower)) {
      const result = await handlePriceChangeIntent(supabase, trimmed)
      responseText = result.text
      if (result.pendingAction) newPendingAction = result.pendingAction
    }
    // G. Action: Archive / Deactivate Drug
    else if (/archive|deactivate|remove.*drug|delete.*drug/.test(lower)) {
      const result = await handleArchiveIntent(supabase, trimmed)
      responseText = result.text
      if (result.pendingAction) newPendingAction = result.pendingAction
    }
    // H. Drug Search / Lookup / Catalog
    else if (/catalog|inventory|search|find|stock of|do we have|info on|check.*stock|lookup/.test(lower)) {
      responseText = await handleDrugSearch(supabase, trimmed)
    }
    // I. Greetings / Capabilities / Help
    else if (/^(hi|hello|hey|help|who are you|what can you do|menu|commands)$/i.test(lower)) {
      responseText = handleHelpMenu()
    }
    // J. Fallback with smart assistance
    else {
      responseText = handleFallback(trimmed)
    }
  }

  // 5. Update session memory (DB + in-memory store)
  chatHistory.push({ role: 'user', content: trimmed, timestamp: new Date().toISOString() })
  chatHistory.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() })
  if (newPendingAction !== pendingAction) {
    chatHistory.push({ role: 'system_state', pending_action: newPendingAction, timestamp: new Date().toISOString() })
  }

  // Keep last 30 messages
  if (chatHistory.length > 30) chatHistory = chatHistory.slice(-30)

  memorySessionStore[userId] = {
    messages: chatHistory,
    pending_action: newPendingAction
  }

  try {
    if (isUUID(userId)) {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          user_id: userId,
          chat_history: chatHistory,
          updated_at: new Date().toISOString()
        })
    }
  } catch (err) {
    console.warn('Could not persist session to DB, retained in memory:', err)
  }

  return responseText
}

// ==========================================
// QUERY HANDLERS
// ==========================================

async function handleRevenueQuery(supabase: any): Promise<string> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    const startToday = `${today}T00:00:00.000Z`
    const endToday = `${today}T23:59:59.999Z`

    // Query today's prescriptions
    const { data: todayPrescriptions } = await supabase
      .from('prescriptions')
      .select('total_amount, status, payment_method, confirmed_at')
      .eq('status', 'completed')
      .gte('confirmed_at', startToday)
      .lte('confirmed_at', endToday)

    const todaySales = todayPrescriptions || []
    const todayTotal = todaySales.reduce((acc: number, p: any) => acc + Number(p.total_amount || 0), 0)
    const todayCount = todaySales.length
    const avgBasket = todayCount > 0 ? todayTotal / todayCount : 0

    // Also get all-time completed total for reference
    const { data: allPrescriptions } = await supabase
      .from('prescriptions')
      .select('total_amount')
      .eq('status', 'completed')

    const lifetimeTotal = (allPrescriptions || []).reduce((acc: number, p: any) => acc + Number(p.total_amount || 0), 0)
    const lifetimeCount = (allPrescriptions || []).length

    return `📊 **Today's Financial Summary (${format(new Date(), 'dd MMM yyyy')})**

• **Today's Revenue:** **${formatNGN(todayTotal)}**
• **Completed Sales:** **${todayCount} transaction${todayCount === 1 ? '' : 's'}**
• **Average Transaction Value:** **${formatNGN(avgBasket)}**
• **Lifetime Store Revenue:** **${formatNGN(lifetimeTotal)}** (${lifetimeCount} orders)

${todayCount === 0 ? 'ℹ️ *No in-store or online sales have been confirmed yet today.*' : '✅ *All revenue recorded from completed in-store POS and storefront orders.*'}

SUGGESTIONS:
- Which drugs are low on stock?
- Are there any pending OTC orders?
- Search the drug catalog`
  } catch (err: any) {
    return `⚠️ Could not calculate revenue metrics: ${err.message}\n\nSUGGESTIONS:\n- What's the revenue for today?\n- View drug catalog\n- Help`
  }
}

async function handleLowStockQuery(supabase: any): Promise<string> {
  try {
    const { data: drugs } = await supabase
      .from('drugs')
      .select('id, name, dose, form, low_stock_threshold, batches(quantity_remaining, reserved_quantity)')
      .eq('is_active', true)

    if (!drugs || drugs.length === 0) {
      return `📦 **Inventory Status**\n\nNo active drugs found in the catalog.\n\nSUGGESTIONS:\n- Add a new drug\n- What's the revenue for today?\n- Help`
    }

    const lowStockItems: { name: string; dose: string; available: number; threshold: number }[] = []

    for (const d of drugs) {
      const threshold = d.low_stock_threshold || 30
      const totalAvailable = (d.batches || []).reduce((sum: number, b: any) => {
        return sum + Math.max(0, (b.quantity_remaining || 0) - (b.reserved_quantity || 0))
      }, 0)

      if (totalAvailable <= threshold) {
        lowStockItems.push({
          name: d.name,
          dose: d.dose,
          available: totalAvailable,
          threshold
        })
      }
    }

    if (lowStockItems.length === 0) {
      return `✅ **Stock Alert: All Good!**\n\nAll **${drugs.length} active drugs** are currently stocked safely above their reorder thresholds.\n\nSUGGESTIONS:\n- What's the revenue for today?\n- View drug catalog\n- Are there any pending OTC orders?`
    }

    const itemsList = lowStockItems
      .slice(0, 8)
      .map(item => `• **${item.name} (${item.dose})**: **${item.available}** units remaining *(Threshold: ${item.threshold})*`)
      .join('\n')

    const firstDrug = lowStockItems[0]?.name || 'a drug'

    return `⚠️ **Low Stock Warning: ${lowStockItems.length} Item(s) Need Reorder**\n\n${itemsList}\n\n${lowStockItems.length > 8 ? `*...and ${lowStockItems.length - 8} more item(s)*\n\n` : ''}👉 *You can restock any item directly by saying "Restock ${firstDrug} by 100 units".*\n\nSUGGESTIONS:\n- Restock ${firstDrug} by 100 units\n- What's the revenue for today?\n- View drug catalog`
  } catch (err: any) {
    return `⚠️ Could not check stock levels: ${err.message}\n\nSUGGESTIONS:\n- Which drugs are low on stock?\n- View drug catalog\n- Help`
  }
}

async function handleOrdersQuery(supabase: any): Promise<string> {
  try {
    const { data: orders } = await supabase
      .from('otc_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!orders || orders.length === 0) {
      return `🛒 **OTC Online Orders**\n\nNo online orders have been placed on the storefront yet.\n\nSUGGESTIONS:\n- What's the revenue for today?\n- Which drugs are low on stock?\n- Search catalog`
    }

    const pending = orders.filter((o: any) => (o.order_status || o.status) === 'pending').length
    const ready = orders.filter((o: any) => (o.order_status || o.status) === 'ready_for_pickup').length
    const outForDelivery = orders.filter((o: any) => (o.order_status || o.status) === 'out_for_delivery').length
    const completed = orders.filter((o: any) => (o.order_status || o.status) === 'completed').length

    const recentList = orders.slice(0, 5).map((o: any) => {
      const itemsCount = Array.isArray(o.line_items) ? o.line_items.length : (Array.isArray(o.items) ? o.items.length : 1)
      const st = o.order_status || o.status || 'pending'
      return `• **Order #${o.id.slice(0, 6)}** (${o.customer_name || 'Customer'}): ${formatNGN(Number(o.total_amount || 0))} — Status: **${st}** (${itemsCount} item${itemsCount > 1 ? 's' : ''})`
    }).join('\n')

    return `📦 **Storefront OTC Orders Summary**\n\n• **Pending Review:** **${pending}**\n• **Ready for Pickup:** **${ready}**\n• **Out for Delivery:** **${outForDelivery}**\n• **Completed:** **${completed}**\n\n**Recent Orders:**\n${recentList}\n\nSUGGESTIONS:\n- What's the revenue for today?\n- Which drugs are low on stock?\n- View drug catalog`
  } catch (err: any) {
    return `⚠️ Could not fetch OTC orders: ${err.message}\n\nSUGGESTIONS:\n- What's the revenue for today?\n- View drug catalog\n- Help`
  }
}

async function handleDrugSearch(supabase: any, text: string): Promise<string> {
  try {
    // Extract query by removing trigger words
    const query = text
      .replace(/^(search|find|lookup|check stock of|stock of|do we have|info on|catalog|inventory)/i, '')
      .replace(/drug|tablet|capsule|please|for/gi, '')
      .trim()

    let drugQuery = supabase
      .from('drugs')
      .select('id, name, dose, form, category, pack_size, is_active, batches(id, quantity_remaining, reserved_quantity, selling_price_per_unit, expiry_date), otc_listings(is_listed, price_override)')
      .limit(10)

    if (query.length > 1) {
      drugQuery = drugQuery.ilike('name', `%${query}%`)
    }

    const { data: drugs } = await drugQuery

    if (!drugs || drugs.length === 0) {
      return `🔍 **Drug Search: "${query}"**\n\nNo matching drugs found in your catalog. Would you like to add it as a new drug?\n\nSUGGESTIONS:\n- Add a new drug\n- View full catalog\n- What's the revenue for today?`
    }

    if (drugs.length === 1) {
      const d = drugs[0]
      const totalStock = (d.batches || []).reduce((acc: number, b: any) => acc + Math.max(0, (b.quantity_remaining || 0) - (b.reserved_quantity || 0)), 0)
      const latestBatch = d.batches && d.batches[0]
      const price = latestBatch ? formatNGN(latestBatch.selling_price_per_unit) : 'N/A'
      const otc = d.otc_listings && d.otc_listings[0]
      const otcPrice = otc?.price_override ? formatNGN(otc.price_override) : price

      return `💊 **Drug Details: ${d.name} ${d.dose}**

• **Form:** ${d.form} | **Pack Size:** ${d.pack_size || 1}
• **Category:** ${d.category}
• **Status:** ${d.is_active ? '✅ Active' : '⏸️ Archived'}
• **Total Available Stock:** **${totalStock} units**
• **In-Store Selling Price:** **${price}**
• **Storefront Listed:** ${otc?.is_listed ? `✅ Listed (Online Price: **${otcPrice}**)` : '❌ Not Listed'}
• **Active Batches:** ${(d.batches || []).length} batch(es)

SUGGESTIONS:
- Restock ${d.name} by 100 units
- Change online price of ${d.name}
- What's the revenue for today?`
    }

    const list = drugs.map((d: any) => {
      const stock = (d.batches || []).reduce((acc: number, b: any) => acc + Math.max(0, (b.quantity_remaining || 0) - (b.reserved_quantity || 0)), 0)
      return `• **${d.name}** (${d.dose}, ${d.form}) — Stock: **${stock} units** | Category: *${d.category}*`
    }).join('\n')

    return `🔍 **Found ${drugs.length} Matching Drug(s):**\n\n${list}\n\n*Type the specific drug name for full batch and pricing details.*\n\nSUGGESTIONS:\n- Search ${drugs[0]?.name}\n- Add a new drug\n- What's the revenue for today?`
  } catch (err: any) {
    return `⚠️ Could not search catalog: ${err.message}\n\nSUGGESTIONS:\n- What's the revenue for today?\n- View drug catalog\n- Help`
  }
}

// ==========================================
// ACTION PARSERS (PROPOSE 2-STEP CONFIRMATION)
// ==========================================

async function handleAddDrugIntent(supabase: any, text: string): Promise<{ text: string; pendingAction?: PendingAction }> {
  // Try to parse parameters from user text
  // e.g. "Add a new drug Paracetamol 500mg Tablet pack size 10 category Analgesic"
  // or "Add drug: Amoxicillin, 250mg, Capsule, 20"
  const clean = text.replace(/^(add a new drug|add new drug|add drug|create drug|new drug)/i, '').trim()

  if (!clean || clean.length < 2) {
    return {
      text: `📋 **Add a New Drug to Catalog**

To add a drug, please reply with its details in this format:
\`Name: [Drug Name], Dose: [e.g. 500mg], Form: [Tablet/Capsule/Syrup], Pack Size: [e.g. 10], Category: [e.g. Analgesic]\`

Or simply say:
👉 *"Add Paracetamol 500mg Tablet"*

SUGGESTIONS:
- Add Paracetamol 500mg Tablet
- Add Amoxicillin 250mg Capsule
- Cancel`
    }
  }

  // Smart regex slot extraction
  let name = ''
  let dose = '500mg'
  let form = 'Tablet'
  let packSize = 10
  let category = 'General'

  // Match comma-separated or named parameters
  const nameMatch = clean.match(/name:\s*([^,]+)/i)
  const doseMatch = clean.match(/dose:\s*([^,]+)/i) || clean.match(/(\d+\s*(?:mg|g|ml|mcg|iu))/i)
  const formMatch = clean.match(/form:\s*([^,]+)/i) || clean.match(/\b(tablet|capsule|syrup|injection|suspension|cream|ointment|drops|inhaler)\b/i)
  const packMatch = clean.match(/pack(?:_size)?:\s*(\d+)/i) || clean.match(/pack size\s*(\d+)/i)
  const catMatch = clean.match(/category:\s*([^,]+)/i)

  if (doseMatch) dose = doseMatch[1].trim()
  if (formMatch) form = formMatch[1].trim()
  if (packMatch) packSize = parseInt(packMatch[1], 10)
  if (catMatch) category = catMatch[1].trim()

  if (nameMatch) {
    name = nameMatch[1].trim()
  } else {
    // Extract first 1-3 words before dose/form as name
    const tokens = clean
      .replace(new RegExp(dose, 'gi'), '')
      .replace(new RegExp(form, 'gi'), '')
      .replace(/pack size \d+/gi, '')
      .replace(/category \w+/gi, '')
      .replace(/[:,]/g, '')
      .trim()
      .split(/\s+/)
    name = tokens.slice(0, 3).join(' ').trim() || 'New Medication'
  }

  // Capitalize nicely
  name = name.charAt(0).toUpperCase() + name.slice(1)
  form = form.charAt(0).toUpperCase() + form.slice(1)

  const pendingAction: PendingAction = {
    type: 'add_drug',
    data: {
      name,
      dose,
      form,
      category,
      unit_type: 'countable',
      pack_size: packSize,
      is_active: true
    },
    summary: `Add ${name} ${dose} ${form} (Pack size: ${packSize}, Category: ${category})`
  }

  return {
    text: `⚠️ **Confirmation Required: Add New Drug**

I am ready to insert the following drug into the catalog:
• **Drug Name:** **${name}**
• **Dose:** **${dose}**
• **Form:** **${form}**
• **Pack Size:** **${packSize}**
• **Category:** **${category}**

👉 Reply **YES** or **CONFIRM** to save this drug to the database, or **CANCEL** to abort.

SUGGESTIONS:
- Yes, confirm
- Cancel`,
    pendingAction
  }
}

async function handleRestockIntent(supabase: any, text: string): Promise<{ text: string; pendingAction?: PendingAction }> {
  // e.g. "Restock Paracetamol by 100 units at 500" or "Add batch to Amoxicillin 50 units"
  const clean = text.replace(/^(restock|add batch to|add batch|receive batch)/i, '').trim()

  if (!clean || clean.length < 2) {
    return {
      text: `📦 **Restock Inventory (Add Batch)**

To restock a drug, please say:
👉 *"Restock [Drug Name] by [Quantity] units at [Selling Price]"*

Example:
*"Restock Paracetamol by 100 units at 1200"*

SUGGESTIONS:
- Restock Paracetamol by 100 units at 1200
- Which drugs are low on stock?
- Cancel`
    }
  }

  // Extract quantity
  const qtyMatch = clean.match(/by\s*(\d+)/i) || clean.match(/(\d+)\s*(?:units|packs|boxes|pcs)/i) || clean.match(/\b(\d+)\b/)
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 100

  // Extract price
  const priceMatch = clean.match(/at\s*(?:ngn|₦)?\s*(\d+(?:\.\d+)?)/i) || clean.match(/price\s*(?:of\s*)?(?:ngn|₦)?\s*(\d+(?:\.\d+)?)/i)
  const sellingPrice = priceMatch ? parseFloat(priceMatch[1]) : 1000
  const costPrice = Math.round(sellingPrice * 0.7) // estimated 30% margin default

  // Extract drug name candidate
  const drugCandidate = clean
    .replace(/by\s*\d+(\s*units)?/gi, '')
    .replace(/at\s*(?:ngn|₦)?\s*\d+(\.\d+)?/gi, '')
    .replace(/units|packs|boxes/gi, '')
    .replace(/[:,]/g, '')
    .trim()

  // Find drug in DB
  const { data: matchedDrugs } = await supabase
    .from('drugs')
    .select('id, name, dose, form')
    .ilike('name', `%${drugCandidate}%`)
    .limit(3)

  if (!matchedDrugs || matchedDrugs.length === 0) {
    return {
      text: `🔍 Could not find a drug matching "**${drugCandidate}**" to restock.\n\nWould you like to search the catalog or add it as a new drug first?\n\nSUGGESTIONS:\n- View drug catalog\n- Add a new drug\n- Cancel`
    }
  }

  const targetDrug = matchedDrugs[0]
  const expiryDate = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const batchNumber = `BN-${format(new Date(), 'yyyyMMdd')}-${Math.floor(100 + Math.random() * 900)}`

  const pendingAction: PendingAction = {
    type: 'restock',
    data: {
      drug_id: targetDrug.id,
      drug_name: targetDrug.name,
      dose: targetDrug.dose,
      quantity_received: quantity,
      quantity_remaining: quantity,
      reserved_quantity: 0,
      cost_price_per_unit: costPrice,
      selling_price_per_unit: sellingPrice,
      batch_number: batchNumber,
      expiry_date: expiryDate
    },
    summary: `Restock ${targetDrug.name} (${targetDrug.dose}) with ${quantity} units at ${formatNGN(sellingPrice)}/unit`
  }

  return {
    text: `⚠️ **Confirmation Required: Restock Inventory**

I am ready to add this new inventory batch:
• **Drug:** **${targetDrug.name} ${targetDrug.dose}**
• **Quantity:** **${quantity} units**
• **Selling Price:** **${formatNGN(sellingPrice)} / unit**
• **Cost Price:** **${formatNGN(costPrice)} / unit**
• **Batch Number:** \`${batchNumber}\`
• **Expiry Date:** **${expiryDate}** (1 year)

👉 Reply **YES** or **CONFIRM** to record this batch in inventory, or **CANCEL** to abort.

SUGGESTIONS:
- Yes, confirm
- Cancel`,
    pendingAction
  }
}

async function handlePriceChangeIntent(supabase: any, text: string): Promise<{ text: string; pendingAction?: PendingAction }> {
  // e.g. "Change price of Paracetamol to 1500"
  const clean = text.replace(/^(change price of|update price of|change price|set price of|price override)/i, '').trim()

  const priceMatch = clean.match(/to\s*(?:ngn|₦)?\s*(\d+(?:\.\d+)?)/i) || clean.match(/(\d+(?:\.\d+)?)/)
  if (!priceMatch) {
    return {
      text: `🏷️ **Update Online Price Override**

Please specify the drug and new price, for example:
👉 *"Change price of Paracetamol to 1500"*

SUGGESTIONS:
- Change price of Paracetamol to 1500
- View drug catalog
- Cancel`
    }
  }

  const newPrice = parseFloat(priceMatch[1])
  const drugName = clean.replace(/to\s*(?:ngn|₦)?\s*\d+(\.\d+)?/gi, '').trim()

  const { data: matchedDrugs } = await supabase
    .from('drugs')
    .select('id, name, dose')
    .ilike('name', `%${drugName}%`)
    .limit(1)

  if (!matchedDrugs || matchedDrugs.length === 0) {
    return {
      text: `🔍 Could not find drug "**${drugName}**" to update price.\n\nSUGGESTIONS:\n- View drug catalog\n- Cancel`
    }
  }

  const drug = matchedDrugs[0]

  const pendingAction: PendingAction = {
    type: 'update_price',
    data: {
      drug_id: drug.id,
      drug_name: drug.name,
      dose: drug.dose,
      price_override: newPrice
    },
    summary: `Update storefront price for ${drug.name} to ${formatNGN(newPrice)}`
  }

  return {
    text: `⚠️ **Confirmation Required: Storefront Price Override**

I am ready to update the public OTC online price:
• **Drug:** **${drug.name} ${drug.dose}**
• **New Online Price:** **${formatNGN(newPrice)}**
• **Storefront Status:** Will be listed publicly

👉 Reply **YES** or **CONFIRM** to apply this price override, or **CANCEL** to abort.

SUGGESTIONS:
- Yes, confirm
- Cancel`,
    pendingAction
  }
}

async function handleArchiveIntent(supabase: any, text: string): Promise<{ text: string; pendingAction?: PendingAction }> {
  const drugName = text.replace(/^(archive|deactivate|remove drug)/i, '').trim()

  if (!drugName) {
    return {
      text: `🗑️ **Archive Drug**\n\nPlease state the name of the drug you want to archive (e.g. *"Archive Paracetamol"*).\n\nSUGGESTIONS:\n- View drug catalog\n- Cancel`
    }
  }

  const { data: matchedDrugs } = await supabase
    .from('drugs')
    .select('id, name, dose')
    .ilike('name', `%${drugName}%`)
    .limit(1)

  if (!matchedDrugs || matchedDrugs.length === 0) {
    return {
      text: `🔍 Could not find drug "**${drugName}**" to archive.\n\nSUGGESTIONS:\n- View drug catalog\n- Cancel`
    }
  }

  const drug = matchedDrugs[0]

  const pendingAction: PendingAction = {
    type: 'archive_drug',
    data: {
      drug_id: drug.id,
      drug_name: drug.name,
      dose: drug.dose
    },
    summary: `Archive drug ${drug.name} (${drug.dose})`
  }

  return {
    text: `⚠️ **Confirmation Required: Archive Drug**

Are you sure you want to archive this drug?
• **Drug:** **${drug.name} ${drug.dose}**
• **Effect:** Drug will become inactive and will no longer appear in POS search or online.

👉 Reply **YES** or **CONFIRM** to deactivate this drug, or **CANCEL** to abort.

SUGGESTIONS:
- Yes, confirm
- Cancel`,
    pendingAction
  }
}

// ==========================================
// EXECUTE CONFIRMED ACTIONS
// ==========================================

async function executeConfirmedAction(supabase: any, userId: string, action: PendingAction): Promise<string> {
  try {
    switch (action.type) {
      case 'add_drug': {
        const { data: newDrug, error } = await supabase
          .from('drugs')
          .insert(action.data)
          .select()
          .single()

        if (error) throw error

        // Write audit log
        try {
          await supabase.from('audit_logs').insert({
            action: 'drug_added',
            entity_type: 'drug',
            entity_id: newDrug.id,
            user_id: userId,
            details: { ...action.data, channel: 'copilot' }
          })
        } catch {
          // Non-critical if audit table RLS denies
        }

        return `🎉 **Success! Drug Added to Catalog**

• **Name:** **${newDrug.name} ${newDrug.dose}**
• **Form:** **${newDrug.form}** (Pack Size: ${newDrug.pack_size})
• **Category:** **${newDrug.category}**
• **ID:** \`${newDrug.id}\`

The medication is now live in your catalog. You can now restock inventory batches for it.

SUGGESTIONS:
- Restock ${newDrug.name} by 100 units
- What's the revenue for today?
- View drug catalog`
      }

      case 'restock': {
        const { drug_name, dose, ...batchPayload } = action.data
        const { data: newBatch, error } = await supabase
          .from('batches')
          .insert({
            ...batchPayload,
            received_by: userId
          })
          .select()
          .single()

        if (error) throw error

        try {
          await supabase.from('audit_logs').insert({
            action: 'batch_added',
            entity_type: 'batch',
            entity_id: newBatch.id,
            user_id: userId,
            details: { ...action.data, channel: 'copilot' }
          })
        } catch {}

        return `🎉 **Success! Batch Received & Stocked**

• **Drug:** **${drug_name} ${dose}**
• **Quantity Added:** **${newBatch.quantity_received} units**
• **Batch Number:** \`${newBatch.batch_number}\`
• **Selling Price:** **${formatNGN(newBatch.selling_price_per_unit)}**
• **Expiry Date:** **${newBatch.expiry_date}**

Your inventory has been updated immediately across POS and Storefront.

SUGGESTIONS:
- Search ${drug_name}
- Which drugs are low on stock?
- What's the revenue for today?`
      }

      case 'update_price': {
        const { drug_id, drug_name, dose, price_override } = action.data
        const { error } = await supabase
          .from('otc_listings')
          .upsert({
            drug_id,
            price_override,
            is_listed: true
          })

        if (error) throw error

        try {
          await supabase.from('audit_logs').insert({
            action: 'price_changed',
            entity_type: 'otc_listing',
            entity_id: drug_id,
            user_id: userId,
            details: { price_override, channel: 'copilot' }
          })
        } catch {}

        return `🎉 **Success! Storefront Price Updated**

• **Drug:** **${drug_name} ${dose}**
• **New Online Price:** **${formatNGN(price_override)}**
• **Storefront Visibility:** Active

Customers on the public storefront will now see and be charged this updated price.

SUGGESTIONS:
- What's the revenue for today?
- Are there any pending OTC orders?
- View drug catalog`
      }

      case 'archive_drug': {
        const { drug_id, drug_name, dose } = action.data
        const { error } = await supabase
          .from('drugs')
          .update({ is_active: false })
          .eq('id', drug_id)

        if (error) throw error

        try {
          await supabase.from('audit_logs').insert({
            action: 'drug_archived',
            entity_type: 'drug',
            entity_id: drug_id,
            user_id: userId,
            details: { channel: 'copilot' }
          })
        } catch {}

        return `✅ **Drug Archived Successfully**

**${drug_name} ${dose}** has been marked as inactive. It will no longer appear in in-store POS searches or online.

SUGGESTIONS:
- View drug catalog
- Which drugs are low on stock?
- What's the revenue for today?`
      }

      default:
        return `⚠️ Unknown action type.`
    }
  } catch (err: any) {
    return `❌ **Execution Error:** ${err.message}\n\nPlease verify your parameters and try again.\n\nSUGGESTIONS:\n- What's the revenue for today?\n- View drug catalog\n- Help`
  }
}

// ==========================================
// HELP & GREETINGS
// ==========================================

function handleHelpMenu(): string {
  return `👋 **Hello! I'm Pharmly, your Autonomous Pharmacy Assistant.**

I query live store data and take real inventory actions directly without external API delays:

📊 **Live Reporting:**
• *"What's the revenue for today?"*
• *"Which drugs are low on stock?"*
• *"Show pending OTC orders"*

🔍 **Catalog & Search:**
• *"Search Paracetamol"*
• *"Check stock of Amoxicillin"*
• *"View catalog"*

⚡ **Catalog & Inventory Actions (with safe confirmation):**
• *"Add a new drug Paracetamol 500mg Tablet"*
• *"Restock Paracetamol by 100 units at 1200"*
• *"Change price of Paracetamol to 1500"*
• *"Archive Paracetamol"*

How can I help you right now?

SUGGESTIONS:
- What's the revenue for today?
- Which drugs are low on stock?
- Add a new drug`
}

function handleFallback(text: string): string {
  return `🤖 I heard: "*${text}*"

I can look up live inventory, sales, or execute catalog actions for you! Here are some common things you can ask:

• **Financials:** *"What's the revenue for today?"*
• **Inventory:** *"Which drugs are low on stock?"*
• **Orders:** *"Show recent OTC orders"*
• **Actions:** *"Add a new drug"* or *"Restock a medication"*

SUGGESTIONS:
- What's the revenue for today?
- Which drugs are low on stock?
- Add a new drug`
}
