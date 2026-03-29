import type React from "react"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  // Find primary email
  const primaryEmail =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress

  // Exactly match the designated super-admin email
  if (primaryEmail !== "sabareeshsp7@gmail.com") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">
            Access Denied
          </h1>
          
          <p className="text-muted-foreground text-sm leading-relaxed mt-2">
            You do not have administrator privileges. The Admin panel is restricted to the <b>System Administrator</b> only.
          </p>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 
        We simply render the children here. 
        Sabareesh will be able to see any page within /admin.
        The UI provides a link back to dashboard/doctor-dashboard if he needs it.
      */}
      {children}
    </div>
  )
}
