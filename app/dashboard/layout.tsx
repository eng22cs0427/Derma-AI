import type React from "react"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { ensureUserProfileExists } from "@/lib/profile-sync"
import { ProfileProvider } from "@/contexts/ProfileContext"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  // Retrieve basic info from Clerk profile
  const primaryEmail = user.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "no-email@example.com"

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail.split('@')[0]

  let isOnboarded = false
  let isAdmin = false

  try {
    // 1. Ensure user exists inside AWS RDS Postgres database
    const dbProfile = await ensureUserProfileExists(user.id, primaryEmail, fullName)
    isOnboarded = Boolean(dbProfile.isOnboarded)
    isAdmin = dbProfile.role === 'admin'
  } catch (error) {
    console.error("Failed to sync profile to database inside layout:", error)
  }

  // 2. Gatekeeping Onboarding System
  // Next.js redirect must be called outside try/catch blocks!
  if (!isOnboarded) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="lg:pl-64">
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
