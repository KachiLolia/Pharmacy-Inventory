import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SalesChart } from './components/sales-chart'
import { ArrowUpRight, TrendingUp, AlertCircle, ShoppingBag, MoreHorizontal, Download, Pill } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
          <p className="text-muted-foreground mt-1">Let's check your pharmacy today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full shadow-sm bg-white">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button className="rounded-full shadow-sm gap-2">
            This Month
          </Button>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Primary Metric - Dark Green */}
        <Card className="bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden rounded-[24px]">
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
             <TrendingUp className="w-32 h-32" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center relative z-10">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Revenue</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-4xl font-bold">₦12,500,000</p>
            <div className="flex items-center mt-4 text-sm font-medium text-primary-foreground/90 bg-primary-foreground/20 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +8.4% Since last week
            </div>
          </CardContent>
        </Card>
        
        {/* Secondary Metric */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> New Orders
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">1,240</p>
            <div className="flex items-center mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +12.5% Since last week
            </div>
          </CardContent>
        </Card>
        
        {/* Tertiary Metric */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="pb-2">
             <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Inventory Alerts
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">24</p>
            <div className="flex items-center mt-4 text-sm font-medium text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full">
              <AlertCircle className="w-4 h-4 mr-1" />
              Items need attention
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <Card className="col-span-1 lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-xl font-bold">Sales Overview</CardTitle>
              <CardDescription>Daily revenue for the current week.</CardDescription>
            </div>
            <select className="bg-muted/50 border-none text-sm font-medium rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] flex flex-col">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              Recent Restocks
              <Button variant="link" className="text-primary pr-0 hover:no-underline hover:text-primary/80">See all</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-6">
              {[
                { name: 'Amoxicillin 500mg', qty: '+500 units', time: '2 hours ago', status: 'Delivered' },
                { name: 'Ibuprofen 400mg', qty: '+200 units', time: '5 hours ago', status: 'Delivered' },
                { name: 'Vitamin C Syrup', qty: '+50 bottles', time: 'Yesterday', status: 'Pending' },
                { name: 'Lisinopril 10mg', qty: '+100 units', time: 'Yesterday', status: 'Delivered' },
                { name: 'Cough Syrup (Adult)', qty: '+20 bottles', time: '2 days ago', status: 'Pending' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${item.status === 'Pending' ? 'bg-amber-100/50 text-amber-600 group-hover:bg-amber-100' : 'bg-primary/5 text-primary group-hover:bg-primary/10'}`}>
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">{item.qty}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 uppercase tracking-wider ${item.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'}`}>{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
