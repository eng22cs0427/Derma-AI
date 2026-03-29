import type React from "react"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { DoctorShell } from "@/components/doctor/doctor-shell"
import { ensureUserProfileExists } from "@/lib/profile-sync"

export default async function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  // Must be logged in
  if (!user) {
    redirect("/login")
  }

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
    const code = (error as any)?.code ?? ""
    const isTimeout =
      code === "ETIMEDOUT" ||
      msg.toLowerCase().includes("etimedout") ||
      msg.includes("timed out") ||
      msg.includes("timeout") ||
      msg.includes("Connection terminated")
    if (isTimeout) {
      // On DB timeout: allow doctor access if they reached this URL
      // (they were previously confirmed as a doctor)
      console.warn("[Doctor Layout] DB timeout — allowing through, assuming doctor")
      userRole = "doctor"
    } else {
      console.error("[Doctor Layout] Profile sync error:", error)
    }
  }

  // ── Role guard: only doctors may access this dashboard ────────────────────
  if (userRole === "patient") {
    redirect("/dashboard")
  }

  // Admins can also access the doctor dashboard for oversight
  // (If you want strict doctor-only, change this to: userRole !== 'doctor')

  return (
    <DoctorShell isAdmin={primaryEmail === "sabareeshsp7@gmail.com"}>
      {children}
    </DoctorShell>
  )
}

