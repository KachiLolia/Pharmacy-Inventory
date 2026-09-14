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
  ShoppingCart
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

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/pos', icon: ShoppingCart, label: 'POS / Prescriptions' },
    { href: '/admin/drugs', icon: Pill, label: 'Drug Catalog' },
    { href: '/admin/staff', icon: Users, label: 'Staff Management' },
    { href: '#', icon: Settings, label: 'Settings' },
  ]

  const staffLinks = [
    { href: '/staff', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/staff/pos', icon: ShoppingCart, label: 'POS / Prescriptions' },
    { href: '/staff/drugs', icon: PackageSearch, label: 'Drug Catalog' },
  ]

  const links = role === 'admin' ? adminLinks : staffLinks

  const NavContent = () => (
    <div className="flex h-full flex-col bg-primary text-primary-foreground transition-all duration-300">
      <div className={cn("flex h-16 items-center border-b border-primary-foreground/10 px-4", isCollapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <Pill className="h-5 w-5" />
          </div>
          {!isCollapsed && <span>Pharmly</span>}
        </div>
        {!isCollapsed && (
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
                className={cn(
                  "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-accent text-accent-foreground shadow-sm" 
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white",
                  isCollapsed ? "justify-center" : ""
                )}
              >
                <link.icon className={cn("shrink-0", isCollapsed ? "h-6 w-6" : "mr-3 h-5 w-5", isActive ? "text-accent-foreground" : "text-primary-foreground/70 group-hover:text-white")} />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            )

            if (isCollapsed) {
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
        {isCollapsed && (
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
            className={cn("w-full text-primary-foreground/70 hover:bg-destructive hover:text-destructive-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}
          >
            <LogOut className={cn(isCollapsed ? "h-5 w-5 m-0" : "mr-3 h-5 w-5")} />
            {!isCollapsed && <span>Log out</span>}
          </Button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:block h-screen shrink-0 transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
        <NavContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 p-0 border-none">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
