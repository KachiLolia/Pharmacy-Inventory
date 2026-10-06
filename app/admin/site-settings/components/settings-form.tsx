'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateStorefrontSettings, type StorefrontSettings } from '@/app/actions/site-settings'
import { Palette, FileText, Phone, Truck, ShieldCheck, Loader2 } from 'lucide-react'

export function SettingsForm({ settings }: { settings: StorefrontSettings }) {
  const [formData, setFormData] = useState<StorefrontSettings>(settings)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await updateStorefrontSettings({
        ...formData
      })
      alert("Your storefront configuration has been updated.")
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Failed to update settings.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Branding & Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Branding & Styling</CardTitle>
          <CardDescription>Configure the visual identity of your online store.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pharmacy_name">Store Name</Label>
              <Input id="pharmacy_name" name="pharmacy_name" value={formData.pharmacy_name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" name="logo_url" value={formData.logo_url || ''} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="color_primary">Primary Brand Color</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" id="color_primary" name="color_primary" value={formData.color_primary || '#0f172a'} onChange={handleChange} className="w-12 p-1 h-10" />
                <Input type="text" value={formData.color_primary || '#0f172a'} readOnly className="flex-1" />
              </div>
            </div>
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="color_secondary">Secondary Brand Color</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" id="color_secondary" name="color_secondary" value={formData.color_secondary || '#ffffff'} onChange={handleChange} className="w-12 p-1 h-10" />
                <Input type="text" value={formData.color_secondary || '#ffffff'} readOnly className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Content</CardTitle>
          <CardDescription>Main text blocks shown to visitors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="homepage_text">Welcome Text (Homepage)</Label>
            <Textarea id="homepage_text" name="homepage_text" value={formData.homepage_text || ''} onChange={handleChange} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about_us_text">About Us / Our Story</Label>
            <Textarea id="about_us_text" name="about_us_text" value={formData.about_us_text || ''} onChange={handleChange} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Delivery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> Contact & Delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Support Email</Label>
              <Input type="email" id="contact_email" name="contact_email" value={formData.contact_email || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Support Phone</Label>
              <Input type="tel" id="contact_phone" name="contact_phone" value={formData.contact_phone || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_address">Physical Address</Label>
            <Input id="contact_address" name="contact_address" value={formData.contact_address || ''} onChange={handleChange} />
          </div>
          <div className="pt-4 border-t">
            <h4 className="flex items-center gap-2 font-medium mb-4"><Truck className="w-4 h-4 text-muted-foreground" /> Delivery Settings</h4>
            <div className="space-y-2 max-w-[200px]">
              <Label htmlFor="delivery_fee">Flat Delivery Fee (₦)</Label>
              <Input type="number" id="delivery_fee" name="delivery_fee" value={formData.delivery_fee} onChange={handleNumberChange} min="0" step="100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800"><ShieldCheck className="w-5 h-5" /> PCN Electronic Pharmacy Licence</CardTitle>
          <CardDescription className="text-amber-700/80">Nigeria's Electronic Pharmacy Regulations 2026 requirement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border border-amber-200 bg-white p-4">
            <div className="space-y-0.5">
              <Label className="text-base text-amber-900">Display PCN Badge</Label>
              <p className="text-sm text-amber-700/80">
                Show your licence number and the official PCN logo in the site footer.
              </p>
            </div>
            <Switch
              checked={formData.display_pcn}
              onCheckedChange={handleSwitchChange('display_pcn')}
            />
          </div>
          
          {formData.display_pcn && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="pcn_licence_number" className="text-amber-900">Licence Number</Label>
              <Input 
                id="pcn_licence_number" 
                name="pcn_licence_number" 
                value={formData.pcn_licence_number || ''} 
                onChange={handleChange} 
                placeholder="e.g. PCN-EP-2026-..." 
                className="border-amber-200 focus-visible:ring-amber-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 pb-12">
        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Configuration"}
        </Button>
      </div>

    </form>
  )
}
