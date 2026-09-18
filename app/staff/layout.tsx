import { AppSidebar } from '@/components/layout/app-sidebar'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <AppSidebar role="staff" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
