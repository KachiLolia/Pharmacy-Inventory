import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TopSellingDrug } from '@/app/actions/dashboard'

interface TopSellingDrugsProps {
  drugs: TopSellingDrug[]
}

export function TopSellingDrugs({ drugs }: TopSellingDrugsProps) {
  return (
    <Card className="border shadow-sm rounded-[24px] flex flex-col h-full bg-white">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Top Selling Drugs Today</CardTitle>
          <Link href="/admin/sales" className="text-sm font-medium text-primary flex items-center hover:underline">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {drugs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No sales recorded today
          </div>
        ) : (
          <div className="w-full text-sm">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 text-muted-foreground pb-4 border-b">
              <div></div>
              <div>Drug Name</div>
              <div className="text-right">Units Sold</div>
              <div className="text-right min-w-[80px]">Revenue</div>
            </div>
            <div className="space-y-4 pt-4">
              {drugs.map((item, index) => (
                <div key={index} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="font-medium truncate">{item.drug_name}</div>
                  <div className="text-right">{item.quantity}</div>
                  <div className="text-right font-semibold">₦{item.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
