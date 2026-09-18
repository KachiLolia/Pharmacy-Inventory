import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export type QuickAction = {
  title: string
  href: string
  icon: React.ReactNode
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="border shadow-sm rounded-[24px] bg-white h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4 h-full">
          {actions.map((action, index) => (
            <Link key={index} href={action.href} className="block h-full">
              <div className="bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl p-4 flex flex-col justify-between h-full group border border-transparent hover:border-primary/20">
                <div className="text-primary">
                  {action.icon}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-medium text-foreground">{action.title}</span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
