"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

// Paths that the doctor can always access regardless of profile completeness
const ALWAYS_ALLOWED = ["/doctor-dashboard/profile"]

interface Props { children: React.ReactNode }

export function ProfileCompletionGate({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    if (ALWAYS_ALLOWED.some(p => pathname.startsWith(p))) return

    checkedRef.current = true

    fetch("/api/doctor/profile")
      .then(r => r.json())
      .then(data => {
        if (data._dbOffline) return // DB offline — let them through
        if (!data.profileComplete) {
          toast.warning("Complete your profile first", {
            description: "Fill in all mandatory fields (mobile, hospital, meeting link, license) before accessing the dashboard.",
            duration: 7000,
          })
          router.replace("/doctor-dashboard/profile")
        }
      })
      .catch(() => {
        // If API fails, don't block — fail open
        console.warn("[ProfileCompletionGate] Could not check profile completeness")
      })
  }, [pathname, router])

  return <>{children}</>
}
