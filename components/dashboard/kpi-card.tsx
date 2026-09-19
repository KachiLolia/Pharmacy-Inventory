import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  subtitle?: string
  href?: string
  isAlert?: boolean
  alertVariant?: 'destructive' | 'warning'
}

export function KPICard({ title, value, icon, trend, trendUp = true, subtitle, href, isAlert = false, alertVariant = 'destructive' }: KPICardProps) {
  const variant = isAlert ? alertVariant : 'default'
  
  const bgClasses = {
    default: 'bg-white',
    destructive: 'border-red-100 bg-red-50/30',
    warning: 'border-amber-100 bg-amber-50/30'
  }
  
  const iconClasses = {
    default: 'bg-primary/10 text-primary',
    destructive: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600'
  }
  
  const textClasses = {
    default: 'text-primary',
    destructive: 'text-red-600',
    warning: 'text-amber-600'
  }

  const content = (
    <Card className={`border shadow-sm rounded-[24px] relative overflow-hidden h-full flex flex-col ${bgClasses[variant]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${iconClasses[variant]}`}>
            {icon}
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {href && (
            <div className="ml-auto">
              <ChevronRight className={`w-4 h-4 ${isAlert ? textClasses[variant] : 'text-muted-foreground'}`} />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-end relative">
        <p className="text-3xl font-bold mt-2">{value}</p>
        
        {trend && (
          <div className="flex items-center mt-3 text-sm font-medium">
            <span className={`flex items-center ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendUp && <ArrowUpRight className="w-4 h-4 mr-1" />}
              {trend}
            </span>
            <span className="text-muted-foreground ml-2">vs. yesterday</span>
          </div>
        )}
        
        {subtitle && (
          <div className="mt-3 text-sm text-muted-foreground">
            {subtitle}
          </div>
        )}

        {href && (
          <div className={`mt-3 text-sm font-medium ${isAlert ? textClasses[variant] : 'text-primary'}`}>
            View in Drug Catalog &rarr;
          </div>
        )}
        
        {/* Decorative Sparkline (Static mockup for visual) */}
        {!isAlert && (
          <div className="absolute bottom-4 right-4 opacity-30 pointer-events-none">
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 18L15 8L25 12L45 2L59 10" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full transition-transform hover:scale-[1.02]">
        {content}
      </Link>
    )
  }

  return content
}
