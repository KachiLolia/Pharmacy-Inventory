import { NextResponse } from 'next/server'
import { evaluateAlerts } from '@/app/actions/alerts'
import { createClient } from '@/lib/supabase/server'

// This endpoint is designed to be hit by a scheduled Vercel Cron job
export async function GET(request: Request) {
  try {
    // 1. Evaluate latest inventory state
    await evaluateAlerts()
    
    const supabase = await createClient()

    // 2. Find alerts that haven't been notified yet
    const { data: unnotifiedAlerts, error: alertsError } = await supabase
      .from('alert_logs')
      .select('*, drugs(name, dose), batches(batch_number, expiry_date, quantity_remaining, reserved_quantity)')
      .eq('status', 'active')
      .or('notified_via_email.eq.false,notified_via_sms.eq.false')

    if (alertsError) throw new Error(alertsError.message)

    if (!unnotifiedAlerts || unnotifiedAlerts.length === 0) {
      return NextResponse.json({ message: 'No new alerts to notify' })
    }

    const emailLines: string[] = []
    const smsLines: string[] = []

    // 3. Aggregate payload
    for (const alert of unnotifiedAlerts) {
      const drugName = alert.drugs ? `${alert.drugs.name} ${alert.drugs.dose}` : 'Unknown Drug'

      if (alert.type === 'low_stock') {
        // We'd ideally sum all batches, but for simplicity in the alert log, we just state low stock
        emailLines.push(`- LOW STOCK: ${drugName}`)
        smsLines.push(`Low Stock: ${drugName}`)
      } else if (alert.type === 'expiry' && alert.batch_id && alert.batches) {
        const timeDiff = new Date(alert.batches.expiry_date).getTime() - new Date().getTime()
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24))
        
        emailLines.push(`- EXPIRING SOON: ${drugName} [Batch ${alert.batches.batch_number || 'N/A'}] in ${days} days.`)
        smsLines.push(`Expiry: ${drugName} Batch ${alert.batches.batch_number || 'N/A'} in ${days} days`)
      }

      // Mark as notified
      await supabase
        .from('alert_logs')
        .update({
          notified_via_email: true,
          notified_via_sms: true
        })
        .eq('id', alert.id)
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
