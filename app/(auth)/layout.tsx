import type React from "react"
import { AnimatedAuthSidebar } from "@/components/auth/animated-sidebar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Animated Left Sidebar */}
      <AnimatedAuthSidebar />

      {/* Right Side - Clerk Auth */}
      <div className="flex flex-1 w-full lg:w-1/2 items-center justify-center p-8 bg-zinc-50 border-l dark:bg-zinc-950">
        <div className="w-full max-w-md mx-auto flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
