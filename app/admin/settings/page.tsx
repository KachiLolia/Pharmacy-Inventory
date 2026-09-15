'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { Settings as SettingsIcon } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lowStock, setLowStock] = useState(50)
  const [expiryDays, setExpiryDays] = useState(90)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings()
        setLowStock(data.global_low_stock_threshold)
        setExpiryDays(data.global_expiry_warning_days)
      } catch (err) {
        setMessage({ text: 'Failed to load settings', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      await updateSettings({
        global_low_stock_threshold: lowStock,
        global_expiry_warning_days: expiryDays
      })
      setMessage({ text: 'Settings saved successfully. Alerts re-evaluated.', type: 'success' })
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          System Settings
        </h2>
        <p className="text-muted-foreground mt-1">Configure global inventory and alert thresholds.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Alert Thresholds</CardTitle>
          <CardDescription>
            These values apply to all drugs unless overridden on a specific drug's catalog entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="low-stock">Global Low Stock Threshold</Label>
            <Input 
              id="low-stock" 
              type="number" 
              min={1} 
              value={lowStock} 
              onChange={e => setLowStock(parseInt(e.target.value) || 0)} 
            />
            <p className="text-xs text-muted-foreground">Alert when available stock drops below this number.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry-days">Global Expiry Warning (Days)</Label>
            <Input 
              id="expiry-days" 
              type="number" 
              min={1} 
              value={expiryDays} 
              onChange={e => setExpiryDays(parseInt(e.target.value) || 0)} 
            />
            <p className="text-xs text-muted-foreground">Alert when a batch will expire in less than this many days.</p>
          </div>

          {message.text && (
            <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
