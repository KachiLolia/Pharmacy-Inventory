'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { SystemSettings } from '@/lib/mock-data/settings'
import { Settings as SettingsIcon, User, Store, Package, CreditCard, RotateCcw, Bell } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [settings, setSettings] = useState<SystemSettings | null>(null)
  
  // To simulate password changing without persisting
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings()
        setSettings(data)
      } catch (err) {
        setMessage({ text: 'Failed to load settings', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleSave = async () => {
    if (!settings) return
    
    if (password && password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' })
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      await updateSettings(settings)
      setMessage({ text: 'Settings saved successfully.', type: 'success' })
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>

  return (
    <div className="space-y-6 max-w-6xl pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            System Settings
          </h2>
          <p className="text-muted-foreground mt-1">Manage your pharmacy preferences and configurations.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto shadow-sm">
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-6 md:gap-8" orientation="vertical">
        {/* Sidebar TabsList */}
        <div className="w-full md:w-64 shrink-0">
          <TabsList className="flex flex-row md:flex-col w-full h-auto bg-transparent p-0 gap-2 flex-wrap md:flex-nowrap justify-start">
            <TabsTrigger value="profile" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <User className="w-4 h-4" /> <span className="hidden sm:inline">My Profile</span><span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <Store className="w-4 h-4" /> <span className="hidden sm:inline">Pharmacy Info</span><span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <Package className="w-4 h-4" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="pos" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <CreditCard className="w-4 h-4" /> <span className="hidden sm:inline">POS & Sales</span><span className="sm:hidden">POS</span>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <RotateCcw className="w-4 h-4" /> Refunds
            </TabsTrigger>
            <TabsTrigger value="notifications" className="justify-start gap-2 px-4 py-3 border bg-card rounded-xl shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 md:flex-none">
              <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Notifications</span><span className="sm:hidden">Alerts</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* 1. My Profile */}
          <TabsContent value="profile" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Update your personal admin account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_name">Admin Name</Label>
                    <Input id="admin_name" value={settings.admin_name} onChange={e => handleChange('admin_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">Email Address</Label>
                    <Input id="admin_email" type="email" value={settings.admin_email} onChange={e => handleChange('admin_email', e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="admin_phone">Phone Number</Label>
                    <Input id="admin_phone" type="tel" value={settings.admin_phone} onChange={e => handleChange('admin_phone', e.target.value)} />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-4 text-foreground/80">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep unchanged" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <Input id="confirm_password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Pharmacy Info */}
          <TabsContent value="pharmacy" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>Pharmacy Information</CardTitle>
                <CardDescription>Update the business details that appear on receipts and communications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy_name">Pharmacy Name</Label>
                    <Input id="pharmacy_name" value={settings.pharmacy_name} onChange={e => handleChange('pharmacy_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy_phone">Business Phone</Label>
                    <Input id="pharmacy_phone" type="tel" value={settings.pharmacy_phone} onChange={e => handleChange('pharmacy_phone', e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pharmacy_email">Business Email</Label>
                    <Input id="pharmacy_email" type="email" value={settings.pharmacy_email} onChange={e => handleChange('pharmacy_email', e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pharmacy_address">Physical Address</Label>
                    <Textarea id="pharmacy_address" value={settings.pharmacy_address} onChange={e => handleChange('pharmacy_address', e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pharmacy_logo_url">Logo URL (Optional)</Label>
                    <Input id="pharmacy_logo_url" placeholder="https://example.com/logo.png" value={settings.pharmacy_logo_url} onChange={e => handleChange('pharmacy_logo_url', e.target.value)} />
                  </div>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-sm font-semibold text-foreground/80">Receipt Customization</h3>
                  <div className="space-y-2">
                    <Label htmlFor="receipt_message">Receipt Footer Message</Label>
                    <Textarea id="receipt_message" value={settings.receipt_message} onChange={e => handleChange('receipt_message', e.target.value)} rows={3} />
                    <p className="text-xs text-muted-foreground">This message appears at the bottom of printed receipts.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Inventory */}
          <TabsContent value="inventory" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>Inventory Settings</CardTitle>
                <CardDescription>Configure global thresholds for low stock and expiry alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="low_stock">Global Low Stock Threshold</Label>
                    <Input 
                      id="low_stock" 
                      type="number" 
                      min={1} 
                      value={settings.global_low_stock_threshold} 
                      onChange={e => handleChange('global_low_stock_threshold', parseInt(e.target.value) || 0)} 
                    />
                    <p className="text-xs text-muted-foreground">Alert when any drug's available stock drops below this number.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_days">Global Expiry Warning (Days)</Label>
                    <Input 
                      id="expiry_days" 
                      type="number" 
                      min={1} 
                      value={settings.global_expiry_warning_days} 
                      onChange={e => handleChange('global_expiry_warning_days', parseInt(e.target.value) || 0)} 
                    />
                    <p className="text-xs text-muted-foreground">Alert when a batch will expire in less than this many days.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. POS & Sales */}
          <TabsContent value="pos" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>POS & Sales Settings</CardTitle>
                <CardDescription>Configure defaults for the point of sale system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Default Payment Method</Label>
                    <Select value={settings.default_payment_method} onValueChange={v => handleChange('default_payment_method', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="pos">POS / Card</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Pending Transaction Timeout (Mins)</Label>
                    <Input 
                      id="timeout" 
                      type="number" 
                      min={5} 
                      value={settings.pending_prescription_timeout_mins} 
                      onChange={e => handleChange('pending_prescription_timeout_mins', parseInt(e.target.value) || 30)} 
                    />
                    <p className="text-xs text-muted-foreground">Automatically cancel pending sales after this time.</p>
                  </div>
                </div>

                <div className="pt-6 border-t flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Receipt Printing</Label>
                    <p className="text-xs text-muted-foreground">Show print options after a successful sale.</p>
                  </div>
                  <Switch 
                    checked={settings.enable_receipt_printing}
                    onCheckedChange={v => handleChange('enable_receipt_printing', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Refunds */}
          <TabsContent value="refunds" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>Refund Settings</CardTitle>
                <CardDescription>Configure how returned stock is handled.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Return to Stock</Label>
                    <p className="text-xs text-muted-foreground text-balance max-w-sm">
                      When processing a refund, allow the cashier to return the items to sellable inventory. If disabled, refunded stock is treated as damaged/lost.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.allow_return_to_stock}
                    onCheckedChange={v => handleChange('allow_return_to_stock', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. Notifications */}
          <TabsContent value="notifications" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-primary/5">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure who receives system alerts and how.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notif_email">Notification Email</Label>
                    <Input id="notif_email" type="email" value={settings.notification_email} onChange={e => handleChange('notification_email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notif_phone">Notification Phone (SMS)</Label>
                    <Input id="notif_phone" type="tel" value={settings.notification_phone} onChange={e => handleChange('notification_phone', e.target.value)} />
                  </div>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-sm font-semibold text-foreground/80">Notification Channels</h3>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal cursor-pointer">Email Notifications</Label>
                    <Switch checked={settings.email_notifications} onCheckedChange={v => handleChange('email_notifications', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal cursor-pointer">SMS Notifications</Label>
                    <Switch checked={settings.sms_notifications} onCheckedChange={v => handleChange('sms_notifications', v)} />
                  </div>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-sm font-semibold text-foreground/80">Alert Types</h3>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal cursor-pointer">Low Stock Alerts</Label>
                    <Switch checked={settings.notify_low_stock} onCheckedChange={v => handleChange('notify_low_stock', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal cursor-pointer">Expiry Warning Alerts</Label>
                    <Switch checked={settings.notify_expiry} onCheckedChange={v => handleChange('notify_expiry', v)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}
