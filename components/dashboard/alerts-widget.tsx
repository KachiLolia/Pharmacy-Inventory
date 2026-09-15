import { AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export type AlertViewData = {
  id: string
  type: 'low_stock' | 'expiry'
  drug_id?: string
  drug_name: string
  batch_number?: string
  days_until_expiry?: number
  quantity_remaining?: number
  actionable: boolean
}

export function AlertsWidget({ alerts, actionable }: { alerts: AlertViewData[], actionable: boolean }) {
  const lowStockAlerts = alerts.filter(a => a.type === 'low_stock')
  const expiryAlerts = alerts.filter(a => a.type === 'expiry')

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Alerts & Notifications
          </CardTitle>
          <CardDescription>No active inventory alerts.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {lowStockAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-red-600 dark:text-red-400 text-lg">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </span>
              <Badge variant="destructive" className="rounded-full">{lowStockAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                <div>
                  <p className="font-medium">{alert.drug_name}</p>
                  <p className="text-sm text-muted-foreground">Available: {alert.quantity_remaining}</p>
                </div>
                {actionable && (
                  <Link href="/admin/drugs">
                    <Button variant="outline" size="sm">
                      Restock
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {expiryAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-orange-600 dark:text-orange-400 text-lg">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Expiry Warnings
              </span>
              <Badge className="bg-orange-500 hover:bg-orange-600 rounded-full">{expiryAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiryAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <div>
                  <p className="font-medium">{alert.drug_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Batch: {alert.batch_number || 'N/A'} • Expiring in {alert.days_until_expiry} days
                  </p>
                </div>
                {actionable && (
                  <Link href="/admin/drugs">
                    <Button variant="outline" size="sm" className="text-orange-600">
                      Manage
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
