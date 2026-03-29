import Link from "next/link"
import Image from "next/image"
import { auth } from "@clerk/nextjs/server"
import { ArrowRight, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SlidingText } from "@/components/home/sliding-text"

export default async function Home() {
  const { userId } = await auth()

  // If already logged in, redirect them to dashboard (or let them click the button)
  const destPath = userId ? "/dashboard" : "/login"
  const buttonText = userId ? "Go to Dashboard" : "Get Started"

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      
      {/* ── Left Side: Animated Image Section ───────────────────────────────────── */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-end overflow-hidden bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-dermatology-ai.png"
            alt="AI Dermatology Interface"
            fill
            className="object-cover object-center animate-in fade-in duration-1000 zoom-in-105"
            priority
          />
          {/* A gradient overlay to make things blend smoothly */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
        </div>
        
        {/* Subtle branding or quote on the image */}
        <div className="relative z-10 p-12 text-white/90">
          <p className="text-xl font-medium tracking-wide">
            "Revolutionizing skin health with precision AI and expert care."
          </p>
        </div>
      </div>

      {/* ── Right Side: Content & Action ────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        {/* Header with Theme Toggle */}
        <header className="flex h-20 items-center justify-end px-6 sm:px-10">
          <ThemeToggle />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 pb-20">
          <div className="w-full max-w-lg mx-auto lg:mx-0 space-y-8">
            
            {/* Logo Group */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20">
                <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  DermaAI
                </h1>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-widest">
                  Clinical Intelligence
                </p>
              </div>
            </div>

            {/* Sliding Animated Text */}
            <div className="h-24 sm:h-28 flex flex-col justify-center">
              <SlidingText />
            </div>

            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
              Secure, instant access to AI condition detection, top-tier dermatologists, and your personalized health records—all in one place.
            </p>

            {/* Action CTA */}
            <div className="pt-4">
              <Link href={destPath} className="inline-block w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  {buttonText}
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <p className="mt-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                Protected by Clinical Grade Security
              </p>
            </div>

          </div>
        </main>
      </div>

    </div>
  )
}
