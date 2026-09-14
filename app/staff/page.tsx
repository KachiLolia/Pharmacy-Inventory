import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Receipt, Clock, Pill, AlertCircle, ArrowUpRight } from 'lucide-react'

export default function StaffDashboard() {
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
      <Button className="w-full h-20 text-xl font-bold shadow-md rounded-[24px] gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.01]">
        <Plus className="w-6 h-6" /> New Prescription / Sale
      </Button>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Your Sales Today
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">₦45,000</p>
            <div className="flex items-center mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              12 Transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Pill className="w-4 h-4" /> Prescriptions Filled
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">18</p>
            <div className="flex items-center mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +4 from yesterday
            </div>
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
      
      {/* Alert / Tasks */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              Shift Tasks & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-amber-900">Low Stock Warning</p>
                  <p className="text-sm text-amber-700 mt-1">Paracetamol 500mg is running low (12 units left). Please notify the shift manager.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">End of Day Reconciliation</p>
                  <p className="text-sm text-muted-foreground mt-1">Prepare the till for counting at 5:00 PM.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
