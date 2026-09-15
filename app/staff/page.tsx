import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Receipt, Clock, Pill, ArrowUpRight } from 'lucide-react'
import { getStaffDashboardMetrics } from '@/app/actions/dashboard'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function StaffDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  
  // Hardcode a mock staff-1 id if no session found for testing during development
  const staffId = session?.user?.id || 'staff-1'
  const metrics = await getStaffDashboardMetrics(staffId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Staff Dashboard</h2>
          <p className="text-muted-foreground mt-1">Ready for your shift? Here's what's happening.</p>
        </div>
      </div>

      {/* Primary Action */}
      <Link href="/staff/pos" className="block w-full">
        <Button className="w-full h-20 text-xl font-bold shadow-md rounded-[24px] gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.01]">
          <Plus className="w-6 h-6" /> New Prescription / Sale
        </Button>
      </Link>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Your Revenue Today
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">₦{metrics.myRevenueToday.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Pill className="w-4 h-4" /> Sales Completed Today
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{metrics.myTransactionCountToday.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Shift Hours
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">4.5h</p>
            <div className="flex items-center mt-4 text-sm font-medium text-muted-foreground bg-muted w-fit px-3 py-1 rounded-full">
              Started at 8:00 AM
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
