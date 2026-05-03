import type React from "react"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { DoctorShell } from "@/components/doctor/doctor-shell"
import { ensureUserProfileExists } from "@/lib/profile-sync"
import { ProfileCompletionGate } from "@/components/doctor/profile-completion-gate"

export default async function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  if (!user) redirect("/login")

  const primaryEmail =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    "no-email@example.com"
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || primaryEmail.split("@")[0]

  let userRole = "patient"

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 6000)
    )
    const dbProfile = await Promise.race([
      ensureUserProfileExists(user.id, primaryEmail, fullName),
      timeout,
    ])
    userRole = dbProfile.role || "patient"
  } catch (error) {
    const msg = (error as Error)?.message ?? ""
    const code = (error as Record<string, unknown>)?.code ?? ""
    const isTimeout =
      code === "ETIMEDOUT" || msg.toLowerCase().includes("etimedout") ||
      msg.includes("timed out") || msg.includes("timeout") || msg.includes("Connection terminated")
    if (isTimeout) {
      console.warn("[Doctor Layout] DB timeout — allowing through, assuming doctor")
      userRole = "doctor"
    } else {
      console.error("[Doctor Layout] Profile sync error:", error)
    }
  }

  if (userRole === "patient") redirect("/dashboard")

  return (
    <DoctorShell isAdmin={userRole === "admin"}>
      {/* Client-side guard: redirects to /profile if mandatory fields are missing */}
      <ProfileCompletionGate>
        {children}
      </ProfileCompletionGate>
    </DoctorShell>
  )
}

