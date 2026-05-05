"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { ProfileProvider } from "@/contexts/ProfileContext"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dbProfile, setDbProfile] = useState<any>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push("/login")
      return
    }

    const primaryEmail = user.emailAddresses?.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "no-email@example.com"

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail.split('@')[0]

    fetch('/api/profile/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.id, email: primaryEmail, fullName }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.profile?.isOnboarded) {
          router.push("/onboarding")
        } else if (data.profile?.role === "doctor") {
          router.push("/doctor-dashboard")
        } else {
          setDbProfile(data.profile)
        }
      })
      .catch(err => console.error("Failed to sync profile:", err))
  }, [user, isLoaded, router])

  if (!isLoaded || !user) return null

  const primaryEmail = user.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "no-email@example.com"

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isAdmin={dbProfile?.role === "admin"} isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <div className={cn("transition-all duration-300", isCollapsed ? "lg:pl-[70px]" : "lg:pl-64")}>
        <DashboardHeader user={{
          id: user.id,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: primaryEmail,
          imageUrl: user.imageUrl ?? null,
        }} />
        <ProfileProvider>
          <main className="container py-6">{children}</main>
        </ProfileProvider>
      </div>
    </div>
  )
}
