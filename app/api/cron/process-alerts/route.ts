import { NextResponse } from 'next/server'
import { evaluateAlerts } from '@/app/actions/alerts'
import { getMockAlerts, updateMockAlert } from '@/lib/mock-data/alerts'
import { getMockDrugs } from '@/lib/mock-data/drugs'
import { getMockBatches } from '@/lib/mock-data/batches'

// This endpoint is designed to be hit by a scheduled Vercel Cron job
export async function GET(request: Request) {
  try {
    // 1. Evaluate latest inventory state
    await evaluateAlerts()

    // 2. Find alerts that haven't been notified yet
    const alerts = getMockAlerts()
    const drugs = getMockDrugs()
    const batches = getMockBatches()
    
    const unnotifiedAlerts = alerts.filter(a => 
      a.status === 'active' && (!a.notified_via_email || !a.notified_via_sms)
    )

    if (unnotifiedAlerts.length === 0) {
      return NextResponse.json({ message: 'No new alerts to notify' })
    }

    const emailLines: string[] = []
    const smsLines: string[] = []

    // 3. Aggregate payload
    for (const alert of unnotifiedAlerts) {
      const drug = drugs.find(d => d.id === alert.drug_id)
      if (!drug) continue

      if (alert.type === 'low_stock') {
        const drugBatches = batches.filter(b => b.drug_id === drug.id && new Date(b.expiry_date) > new Date())
        const totalAvailable = drugBatches.reduce((sum, b) => sum + Math.max(0, b.quantity_remaining - (b.reserved_quantity || 0)), 0)
        
        emailLines.push(`- LOW STOCK: ${drug.name} ${drug.dose} (${totalAvailable} units remaining)`)
        smsLines.push(`Low Stock: ${drug.name} (${totalAvailable} left)`)
      } else if (alert.type === 'expiry' && alert.batch_id) {
        const batch = batches.find(b => b.id === alert.batch_id)
        if (!batch) continue
        
        const timeDiff = new Date(batch.expiry_date).getTime() - new Date().getTime()
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24))
        
        emailLines.push(`- EXPIRING SOON: ${drug.name} ${drug.dose} [Batch ${batch.batch_number || 'N/A'}] in ${days} days.`)
        smsLines.push(`Expiry: ${drug.name} Batch ${batch.batch_number || 'N/A'} in ${days} days`)
      }

      // Mark as notified in memory
      updateMockAlert(alert.id, {
        notified_via_email: true,
        notified_via_sms: true
      })
    }

    // 4. Mock Delivery (Brevo & Termii)
    const mockEmailPayload = {
      to: 'admin@pharmacy.com',
      subject: 'Pharmacy Inventory Alerts',
      body: `The following inventory alerts require your attention:\n\n${emailLines.join('\n')}\n\nPlease log in to the dashboard to take action.`
    }

    const mockSmsPayload = {
      to: '+2348000000000',
      message: `Pharmacy Alerts: ${smsLines.join(', ')}`
    }

    console.log('\n=======================================')
    console.log('📬 [MOCK EMAIL SENT VIA BREVO]')
    console.log(mockEmailPayload)
    console.log('\n📱 [MOCK SMS SENT VIA TERMII]')
    console.log(mockSmsPayload)
    console.log('=======================================\n')

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed and delivered ${unnotifiedAlerts.length} new notifications.` 
    })
  } catch (error: any) {
    console.error('Error processing alerts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
