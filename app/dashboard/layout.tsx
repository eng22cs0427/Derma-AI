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
  let userRole = 'patient'

  try {
    // Race the DB call against a 6-second timeout (DB timeout is 5s, plus buffer)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB profile sync timed out after 6s")), 6000)
    )
    const dbProfile = await Promise.race([
      ensureUserProfileExists(user.id, primaryEmail, fullName),
      timeout,
    ])
    isOnboarded = Boolean(dbProfile.isOnboarded)
    userRole = dbProfile.role || 'patient'
  } catch (error) {
    const msg = (error as Error)?.message ?? ""
    const code = (error as any)?.code ?? ""
    const isTimeout =
      code === 'ETIMEDOUT' ||
      msg.toLowerCase().includes('etimedout') ||
      msg.includes("timed out") ||
      msg.includes("timeout") ||
      msg.includes("Connection terminated")
    if (isTimeout) {
      console.warn("[Dashboard Layout] RDS timeout — treating user as onboarded for graceful degradation:", msg || code)
      isOnboarded = true
      // On timeout we can't determine role — default to patient (safe fallback)
      userRole = 'patient'
    } else {
      console.error("[Dashboard Layout] Profile sync error:", error)
    }
  }

  // ── Role-based routing ─────────────────────────────────────────────────────
  // If the admin has promoted this user to doctor, send them to their dashboard.
  // This handles the case where a patient account is later promoted to doctor.
  if (userRole === 'doctor') {
    redirect("/doctor-dashboard")
  }

  // ── Onboarding gate ────────────────────────────────────────────────────────
  if (!isOnboarded) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isAdmin={primaryEmail === "sabareeshsp7@gmail.com"} />
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
