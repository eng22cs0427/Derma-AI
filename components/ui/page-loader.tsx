"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Activity } from "lucide-react"

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm transition-opacity duration-300">
      {/* Spinning DermaAI logo */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <div className="absolute h-20 w-20 rounded-full border-4 border-primary/20" />
        {/* Spinning arc */}
        <div className="absolute h-20 w-20 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        {/* Icon in centre */}
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold tracking-widest text-primary/80 animate-pulse">
        DERMA AI
      </p>
    </div>
  )
}
