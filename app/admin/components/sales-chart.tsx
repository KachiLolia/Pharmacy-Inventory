'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { name: "Mon", total: 12000 },
  { name: "Tue", total: 21500 },
  { name: "Wed", total: 18900 },
  { name: "Thu", total: 32000 },
  { name: "Fri", total: 39500 },
  { name: "Sat", total: 28000 },
  { name: "Sun", total: 14200 },
]

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#064e3b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#064e3b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="name" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `₦${value}`} 
        />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
          formatter={(value: any) => [`₦${value}`, 'Revenue']}
        />
        <Area 
          type="monotone" 
          dataKey="total" 
          stroke="#064e3b" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorTotal)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
