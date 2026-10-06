import { getStorefrontSettings } from '@/app/actions/site-settings'
import { Globe, Palette, FileText, Phone, Truck, ShieldCheck } from 'lucide-react'
import { SettingsForm } from './components/settings-form'

export const dynamic = 'force-dynamic'

export default async function SiteSettingsPage() {
  const settings = await getStorefrontSettings()
  
  // Fallback for when the database isn't fully migrated yet
  const defaultSettings = settings || {
    id: 1,
    pharmacy_name: 'Pharmly OTC',
    logo_url: '',
    homepage_text: 'Welcome to our online pharmacy.',
    about_us_text: 'We are dedicated to your health.',
    contact_email: 'hello@pharmacy.com',
    contact_phone: '+234 000 000 0000',
    contact_address: '123 Health Ave',
    color_primary: '#0f172a',
    color_secondary: '#ffffff',
    delivery_fee: 1500,
    pcn_licence_number: '',
    display_pcn: false
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Storefront Configuration
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Manage the content, branding, and policies of your public-facing OTC store.</p>
      </div>

      <SettingsForm settings={defaultSettings} />
    </div>
  )
}
