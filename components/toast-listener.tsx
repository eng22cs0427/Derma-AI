"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

export function ToastListener() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const toastParam = searchParams.get("toast")
    
    if (toastParam === "signed_in") {
      toast.success("Successfully logged in", {
        description: "Welcome back to your dashboard!"
      })
    } else if (toastParam === "signed_out") {
      toast.success("Successfully logged out", {
        description: "You have been securely signed out."
      })
    } else if (toastParam === "signed_up") {
      toast.success("Account created successfully", {
        description: "Welcome to DermaAI!"
      })
    }

    // Remove the toast parameter from the URL cleanly
    if (toastParam) {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("toast")
      
      const newUrl = newSearchParams.toString() 
        ? `${pathname}?${newSearchParams.toString()}` 
        : pathname
        
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, pathname, router])

  return null
}
