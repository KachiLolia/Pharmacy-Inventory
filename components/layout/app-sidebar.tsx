'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Pill, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  ShoppingCart,
  Receipt,
  RefreshCcw,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { logout } from '@/app/login/actions'

interface AppSidebarProps {
  role: 'admin' | 'staff'
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/pos', icon: ShoppingCart, label: 'POS / Prescriptions' },
    { href: '/admin/sales', icon: Receipt, label: 'Sales Records' },
    { href: '/admin/refunds', icon: RefreshCcw, label: 'Refunds' },
    { href: '/admin/drugs', icon: Pill, label: 'Drug Catalog' },
    { href: '/admin/staff', icon: Users, label: 'Staff Management' },
    { href: '/admin/reports', icon: BarChart3, label: 'Reports & Recon' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  const staffLinks = [
    { href: '/staff', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/staff/pos', icon: ShoppingCart, label: 'POS / Prescriptions' },
    { href: '/staff/sales', icon: Receipt, label: 'Sales Records' },
    { href: '/staff/drugs', icon: PackageSearch, label: 'Drug Catalog' },
  ]

  const links = role === 'admin' ? adminLinks : staffLinks

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = !mobile && isCollapsed;
    
    return (
    <div className="flex h-full flex-col bg-primary text-primary-foreground transition-all duration-300">
      <div className={cn("flex h-16 items-center border-b border-primary-foreground/10 px-4", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <Pill className="h-5 w-5" />
          </div>
          {!collapsed && <span>Pharmly</span>}
        </div>
        {!collapsed && !mobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white hidden md:flex"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            
            const linkContent = (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (mobile) setSheetOpen(false)
                }}
                className={cn(
                  "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-accent text-accent-foreground shadow-sm" 
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white",
                  collapsed ? "justify-center" : ""
                )}
              >
                <link.icon className={cn("shrink-0", collapsed ? "h-6 w-6" : "mr-3 h-5 w-5", isActive ? "text-accent-foreground" : "text-primary-foreground/70 group-hover:text-white")} />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger render={linkContent} />
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              )
            }
            
            return linkContent
          })}
        </nav>
      </div>

      <div className="border-t border-primary-foreground/10 p-3">
        {collapsed && !mobile && (
           <Button 
            variant="ghost" 
            size="icon" 
            className="w-full justify-center text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white hidden md:flex mb-2"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <form action={logout}>
           <Button 
            type="submit"
            variant="ghost" 
            className={cn("w-full text-primary-foreground/70 hover:bg-destructive hover:text-destructive-foreground", collapsed ? "justify-center px-0" : "justify-start")}
          >
            <LogOut className={cn(collapsed ? "h-5 w-5 m-0" : "mr-3 h-5 w-5")} />
            {!collapsed && <span>Log out</span>}
          </Button>
        </form>
      </div>
    </div>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:block h-screen shrink-0 transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
        <NavContent />
      </aside>

      {/* Mobile Header & Sidebar Trigger */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <span>Pharmly</span>
        </div>
        
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger 
            render={
              <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-white hover:bg-primary-foreground/10" />
            }
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-none">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <NavContent mobile={true} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
