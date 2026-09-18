'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useState, useEffect } from 'react'
import { getSalesChartData, SalesChartDataPoint } from '@/app/actions/dashboard'

interface SalesChartProps {
  role: 'Admin' | 'Staff'
  staffId?: string
}

export function SalesChart({ role, staffId }: SalesChartProps) {
  const [range, setRange] = useState<'today' | '7d' | '14d' | '30d' | '90d'>('7d')
  const [data, setData] = useState<SalesChartDataPoint[]>([])

  useEffect(() => {
    let mounted = true
    getSalesChartData(range, role, staffId).then(res => {
      if (mounted) setData(res)
    })
    return () => { mounted = false }
  }, [range, role, staffId])

  return (
    <Card className="border shadow-sm rounded-[24px] h-full bg-white flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">Sales Overview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Revenue over time.</p>
          </div>
          <select 
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="border text-sm font-medium rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer bg-white"
          >
            <option value="today">Today</option>
            <option value="7d">Past 7 Days</option>
            <option value="14d">Past 14 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="90d">Past 90 Days</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `₦${value / 1000}k`} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
              formatter={(value: any) => [`₦${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${label}, ${payload[0].payload.fullDate}`
                }
                return label
              }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#059669" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorTotal)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
