'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useState, useEffect, Suspense } from 'react'

function SearchInputInner({ placeholder }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [query, setQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (query === currentQ) return // Prevent infinite loop
      
      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set('q', query)
      } else {
        params.delete('q')
      }
      
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query, pathname, router, searchParams])

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input 
        placeholder={placeholder || "Search..."} 
        className="pl-9 h-11 bg-white shadow-sm rounded-xl"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  )
}

export function SearchInput({ placeholder }: { placeholder?: string }) {
  return (
    <Suspense fallback={<div className="relative w-full sm:max-w-sm"><Input className="h-11 bg-white shadow-sm rounded-xl" disabled /></div>}>
      <SearchInputInner placeholder={placeholder} />
    </Suspense>
  )
}
